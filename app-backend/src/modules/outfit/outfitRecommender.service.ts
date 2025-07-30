// app-backend/src/modules/outfit/outfitRecommender.service.ts

/*

Still very MVP, improvements TODO:
- Warmth scoring: Is the total outfit warmth suitable for min/avg temp? (can use a basic range mapping.)
- Waterproof scoring: If willRain, reward/require at least one waterproof layer (e.g. shoes or outerwear).
- Optional layers: e.g. add headwear if sunny/cold and user owns it.
- Variety: Avoid recommending duplicate outfits or same items in every combo.
- Performance: For very large closets, you might want to limit the number of combinations (random sample, etc.).
*/

/*

Still very MVP, improvements TODO:
- Variety: filter out repeated bottoms, etc.
- Performance: sample & limit combinations on large closets.
*/

import { PrismaClient, ClosetItem, LayerCategory, Style } from '@prisma/client';
import { 
  RecommendOutfitsRequest, 
  OutfitRecommendation, 
  OutfitItemRecommendation, 
  WeatherSummary  } from './outfit.types';
import {
  getFeatureVector,
  predictRatingKnn,
} from './itemItemKnn';

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
  const hexes = outfit.flatMap(item =>
    Array.isArray(item.dominantColors) && item.dominantColors.length > 0
      ? (item.dominantColors as string[])
      : [item.colorHex ?? "#000000"]
  );

  // 2) color harmony (lower hue-distance is better)
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
  const W_COLOR = 1;
  const W_PREF = 2;
  const W_WARMTH = 1;
  const W_RAIN = 1;

  return (
    W_COLOR * harmony +
    W_PREF * prefHits +
    W_WARMTH * warmthScore +
    W_RAIN * rainBonus
  );
}

export async function recommendOutfits(
  userId: string,
  req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {
  const closetItems = await prisma.closetItem.findMany({
    where: { ownerId: userId },
  });
  const userPref = await prisma.userPreference.findUnique({
    where: { userId }
  });

  const partitioned = partitionClosetByLayer(closetItems);
  const requiredLayers = getRequiredLayers(req.weatherSummary);
  const style: Style = (req.style as Style) || userPref?.style || Style.Casual;
  const rawCandidates = getCandidateOutfits(partitioned, requiredLayers, style);

  const preferredColors: string[] = Array.isArray(userPref?.preferredColours)
    ? (userPref.preferredColours as string[])
    : [];

  // —–– build rule-based score with warmth & preference baked in
  const scored = rawCandidates.map(outfit => {
    const items = outfit.map(item => ({
      closetItemId: item.id,
      imageUrl: `/uploads/${item.filename}`,
      layerCategory: item.layerCategory,
      category: item.category,
      style: item.style ?? "Casual",
      dominantColors: Array.isArray(item.dominantColors) && item.dominantColors.length > 0
        ? (item.dominantColors as string[])
        : [item.colorHex ?? "#000000"],
      warmthFactor: item.warmthFactor ?? 5,
      waterproof: item.waterproof ?? false,
    }));

    const warmthRating = outfit.reduce((sum, i) => sum + (i.warmthFactor || 0), 0);
    const waterproof = outfit.some(i => i.waterproof);

    return {
      outfitItems: items,
      overallStyle: style,
      score: scoreOutfit(outfit, preferredColors, {
        ...req.weatherSummary,
        willRain: (req.weatherSummary as any).willRain, // ensure boolean
      }),
      warmthRating,
      waterproof,
      weatherSummary: req.weatherSummary,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // —–– personalization via K-NN (unchanged)
  const past = await prisma.outfit.findMany({
    where: { userId, userRating: { not: null } },
    include: { outfitItems: { include: { closetItem: true } } }
  });

  const historyVecs: number[][] = [];
  const historyRatings: number[] = [];

  for (const p of past) {
    const fakeRec = buildFakeRec(p);
    historyVecs.push(getFeatureVector(fakeRec));
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
    const alpha = 0.5;
    return { ...rec, finalScore: alpha * rec.score + (1 - alpha) * knn };
  });

  augmented.sort((a, b) => b.finalScore - a.finalScore);
  return augmented.slice(0, 5).map(({ finalScore, ...rest }) => rest);
}

/**
 * Rebuilds an OutfitRecommendation from a Prisma Outfit record `p`
 */
function buildFakeRec(p: {
  outfitItems: Array<{
    closetItemId: string;
    layerCategory: string;
    closetItem: ClosetItem;
  }>;
  overallStyle: Style;
  userRating: number | null;         // nullable in Prisma
  warmthRating: number;
  waterproof: boolean;
  weatherSummary: string | null;
}): OutfitRecommendation {
  // 1) parse weatherSummary or fallback to a zeroed WeatherSummary
  const weather: WeatherSummary = p.weatherSummary
    ? JSON.parse(p.weatherSummary)
    : { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: '' };

  // 2) map each OutfitItem -> OutfitItemRecommendation
  const items: OutfitItemRecommendation[] = p.outfitItems.map(oi => ({
    closetItemId: oi.closetItemId,
    imageUrl: `/uploads/${oi.closetItem.filename}`,
    layerCategory: oi.layerCategory,
    category: oi.closetItem.category,
    style: oi.closetItem.style ?? Style.Casual,
    // top‐3 colors or fallback single color
    dominantColors: Array.isArray(oi.closetItem.dominantColors) && oi.closetItem.dominantColors.length > 0
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


//—–––– helpers below —––––

type PartitionedCloset = {
  [layerCategory: string]: ClosetItem[];
};

function partitionClosetByLayer(closetItems: ClosetItem[]): PartitionedCloset {
  const partition: PartitionedCloset = {};
  for (const item of closetItems) {
    if (!partition[item.layerCategory]) {
      partition[item.layerCategory] = [];
    }
    partition[item.layerCategory].push(item);
  }
  return partition;
}

function getRequiredLayers(weather: { avgTemp: number; minTemp: number }): string[] {
  const required = ['base_top', 'base_bottom', 'footwear'];
  if (weather.avgTemp < 18 || weather.minTemp < 13) {
    required.push('mid_top');
  }
  if (weather.avgTemp < 12 || weather.minTemp < 10) {
    required.push('outerwear');
  }
  return required;
}

function getCandidateOutfits(
  partitioned: PartitionedCloset,
  requiredLayers: string[],
  style: Style
) {
  const layerChoices: ClosetItem[][] = requiredLayers.map(layer =>
    (partitioned[layer] || []).filter(item => item.style === style)
  );
  if (layerChoices.some(arr => arr.length === 0)) return [];

  function* combine(index = 0, current: ClosetItem[] = []): Generator<ClosetItem[]> {
    if (index === layerChoices.length) {
      yield current;
      return;
    }
    for (const item of layerChoices[index]) {
      if (current.find(i => i.id === item.id)) continue;
      yield* combine(index + 1, [...current, item]);
    }
  }

  return [...combine()];
}

export {
  partitionClosetByLayer,
  getRequiredLayers,
  getCandidateOutfits,
  scoreOutfit
};
