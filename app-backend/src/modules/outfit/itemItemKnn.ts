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

/** Compute color-harmony: average pairwise hue distance */
function computeColorHarmony(hexes: string[]): number {
  if (hexes.length < 2) return 0;
  let totalDist = 0;
  let count = 0;
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const h1 = tinycolor(hexes[i]).toHsl().h;
      const h2 = tinycolor(hexes[j]).toHsl().h;
      totalDist += Math.abs(h1 - h2);
      count++;
    }
  }
  return totalDist / count;
}

/** Turn an OutfitRecommendation into a numeric feature vector */
export function getFeatureVector(outfit: OutfitRecommendation): number[] {
  // 1) Weather from the request
  const { avgTemp = 0, minTemp = 0 } = outfit.weatherSummary as any;

  // 2) Warmth & waterproof
  const warmth = outfit.warmthRating;           // e.g. 0–30
  const waterproof = outfit.waterproof ? 1 : 0; // 0 or 1

  // 3) Style one-hot
  const styleOneHot = ALL_STYLES.map(s =>
    outfit.overallStyle === s ? 1 : 0
  );

  // 4) Color harmony
  const colors = outfit.outfitItems
    .map(i => i.colorHex)
    .filter((c): c is string => !!c);
  const harmony = computeColorHarmony(colors);

  return [
    avgTemp,
    minTemp,
    warmth,
    waterproof,
    harmony,
    ...styleOneHot,
  ];
}

/** Cosine similarity between two numeric vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi, i) => sum + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

/**  
 * Predict user u’s rating for outfit c via item-item KNN  
 * historyVecs: feature vectors of outfits u has rated  
 * historyRatings: corresponding ratings (1–5)  
 * k: how many neighbors to look at  
 */
export function predictRatingKnn(
  queryVec: number[],
  historyVecs: number[][],
  historyRatings: number[],
  k = 5
): number {
  // 1) compute similarities
  const sims = historyVecs.map(hv => cosineSimilarity(queryVec, hv));

  // 2) pair up [sim, rating], sort by sim desc
  const paired = sims
    .map((sim, idx) => ({ sim, rating: historyRatings[idx] }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k);

  // 3) weighted average around user's mean
  const ratings = historyRatings;
  const mean = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  let num = 0, den = 0;
  for (const { sim, rating } of paired) {
    num += sim * (rating - mean);
    den += Math.abs(sim);
  }
  return den ? mean + num / den : mean;
}
