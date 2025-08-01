// app-backend/src/modules/outfit/outfitRecommender.service.ts

import { PrismaClient, ClosetItem, LayerCategory, Style } from '@prisma/client';
import {
  RecommendOutfitsRequest,
  OutfitRecommendation,
  OutfitItemRecommendation,
  WeatherSummary,
} from './outfit.types';
import { getFeatureVector, predictRatingKnn } from './itemItemKnn';
import tinycolor from 'tinycolor2';

const prisma = new PrismaClient();

// —–––– helper: pairwise hue-distance
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

function stripWhite(hexes: string[]): string[] {
  return hexes.filter(h => {
    const { l, s } = tinycolor(h).toHsl();
    return !(l > 0.95 && s < 0.1);
  });
}

/**
 * Score an outfit by blending:
 *  • color harmony
 *  • user preference matches
 *  • warmth alignment
 *  • rain bonus
 */
function scoreOutfit(
  outfit: ClosetItem[],
  userPreferredColors: string[] = [],
  weather: { avgTemp: number; minTemp: number; willRain: boolean }
): number {
  // 1) collect all hexes from dominantColors or fallback colorHex
  const rawHexes = outfit.flatMap(item =>
    Array.isArray(item.dominantColors) && item.dominantColors.length > 0
      ? (item.dominantColors as string[])
      : [item.colorHex ?? '#000000']
  );
  const hexes = stripWhite(rawHexes);
  // 2) color harmony
  const harmony = computeColorHarmony(hexes);
  // 3) preference matches
  const prefHits = hexes.filter(h => userPreferredColors.includes(h)).length;
  // 4) warmth alignment: high when totalWarmth ≈ avgTemp
  const totalWarmth = outfit.reduce((sum, i) => sum + (i.warmthFactor || 0), 0);
  const avgT = (weather.avgTemp + weather.minTemp) / 2;
  const warmthScore = 1 / (1 + Math.abs(totalWarmth - avgT));
  // 5) rain bonus
  const rainBonus = weather.willRain && outfit.some(i => i.waterproof) ? 1 : 0;

  // weights
  const W_COLOR = 1, W_PREF = 2, W_WARMTH = 1, W_RAIN = 1;

  // const repeatPenaltyPerItem = 0.5;
  // const servedSet = new Set(lastServedIds);
  // const repeatCount = outfit.filter(i => servedSet.has(i.id)).length;
  // return baseScore - repeatCount * repeatPenaltyPerItem;

  return (
    W_COLOR * harmony +
    W_PREF * prefHits +
    W_WARMTH * warmthScore +
    W_RAIN * rainBonus
  );


}

/**
 * Rebuilds an OutfitRecommendation from a Prisma Outfit record `p`
 */
function buildFakeRec(p: {
  outfitItems: Array<{
    closetItemId: string;
    layerCategory: LayerCategory;
    closetItem: ClosetItem;
  }>;
  overallStyle: Style;
  userRating: number | null;
  warmthRating: number;
  waterproof: boolean;
  weatherSummary: string | null;
}): OutfitRecommendation {
  const weather: WeatherSummary = p.weatherSummary
    ? JSON.parse(p.weatherSummary)
    : { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: '' };

  const items: OutfitItemRecommendation[] = p.outfitItems.map(oi => ({
    closetItemId: oi.closetItemId,
    imageUrl: `/uploads/${oi.closetItem.filename}`,
    layerCategory: oi.layerCategory,
    category: oi.closetItem.category,
    style: oi.closetItem.style ?? Style.Casual,
    dominantColors:
      Array.isArray(oi.closetItem.dominantColors) && oi.closetItem.dominantColors.length > 0
        ? (oi.closetItem.dominantColors as string[])
        : [oi.closetItem.colorHex ?? '#000000'],
    warmthFactor: oi.closetItem.warmthFactor ?? 5,
    waterproof: oi.closetItem.waterproof ?? false,
  }));

  return {
    outfitItems: items,
    overallStyle: p.overallStyle,
    score: p.userRating ?? 0,
    warmthRating: p.warmthRating,
    waterproof: p.waterproof,
    weatherSummary: weather,
  };
}

