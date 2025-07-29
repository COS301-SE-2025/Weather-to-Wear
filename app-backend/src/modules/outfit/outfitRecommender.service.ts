// app-backend/src/modules/outfit/outfitRecommender.service.ts

/*

Still very MVP, improvements TODO:
- Warmth scoring: Is the total outfit warmth suitable for min/avg temp? (can use a basic range mapping.)
- Waterproof scoring: If willRain, reward/require at least one waterproof layer (e.g. shoes or outerwear).
- Optional layers: e.g. add headwear if sunny/cold and user owns it.
- Variety: Avoid recommending duplicate outfits or same items in every combo.
- Performance: For very large closets, you might want to limit the number of combinations (random sample, etc.).
*/

import { PrismaClient, ClosetItem, LayerCategory, Style } from '@prisma/client';
import { RecommendOutfitsRequest, OutfitRecommendation } from './outfit.types';
import {
  getFeatureVector,
  predictRatingKnn,
} from './itemItemKnn';

import tinycolor from 'tinycolor2';

const prisma = new PrismaClient();

export async function recommendOutfits(
  userId: string,
  req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {
  // fetch closet items for this user
  const closetItems = await prisma.closetItem.findMany({
    where: { ownerId: userId },
  });

  // fetch user preferences
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

  // —–– build the initial rule/content-based recommendations
  const scored = rawCandidates.map(outfit => ({
    outfitItems: outfit.map(item => ({
      closetItemId: item.id,
      imageUrl: `/uploads/${item.filename}`,
      layerCategory: item.layerCategory,
      category: item.category,
      style: item.style ?? "Casual",
      // pick up your 3 extracted colors, or fallback to the single hex
      dominantColors: Array.isArray(item.dominantColors) && item.dominantColors.length > 0
        ? (item.dominantColors as string[])
        : [item.colorHex ?? "#000000"],
      warmthFactor: item.warmthFactor ?? 5,
      waterproof: item.waterproof ?? false,
    })),
    overallStyle: style,
    score: scoreOutfit(outfit, preferredColors),
    warmthRating: outfit.reduce((sum, i) => sum + (i.warmthFactor || 0), 0),
    waterproof: outfit.some(i => i.waterproof),
    weatherSummary: req.weatherSummary,
  }));

  scored.sort((a, b) => b.score - a.score);

  // —–– pull past-rated outfits for K-NN personalization
  const past = await prisma.outfit.findMany({
    where: { userId, userRating: { not: null } },
    include: {
      outfitItems: { include: { closetItem: true } }
    }
  });

  const historyVecs: number[][] = [];
  const historyRatings: number[] = [];

  for (const p of past) {
    // rebuild a mini OutfitRecommendation for feature extraction
    const fakeRec: OutfitRecommendation = {
      outfitItems: p.outfitItems.map(oi => ({
        closetItemId: oi.closetItemId,
        imageUrl: `/uploads/${oi.closetItem.filename}`,
        layerCategory: oi.layerCategory,
        category: oi.closetItem.category,
        style: oi.closetItem.style ?? Style.Casual,
        dominantColors: Array.isArray(oi.closetItem.dominantColors) && oi.closetItem.dominantColors.length > 0
          ? (oi.closetItem.dominantColors as string[])
          : [oi.closetItem.colorHex ?? "#000000"],
        warmthFactor: oi.closetItem.warmthFactor ?? 5,
        waterproof: oi.closetItem.waterproof ?? false,
      })),
      overallStyle: p.overallStyle,
      score: p.userRating!,   // TS needs this, but we don’t use it for features
      warmthRating: p.warmthRating,
      waterproof: p.waterproof,
      weatherSummary: JSON.parse(p.weatherSummary || '{}'),
    };

    historyVecs.push(getFeatureVector(fakeRec));
    historyRatings.push(p.userRating!);
  }

  // —–– blend rule-based with K-NN when we have history
  const augmented = scored.map(rec => {
    const baseScore = rec.score;
    if (historyRatings.length === 0) {
      return { ...rec, finalScore: baseScore };
    }
    const fv = getFeatureVector(rec);
    const knnPred = predictRatingKnn(fv, historyVecs, historyRatings, 5);
    const alpha = 0.5; // tuneable
    return { ...rec, finalScore: alpha * baseScore + (1 - alpha) * knnPred };
  });

  augmented.sort((a, b) => b.finalScore - a.finalScore);
  return augmented.slice(0, 5).map(({ finalScore, ...rest }) => rest);
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

// legacy single-color score (you can phase this out later)
function scoreOutfit(
  outfit: ClosetItem[],
  userPreferredColors: string[] = []
): number {
  let score = 0;
  const colors = outfit.map(i => i.colorHex).filter((c): c is string => !!c);
  if (colors.length > 1) {
    let dist = 0;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const h1 = tinycolor(colors[i]).toHsl().h;
        const h2 = tinycolor(colors[j]).toHsl().h;
        dist += Math.abs(h1 - h2);
      }
    }
    score += 10 - dist / (colors.length - 1);
  }
  score += outfit.filter(item =>
    userPreferredColors.includes(item.colorHex || '')
  ).length * 2;
  return score;
}

export {
  partitionClosetByLayer,
  getRequiredLayers,
  getCandidateOutfits,
  scoreOutfit
};
