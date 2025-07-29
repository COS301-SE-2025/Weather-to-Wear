// app-backend/src/modules/outfit/itemItemKnn.ts

import { OutfitRecommendation } from "./outfit.types";
import tinycolor from "tinycolor2";
import { Style } from "@prisma/client";

/**
 * Style enum list in order for one-hot encoding
 */
const ALL_STYLES: Style[] = [
  Style.Formal,
  Style.Casual,
  Style.Athletic,
  Style.Party,
  Style.Business,
  Style.Outdoor,
];

/** Compute average pairwise hue distance for a set of hex colors */
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
 * Build a numeric feature vector from an OutfitRecommendation
 */
export function getFeatureVector(outfit: OutfitRecommendation): number[] {
  const { avgTemp = 0, minTemp = 0 } = outfit.weatherSummary as any;
  const warmth = outfit.warmthRating;
  const waterproof = outfit.waterproof ? 1 : 0;
  const styleOneHot = ALL_STYLES.map(s =>
    outfit.overallStyle === s ? 1 : 0
  );

  // pull all hexes from each item's dominantColors[], falling back to colorHex
  const hexes = outfit.outfitItems.flatMap(i =>
    Array.isArray(i.dominantColors) && i.dominantColors.length > 0
      ? i.dominantColors
      : [i.colorHex ?? "#000000"]
  );
  const harmony = computeColorHarmony(hexes);

  return [
    avgTemp,
    minTemp,
    warmth,
    waterproof,
    harmony,
    ...styleOneHot,
  ];
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const magB = Math.sqrt(b.reduce((s, y) => s + y * y, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

/**
 * Item–item K-NN predictor
 * @param queryVec  feature vector for the candidate outfit
 * @param historyVecs  past-rated outfit vectors
 * @param historyRatings  corresponding user ratings (1–5)
 * @param k  number of neighbors
 */
export function predictRatingKnn(
  queryVec: number[],
  historyVecs: number[][],
  historyRatings: number[],
  k = 5
): number {
  // compute sims
  const sims = historyVecs.map(hv => cosineSimilarity(queryVec, hv));

  // pick top-k
  const top = sims
    .map((sim, i) => ({ sim, rating: historyRatings[i] }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k);

  // baseline-adjusted weighted avg
  const mean = historyRatings.reduce((s, r) => s + r, 0) / historyRatings.length;
  let num = 0, den = 0;
  for (const { sim, rating } of top) {
    num += sim * (rating - mean);
    den += Math.abs(sim);
  }
  return den ? mean + num / den : mean;
}
