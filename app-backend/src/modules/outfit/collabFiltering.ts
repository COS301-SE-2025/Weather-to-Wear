// app-backend/src/modules/outfit/collabFiltering.ts
import { cosineSimilarity } from "./itemItemKnn";

export type RatingPoint = {
  userId: string;
  vec: number[];  
  rating: number; 
};


export function summarizeUser(
  points: RatingPoint[],
  minRating = 4
): Map<string, { meanVec: number[]; count: number }> {
  const bucket = new Map<string, number[][]>();

  for (const p of points) {
    if (p.rating >= minRating) {
      if (!bucket.has(p.userId)) bucket.set(p.userId, []);
      bucket.get(p.userId)!.push(p.vec);
    }
  }

  const out = new Map<string, { meanVec: number[]; count: number }>();
  for (const [uid, vecs] of bucket) {
    if (!vecs.length) continue;
    const d = vecs[0].length;
    const mean = new Array(d).fill(0);
    for (const v of vecs) for (let i = 0; i < d; i++) mean[i] += v[i];
    for (let i = 0; i < d; i++) mean[i] /= vecs.length;
    out.set(uid, { meanVec: mean, count: vecs.length });
  }
  return out;
}

export function topNeighbors(
  targetUserId: string,
  userCentroids: Map<string, { meanVec: number[]; count: number }>,
  k = 20,
  minCount = 2
): Array<{ userId: string; sim: number }> {
  const t = userCentroids.get(targetUserId);
  if (!t) return [];
  const all: Array<{ userId: string; sim: number }> = [];
  for (const [uid, c] of userCentroids) {
    if (uid === targetUserId) continue;
    if (c.count < minCount) continue;
    all.push({ userId: uid, sim: cosineSimilarity(t.meanVec, c.meanVec) });
  }
  return all.sort((a, b) => b.sim - a.sim).slice(0, k);
}

export function predictFromNeighbors(
  candidateVec: number[],
  neighborPoints: RatingPoint[],
  globalMean: number,
  k = 50
): number {
  if (!neighborPoints.length) return globalMean;

  const sims = neighborPoints
    .map(p => ({ sim: cosineSimilarity(candidateVec, p.vec), rating: p.rating }))
    .filter(x => x.sim > 0); 

  if (!sims.length) return globalMean;

  const top = sims.sort((a, b) => b.sim - a.sim).slice(0, k);
  const neighborMean =
    neighborPoints.reduce((s, p) => s + p.rating, 0) / neighborPoints.length;

  let num = 0, den = 0;
  for (const { sim, rating } of top) {
    num += sim * (rating - neighborMean);
    den += Math.abs(sim);
  }
  return den ? (neighborMean + num / den) : neighborMean;
}

export function getBlendWeights() {
  const wRule = parseFloat(process.env.CF_W_RULE ?? "0.40");
  const wKnn  = parseFloat(process.env.CF_W_KNN  ?? "0.25");
  const wCf   = parseFloat(process.env.CF_W_CF   ?? "0.35");

  let sum = wRule + wKnn + wCf;
  if (!isFinite(sum) || sum <= 0) return { wRule: 0.25, wKnn: 0.35, wCf: 0.40 };
  return { wRule: wRule / sum, wKnn: wKnn / sum, wCf: wCf / sum };
}
