import { PrismaClient, ClosetItem, LayerCategory, Style } from '@prisma/client';
import {
  RecommendOutfitsRequest,
  OutfitRecommendation,
  OutfitItemRecommendation,
  WeatherSummary,
} from './outfit.types';
import { getFeatureVector, predictRatingKnn, cosineSimilarity } from './itemItemKnn';
import tinycolor from 'tinycolor2';
import { cdnUrlFor } from '../../utils/s3';

const prisma = new PrismaClient();

// Helper: Shuffle an array for randomization
function shuffleArray<T>(array: T[]): T[] {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Helper: Simple k-means clustering
function kMeansCluster(outfits: (OutfitRecommendation & { finalScore: number })[], k: number): number[][] {
  const vectors = outfits.map(outfit => getFeatureVector(outfit));
  const centroids: number[][] = vectors.slice(0, k);
  const maxIterations = 10;
  const clusters: number[][] = Array(k).fill(0).map(() => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    for (let j = 0; j < k; j++) clusters[j] = [];
    for (let i = 0; i < vectors.length; i++) {
      let minDist = Infinity;
      let clusterIdx = 0;
      for (let j = 0; j < k; j++) {
        const dist = vectors[i].reduce((sum, v, idx) => sum + (v - centroids[j][idx]) ** 2, 0);
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = j;
        }
      }
      clusters[clusterIdx].push(i);
    }
    for (let j = 0; j < k; j++) {
      if (clusters[j].length === 0) continue;
      const newCentroid = vectors[0].map((_, idx) =>
        clusters[j].reduce((sum, i) => sum + vectors[i][idx], 0) / clusters[j].length
      );
      centroids[j] = newCentroid;
    }
  }
  return clusters;
}

// Helper: Compute pairwise hue-distance for color harmony
function computeColorHarmony(hexes: string[]): number {
  if (hexes.length < 2) return 0;
  let total = 0, count = 0;
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const h1 = tinycolor(hexes[i]).toHsl().h;
      const h2 = tinycolor(hexes[j]).toHsl().h;
      total += Math.abs(h1 - h2);
      count++;
    }
  }
  return total / count;
}

// Score an outfit based on harmony, preferences, warmth, and weather conditions
function scoreOutfit(
  outfit: ClosetItem[],
  userPreferredColors: string[] = [],
  weather: { avgTemp: number; minTemp: number; willRain: boolean }
): number {
  const hexes = outfit.flatMap(item =>
    Array.isArray(item.dominantColors) && item.dominantColors.length > 0
      ? (item.dominantColors as string[])
      : [item.colorHex ?? '#000000']
  );
  const harmony = computeColorHarmony(hexes);
  const prefHits = hexes.filter(h => userPreferredColors.includes(h)).length;
  const whitePenalty = hexes.some(h => {
    const { l, s } = tinycolor(h).toHsl();
    return l > 0.95 && s < 0.1;
  }) ? -2 : 0;
  const totalWarmth = outfit.reduce((sum, i) => sum + (i.warmthFactor || 0), 0);
  const requiredWarmth = Math.max(3, 30 - weather.minTemp);
  const warmthDiff = totalWarmth - requiredWarmth;
  const warmthScore = Math.exp(-(warmthDiff * warmthDiff) / 200);
  const rainBonus = weather.willRain && outfit.some(i => i.waterproof) ? 1 : 0;
  const W_WARMTH = weather.minTemp < 10 ? 3 : 1;
  return (1 * harmony + 2 * prefHits + W_WARMTH * warmthScore + 1 * rainBonus + whitePenalty);
}

type PartitionedCloset = { [layer: string]: ClosetItem[] };

function partitionClosetByLayer(closetItems: ClosetItem[]): PartitionedCloset {
  return closetItems.reduce((part, item) => {
    (part[item.layerCategory] ||= []).push(item);
    return part;
  }, {} as PartitionedCloset);
}

function getRequiredLayers(weather: { avgTemp: number; minTemp: number }): string[] {
  const required = ['base_top', 'base_bottom', 'footwear'];
  if (weather.avgTemp < 18 || weather.minTemp < 13) required.push('mid_top');
  if (weather.avgTemp < 12 || weather.minTemp < 10) required.push('outerwear');
  return required;
}