type PartitionedCloset = { [layer: string]: ClosetItem[]; };
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

function getCandidateOutfits(
  partitioned: PartitionedCloset,
  requiredLayers: string[],
  style: Style
): ClosetItem[][] {
  const choices = requiredLayers.map(layer =>
    (partitioned[layer] || []).filter(item => item.style === style)
  );
  if (choices.some(arr => arr.length === 0)) return [];

  function* combine(i = 0, current: ClosetItem[] = []): Generator<ClosetItem[]> {
    if (i === choices.length) {
      yield current; return;
    }
    for (const itm of choices[i]) {
      if (current.some(c => c.id === itm.id)) continue;
      yield* combine(i + 1, current.concat(itm));
    }
  }

  return Array.from(combine());
}

export async function recommendOutfits(
  userId: string,
  req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {
  const closetItems = await prisma.closetItem.findMany({ where: { ownerId: userId } });
  const userPref = await prisma.userPreference.findUnique({ where: { userId } });
  const style: Style = (req.style as Style) || userPref?.style || Style.Casual;

  const partitioned = partitionClosetByLayer(closetItems);
  const requiredLayers = getRequiredLayers(req.weatherSummary);
  const raw = getCandidateOutfits(partitioned, requiredLayers, style);
  const prefColors = Array.isArray(userPref?.preferredColours)
    ? (userPref.preferredColours as string[])
    : [];

  // rule-based scoring
  const scored = raw.map(outfit => {
    const items = outfit.map(item => ({
      closetItemId: item.id,
      imageUrl: `/uploads/${item.filename}`,
      layerCategory: item.layerCategory,
      category: item.category,
      style: item.style ?? 'Casual',
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
      score: scoreOutfit(outfit, prefColors, {
        ...(req.weatherSummary as any),
        willRain: (req.weatherSummary as any).willRain,
      }),
      warmthRating: outfit.reduce((s, i) => s + (i.warmthFactor || 0), 0),
      waterproof: outfit.some(i => i.waterproof),
      weatherSummary: req.weatherSummary,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // K-NN personalization
  const past = await prisma.outfit.findMany({
    where: { userId, userRating: { not: null } },
    include: { outfitItems: { include: { closetItem: true } } },
  });
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
    // 30% rule based, 70% KNN
    const alpha = 0.3;
    return { ...rec, finalScore: alpha * rec.score + (1 - alpha) * knn };
  });

  augmented.sort((a, b) => b.finalScore - a.finalScore);

  // windowed diversity on top-20
  const WINDOW = 20;
  // const pool = augmented.slice(0, WINDOW);
  const pool = augmented;
  const diversified: Array<OutfitRecommendation & { finalScore: number }> = [];
  const used = { bottoms: new Set(), tops: new Set(), shoes: new Set() };

  for (const rec of pool) {
    const bottom = rec.outfitItems.find(i => i.layerCategory === LayerCategory.base_bottom)
      ?.closetItemId;
    const topItem = rec.outfitItems.find(i => i.layerCategory === LayerCategory.base_top)
      ?.closetItemId;
    const shoe = rec.outfitItems.find(i => i.layerCategory === LayerCategory.footwear)
      ?.closetItemId;

    if (
      bottom && topItem && shoe &&
      !used.bottoms.has(bottom) &&
      !used.tops.has(topItem) &&
      !used.shoes.has(shoe)
    ) {
      diversified.push(rec);
      used.bottoms.add(bottom);
      used.tops.add(topItem);
      used.shoes.add(shoe);
    }
    if (diversified.length >= 5) break;
  }

  if (diversified.length < 5) {
    for (const rec of pool) {
      if (!diversified.includes(rec)) {
        diversified.push(rec);
        if (diversified.length >= 5) break;
      }
    }
  }

  return diversified.slice(0, 5).map(({ finalScore, ...rest }) => rest);
}

export {
  partitionClosetByLayer,
  getRequiredLayers,
  getCandidateOutfits,
  scoreOutfit,
};