// Define minimum warmth requirements per layer based on temperature
function getMinWarmthForLayer(layer: string, minTemp: number): number {
  if (minTemp < 10) {
    switch (layer) {
      case 'base_bottom': return 5;
      case 'base_top': return 4;
      case 'footwear': return 5;
      case 'mid_top': return 6;
      case 'outerwear': return 7;
      default: return 1;
    }
  } else if (minTemp < 20) {
    switch (layer) {
      case 'base_bottom': return 3;
      case 'base_top': return 2;
      case 'footwear': return 3;
      case 'mid_top': return 4;
      case 'outerwear': return 5;
      default: return 1;
    }
  } else {
    return 1; // No strict minimum for warm weather
  }
}

function getCandidateOutfits(
  partitioned: PartitionedCloset,
  requiredLayers: string[],
  style: Style,
  weather: { minTemp: number }
): ClosetItem[][] {
  // console.log('Debug: Required Layers:', requiredLayers);
  // Limit items per layer to 5 for performance
  const choices = requiredLayers.map(layer => {
    const minWarmth = getMinWarmthForLayer(layer, weather.minTemp);
    // console.log(`Debug: Min warmth for ${layer}: ${minWarmth}`);
    const layerItems = (partitioned[layer] || []).filter(item =>
      item.style === style && (item.warmthFactor || 0) >= minWarmth
    );
    return layerItems.length > 5 ? shuffleArray(layerItems).slice(0, 5) : layerItems;
  });
  // console.log('Debug: Choices per layer:', choices.map(arr => arr.length));
  if (choices.some(arr => arr.length === 0)) {
    // console.log('Debug: Empty layer detected, no candidates possible');
    return [];
  }

  function* combine(i = 0, current: ClosetItem[] = []): Generator<ClosetItem[]> {
    if (i === choices.length) {
      yield current;
      return;
    }
    for (const itm of choices[i]) {
      if (current.some(c => c.id === itm.id)) continue;
      yield* combine(i + 1, current.concat(itm));
    }
  }

  const minRequiredWarmth = Math.max(3, 30 - weather.minTemp);
  // console.log('Debug: minRequiredWarmth:', minRequiredWarmth);
  const candidates = Array.from(combine()).filter(outfit =>
    outfit.reduce((sum, i) => sum + (i.warmthFactor || 0), 0) >= minRequiredWarmth
  );
  // console.log('Debug: Candidate outfits after warmth filter:', candidates.length);
  return candidates.length > 100 ? shuffleArray(candidates).slice(0, 100) : candidates; // Cap at 100
}

export async function recommendOutfits(
  userId: string,
  req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {
  // console.log('Debug: Starting recommendOutfits for user:', userId);
  // console.log('Debug: WeatherSummary:', req.weatherSummary);
  // console.log('Debug: Requested style:', req.style);

  const closetItems = await prisma.closetItem.findMany({ where: { ownerId: userId } });
  // console.log('Debug: Closet items retrieved:', closetItems.length);
  // console.log('Debug: Items with style defined:', closetItems.filter(item => item.style).length);
  // console.log('Debug: Items with warmthFactor defined:', closetItems.filter(item => item.warmthFactor).length);

  const userPref = await prisma.userPreference.findUnique({ where: { userId } });
  const style: Style = (req.style as Style) || userPref?.style || Style.Casual;
  // console.log('Debug: Selected style:', style);

  const partitioned = partitionClosetByLayer(closetItems);
  // console.log('Debug: Partitioned closet:', Object.keys(partitioned).map(layer => ({
  //   layer,
  //   count: partitioned[layer].length,
  //   styles: [...new Set(partitioned[layer].map(item => item.style))],
  // })));

  const requiredLayers = getRequiredLayers(req.weatherSummary);
  const raw = getCandidateOutfits(partitioned, requiredLayers, style, req.weatherSummary);
  // console.log('Debug: Raw candidate outfits:', raw.length);

  const prefColors = Array.isArray(userPref?.preferredColours)
    ? (userPref.preferredColours as string[])
    : [];
  // console.log('Debug: Preferred colors:', prefColors);

  const scored = raw.map(outfit => {
    const items = outfit.map(item => ({
      closetItemId: item.id,
      // imageUrl: `/uploads/${item.filename}`,
      imageUrl: cdnUrlFor(item.filename),
      layerCategory: item.layerCategory,
      category: item.category,
      // ! Potential Problem 
      // style: item.style ?? 'Casual',
      style: item.style ?? Style.Casual,
      dominantColors:
        Array.isArray(item.dominantColors) && item.dominantColors.length > 0
          ? (item.dominantColors as string[])
          : [item.colorHex ?? '#000000'],
      warmthFactor: item.warmthFactor ?? 5,
      waterproof: item.waterproof ?? false,
    }));

    return {
      outfitItems: items,
      overallStyle: style,
      score: scoreOutfit(outfit, prefColors, req.weatherSummary),
      warmthRating: outfit.reduce((s, i) => s + (i.warmthFactor || 0), 0),
      waterproof: outfit.some(i => i.waterproof),
      weatherSummary: req.weatherSummary,
    };
  });
  // console.log('Debug: Scored outfits:', scored.length);

  const past = await prisma.outfit.findMany({
    where: { userId, userRating: { not: null } },
    include: { outfitItems: { include: { closetItem: true } } },
  });
  // console.log('Debug: Past rated outfits:', past.length);

  const historyVecs: number[][] = [];
  const historyRatings: number[] = [];

  for (const p of past) {
    const fake = buildFakeRec(p);
    historyVecs.push(getFeatureVector(fake));
    historyRatings.push(p.userRating!);
  }

  const augmented = scored.map(rec => {
    if (!historyRatings.length) return { ...rec, finalScore: rec.score };
    const knn = predictRatingKnn(
      getFeatureVector(rec),
      historyVecs,
      historyRatings,
      5
    );
    const alpha = 0.3;
    return { ...rec, finalScore: alpha * rec.score + (1 - alpha) * knn };
  });
  // console.log('Debug: Augmented outfits:', augmented.length);

  const k = Math.min(10, augmented.length);
  const clusters = kMeansCluster(augmented, k);
  // console.log('Debug: Clusters formed:', clusters.map(c => c.length));
  const selected: OutfitRecommendation[] = [];

  for (const cluster of clusters) {
    if (cluster.length === 0) continue;
    const clusterOutfits = cluster.map(idx => augmented[idx]);
    const bestInCluster = clusterOutfits.reduce((best, curr) =>
      curr.finalScore > best.finalScore ? curr : best
    );
    selected.push(bestInCluster);
    if (selected.length >= 5) break;
  }
  // console.log('Debug: Selected outfits:', selected.length);

  return selected;
}

function buildFakeRec(outfit: any): OutfitRecommendation {
  return {
    outfitItems: outfit.outfitItems.map((oi: any) => ({
      closetItemId: oi.closetItemId,
      // imageUrl: `/uploads/${oi.closetItem.filename}`,
      imageUrl: cdnUrlFor(oi.closetItem.filename),
      layerCategory: oi.closetItem.layerCategory,
      category: oi.closetItem.category,
      // ! Potential Problem
      // style: oi.closetItem.style ?? 'Casual',
      style: oi.closetItem.style ?? Style.Casual,
      dominantColors:
        Array.isArray(oi.closetItem.dominantColors) && oi.closetItem.dominantColors.length > 0
          ? (oi.closetItem.dominantColors as string[])
          : [oi.closetItem.colorHex ?? '#000000'],
      warmthFactor: oi.closetItem.warmthFactor ?? 5,
      waterproof: oi.closetItem.waterproof ?? false,
    })),
    overallStyle: outfit.overallStyle,
    score: outfit.userRating ?? 0,
    warmthRating: outfit.warmthRating,
    waterproof: outfit.waterproof,
    weatherSummary: JSON.parse(outfit.weatherSummary || '{}'),
  };
}

export {
  partitionClosetByLayer,
  getRequiredLayers,
  getCandidateOutfits,
  scoreOutfit,
};