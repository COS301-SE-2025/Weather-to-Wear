//outfitRecommender.service.ts
import { PrismaClient, ClosetItem, LayerCategory, Style } from '@prisma/client';
import {
  RecommendOutfitsRequest,
  OutfitRecommendation,
  OutfitItemRecommendation,
  WeatherSummary,
} from './outfit.types';
import { getFeatureVector, predictRatingKnn, cosineSimilarity } from './itemItemKnn';
import {
  getBlendWeights,
  summarizeUser,
  topNeighbors,
  predictFromNeighbors,
  type RatingPoint
} from "./collabFiltering";
import tinycolor from 'tinycolor2';
import { cdnUrlFor } from '../../utils/s3';

const prisma = new PrismaClient();

// ---------------------------------------------
//                 Utilities
// ---------------------------------------------

// Shuffle (Fisher–Yates)
function shuffleArray<T>(array: T[]): T[] {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Simple k-means over outfit feature vectors
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

// ---------------------------------------------
//      Color harmony (avg pairwise hue dist)
// ---------------------------------------------
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

// ---------------------------------------------
//       Weighted warmth model + helpers
// ---------------------------------------------

const LAYER_WARMTH_WEIGHT: Record<string, number> = {
  base_top: 1.0,
  base_bottom: 1.0,
  mid_top: 1.2,
  outerwear: 1.6,
  footwear: 0.4,
  headwear: 0.2,
  // accessory: 0.1,
};

function weightedItemWarmth(item: ClosetItem): number {
  const w = LAYER_WARMTH_WEIGHT[item.layerCategory] ?? 1.0;
  const base = (item.warmthFactor ?? 0) * w;
  // Soft outerwear on warm/rainy days contributes less to effective warmth
  if ((item as any).__softOuterwear) return base * 0.4;
  return base;
}

function weightedOutfitWarmth(items: ClosetItem[]): number {
  return items.reduce((s, it) => s + weightedItemWarmth(it), 0);
}

function targetWeightedWarmth(minTemp: number, avgTemp: number): number {
  const t = Math.min(avgTemp, (avgTemp + minTemp) / 2 + 2);
  // temp vs desired warmth rating
  const points: Array<[number, number]> = [
    [30, 5],
    [25, 7],
    [20, 10],
    [15, 14],
    [10, 22],
    [5, 26],
    [0, 28],
    [-5, 32],
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const [t1, w1] = points[i];
    const [t2, w2] = points[i + 1];
    if ((t <= t1 && t >= t2) || (t >= t1 && t <= t2)) {
      const ratio = (t - t1) / (t2 - t1);
      return w1 + ratio * (w2 - w1);
    }
  }
  if (t > points[0][0]) return points[0][1];
  return points[points.length - 1][1];
}

function warmthTolerance(minTemp: number, avgTemp: number): number {
  const t = Math.min(avgTemp, minTemp + 4);
  if (t >= 28) return 6;
  if (t >= 22) return 5;
  if (t >= 14) return 4.5;
  if (t >= 8) return 4;
  if (t >= 2) return 3.5;
  return 3;
}

function buildCoreOnlyFallback(
  partitioned: PartitionedCloset,
  style: Style
): ClosetItem[] | null {
  const core = ['base_top', 'base_bottom', 'footwear'] as const;

  const pick = (layer: typeof core[number]) => {
    const styled = (partitioned[layer] || []).filter(i => i.style === style);
    if (styled.length) return styled[0];
    const any = (partitioned[layer] || []);
    return any.length ? any[0] : null;
  };

  const chosen = core.map(pick);
  if (chosen.some(i => i === null)) return null; // truly missing a core item
  // Ensure distinct items
  const unique = Array.from(new Map(chosen.map(i => [i!.id, i!])).values());
  return unique.length === core.length ? unique : null;
}

// ---------------------------------------------
//       Scoring (uses weighted warmth)
// ---------------------------------------------
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

  const wWarmth = weightedOutfitWarmth(outfit);
  const target = targetWeightedWarmth(weather.minTemp, weather.avgTemp);
  const tol = warmthTolerance(weather.minTemp, weather.avgTemp);
  const delta = Math.abs(wWarmth - target);

  const warmthTerm = delta <= tol
    ? 1.25
    : Math.exp(-((delta - tol) * (delta - tol)) / 50);

  const rainBonus = weather.willRain && outfit.some(i => i.waterproof) ? 2.0 : 0;

  return (1.0 * harmony + 2.0 * prefHits + 3.0 * warmthTerm + rainBonus + whitePenalty);
}

// ---------------------------------------------
//           Closet partitioning + plans
// ---------------------------------------------
type PartitionedCloset = { [layer: string]: ClosetItem[] };

function partitionClosetByLayer(closetItems: ClosetItem[]): PartitionedCloset {
  return closetItems.reduce((part, item) => {
    (part[item.layerCategory] ||= []).push(item);
    return part;
  }, {} as PartitionedCloset);
}

function getRequiredLayers(weather: { avgTemp: number; minTemp: number }): string[] {
  return ['base_top', 'base_bottom', 'footwear'];
}

function getLayerPlans(weather: { avgTemp: number; minTemp: number; willRain: boolean }): string[][] {
  const core = getRequiredLayers(weather);
  const plans: string[][] = [];

  const isCool = weather.avgTemp < 18 || weather.minTemp < 13;
  const isCold = weather.avgTemp < 12 || weather.minTemp < 10;

  plans.push(core);

  if (isCool) plans.push([...core, 'mid_top']);

  if (weather.willRain || isCold) plans.push([...core, 'outerwear']);

  if (isCold) plans.push([...core, 'mid_top', 'outerwear']);

  const key = (p: string[]) => p.slice().sort().join('|');
  const seen = new Set<string>();
  return plans.filter(p => {
    const k = key(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function getMinWarmthForLayer(layer: string, minTemp: number): number {
  if (minTemp < 10) {
    switch (layer) {
      case 'base_bottom': return 5;
      case 'base_top': return 4;
      case 'footwear': return 3; // AHH MAYBE ISSUE 
      case 'mid_top': return 6;
      case 'outerwear': return 7;
      default: return 1;
    }
  } else if (minTemp < 20) {
    switch (layer) {
      case 'base_bottom': return 3;
      case 'base_top': return 2;
      case 'footwear': return 1; // AHH MAYBE ISSUE again
      case 'mid_top': return 4;
      case 'outerwear': return 5;
      default: return 1;
    }
  } else {
    return 1;
  }
}

function getCandidateOutfits(
  partitioned: PartitionedCloset,
  requiredLayers: string[],
  style: Style,
  weather: { minTemp: number; avgTemp: number }
): ClosetItem[][] {
  const strictChoices = requiredLayers.map(layer => {
    const minWarmth = getMinWarmthForLayer(layer, weather.minTemp);
    const items = (partitioned[layer] || []).filter(
      item => item.style === style && (item.warmthFactor || 0) >= minWarmth
    );
    return items.length > 5 ? shuffleArray(items).slice(0, 5) : items;
  });

  const choices = strictChoices.map((opts, idx) => {
    if (opts.length > 0) return opts;
    const layer = requiredLayers[idx];
    const styleOnly = (partitioned[layer] || []).filter(it => it.style === style);
    if (styleOnly.length > 0) {
      return styleOnly.length > 5 ? shuffleArray(styleOnly).slice(0, 5) : styleOnly;
    }
    const any = (partitioned[layer] || []);
    return any.length > 0 ? (any.length > 5 ? shuffleArray(any).slice(0, 5) : any) : [];
  });

  if (choices.some(arr => arr.length === 0)) {
    return [];
  }

  function* combine(i = 0, current: ClosetItem[] = []): Generator<ClosetItem[]> {
    if (i === choices.length) { yield current; return; }
    for (const itm of choices[i]) {
      if (current.some(c => c.id === itm.id)) continue;
      yield* combine(i + 1, current.concat(itm));
    }
  }

  const target = targetWeightedWarmth(weather.minTemp, weather.avgTemp);
  const tol = warmthTolerance(weather.minTemp, weather.avgTemp);

  const allCombos = Array.from(combine());
  if (!allCombos.length) return [];

  let kept = allCombos.filter(outfit => {
    const w = outfit.reduce((s, i) => s + weightedItemWarmth(i), 0);
    return w >= (target - tol) * 0.75 && w <= (target + tol) * 1.25;
  });

  if (!kept.length) {
    kept = allCombos.filter(outfit => {
      const w = outfit.reduce((s, i) => s + weightedItemWarmth(i), 0);
      return w >= (target - tol * 2.5) * 0.5 && w <= (target + tol * 2.5) * 1.75;
    });
  }

  if (!kept.length) {
    kept = allCombos;
  }

  return kept.length > 120 ? shuffleArray(kept).slice(0, 120) : kept;
}

// ---------------------------------------------
//          Rain gear add-on (warm rain)
// ---------------------------------------------
function attachLightRainOuterwear(
  outfit: ClosetItem[],
  partitioned: PartitionedCloset,
  weather: { avgTemp: number; minTemp: number; willRain: boolean }
): ClosetItem[] {
  if (!weather.willRain) return outfit;
  const outer = (partitioned['outerwear'] || []).filter(o => o.waterproof);
  if (!outer.length) return outfit;

  const sorted = outer.slice().sort((a, b) => weightedItemWarmth(a) - weightedItemWarmth(b));
  const chosen = sorted[0];

  if (outfit.some(i => i.id === chosen.id)) return outfit;

  const warm = weather.avgTemp >= 20;
  if (warm) (chosen as any).__softOuterwear = true;

  return outfit.concat(chosen);
}

// ---------------------------------------------
//            Headwear add-on (sun/cold)
// ---------------------------------------------
function isSunny(main: string | undefined): boolean {
  if (!main) return false;
  const m = main.toLowerCase();
  return m.includes('clear') || m.includes('sun');
}

function pickHeadwear(
  partitioned: PartitionedCloset,
  style: Style,
  weather: { avgTemp: number; minTemp: number; willRain: boolean; mainCondition?: string }
): ClosetItem | null {
  const headwear = (partitioned['headwear'] || []);
  if (!headwear.length) return null;

  // Very cold -> beanie
  if (weather.minTemp <= 5) {
    const beanies = headwear.filter(i => (i as any).category === 'BEANIE');
    if (!beanies.length) return null;
    const styled = beanies.filter(b => b.style === style);
    const pool = styled.length ? styled : beanies;
    // warmest first
    return pool
      .slice()
      .sort((a, b) => (b.warmthFactor ?? 0) - (a.warmthFactor ?? 0))[0] ?? null;
  }

  // Sunny and dry and warm -> hat
  if (!weather.willRain && isSunny(weather.mainCondition) && weather.avgTemp >= 18) {
    const hats = headwear.filter(i => (i as any).category === 'HAT');
    if (!hats.length) return null;
    const styled = hats.filter(h => h.style === style);
    const pool = styled.length ? styled : hats;
    // lightest first (avoid overheating)
    return pool
      .slice()
      .sort((a, b) => (a.warmthFactor ?? 0) - (b.warmthFactor ?? 0))[0] ?? null;
  }

  return null;
}

// Attach a selected headwear item if present and not already included 
function attachHeadwearIfNeeded(
  outfit: ClosetItem[],
  partitioned: PartitionedCloset,
  style: Style,
  weather: { avgTemp: number; minTemp: number; willRain: boolean; mainCondition?: string }
): ClosetItem[] {
  // Already has headwear?
  if (outfit.some(i => i.layerCategory === 'headwear')) return outfit;

  const hw = pickHeadwear(partitioned, style, weather);
  if (!hw) return outfit;

  // Avoid duplicates by id
  if (outfit.some(i => i.id === hw.id)) return outfit;

  return outfit.concat(hw);
}

// ---------------------------------------------
//                Main: recommend
// ---------------------------------------------
export async function recommendOutfits(
  userId: string,
  req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {

  const closetItems = await prisma.closetItem.findMany({ where: { ownerId: userId } });
  const userPref = await prisma.userPreference.findUnique({ where: { userId } });

  const style: Style = (req.style as Style) || userPref?.style || Style.Casual;
  const partitioned = partitionClosetByLayer(closetItems);
  const prefColors = Array.isArray(userPref?.preferredColours)
    ? (userPref.preferredColours as string[])
    : [];

  const plans = getLayerPlans(req.weatherSummary);

  // Generate candidates for each plan and merge
  const allCandidates: ClosetItem[][] = [];
  for (const plan of plans) {
    const cands = getCandidateOutfits(partitioned, plan, style, req.weatherSummary as any);

    // For warm rain: also try adding light waterproof outerwear to base-only candidates
    for (const cand of cands) {
      const hasOuterwear = cand.some(i => i.layerCategory === 'outerwear');
      let withAddons = cand;

      if (!hasOuterwear && req.weatherSummary.willRain) {
        withAddons = attachLightRainOuterwear(withAddons, partitioned, req.weatherSummary);
      }

      // attach headwear for sun/cold
      withAddons = attachHeadwearIfNeeded(withAddons, partitioned, style, req.weatherSummary);

      allCandidates.push(withAddons);
    }

    // also keep raw candidates, but cap to 120
    allCandidates.push(...(cands.length > 120 ? cands.slice(0, 120) : cands));
  }

  const seen = new Set<string>();
  const uniqueCandidates = allCandidates.filter(outfit => {
    const key = outfit.map(i => i.id).sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // if no candidates, synthesize a minimal core-only outfit.
  if (!uniqueCandidates.length) {
    const coreFallback = buildCoreOnlyFallback(partitioned, style);
    if (coreFallback) {
      const items = coreFallback.map(item => ({
        closetItemId: item.id,
        imageUrl: cdnUrlFor(item.filename),
        layerCategory: item.layerCategory,
        category: item.category,
        style: item.style ?? Style.Casual,
        dominantColors:
          Array.isArray(item.dominantColors) && item.dominantColors.length > 0
            ? (item.dominantColors as string[])
            : [item.colorHex ?? '#000000'],
        warmthFactor: item.warmthFactor ?? 5,
        waterproof: item.waterproof ?? false,
      }));

      const fallbackRec = {
        outfitItems: items,
        overallStyle: style,
        score: scoreOutfit(coreFallback, prefColors, req.weatherSummary),
        warmthRating: Math.round(weightedOutfitWarmth(coreFallback)),
        waterproof: coreFallback.some(i => i.waterproof),
        weatherSummary: req.weatherSummary,
      };

      // return to single fallback outfit
      return [fallbackRec];
    }

    // if there lacks a core item, don't return any outfit
    return [];
  }

  // Map + score
  const scored = uniqueCandidates.map(outfit => {
    const items = outfit.map(item => ({
      closetItemId: item.id,
      imageUrl: cdnUrlFor(item.filename),
      layerCategory: item.layerCategory,
      category: item.category,
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
      warmthRating: Math.round(weightedOutfitWarmth(outfit)), // weighted warmth shown to client
      waterproof: outfit.some(i => i.waterproof),
      weatherSummary: req.weatherSummary,
    };
  });

  // Personalize via KNN
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
    const knn = predictRatingKnn(getFeatureVector(rec), historyVecs, historyRatings, 5);
    const alpha = 0.3; // blend (0.3 content, 0.7 KNN)
    return { ...rec, finalScore: alpha * rec.score + (1 - alpha) * knn };
  });


  const rated = (await prisma.outfit.findMany({
    where: { userRating: { not: null } },
    include: { outfitItems: { include: { closetItem: true } } },
    orderBy: { createdAt: 'desc' },
    take: 3000,
  })) ?? [];

  // Turn into rating points in the same feature space
  const points: RatingPoint[] = rated.map(o => ({
    userId: o.userId,
    vec: getFeatureVector(buildFakeRec(o)),
    rating: o.userRating!,
  }));

  const globalMean = points.length
    ? points.reduce((s, p) => s + p.rating, 0) / points.length
    : 3.0;

  const centroids = summarizeUser(points); // per-user mean vectors
  const neighbors = topNeighbors(userId, centroids, 20, 2); // top users near this user

  const neighborIds = new Set(neighbors.map(n => n.userId));
  const neighborPoints = points.filter(p => neighborIds.has(p.userId));

  const { wRule, wKnn, wCf } = getBlendWeights();

  const withCF = augmented.map(rec => {
    // rec.finalScore currently = blend(rule, knn). We’ll recover components by reusing rec.score (rule)
    const ruleScore = rec.score;
    const rkScore = (rec as any).finalScore ?? rec.score; // safety for tests/mocks

    // CF predicted rating from neighbors
    const cfPred = predictFromNeighbors(getFeatureVector(rec), neighborPoints, globalMean, 50);

    // three-way blend: rule + item-KNN + collaborative filtering
    const combined = wRule * ruleScore + wKnn * rkScore + wCf * cfPred;
    return { ...rec, finalScore: combined };
  });

  // If raining, prefer waterproof outfits when available
  let pool = withCF;

  if (req.weatherSummary.willRain) {
    const waterproofOnly = augmented.filter(a => a.waterproof);
    if (waterproofOnly.length) pool = waterproofOnly;
  }
  if (!pool.length) pool = withCF; // fallback to non-waterproof if filter emptied pool

  // Cluster and pick top up to 5
  // const k = Math.min(10, pool.length);
  const k = Math.max(1, Math.min(10, pool.length)); // avoid k=0
  const clusters = kMeansCluster(pool, k);
  const selected: OutfitRecommendation[] = [];
  for (const cluster of clusters) {
    if (cluster.length === 0) continue;
    const clusterOutfits = cluster.map(idx => pool[idx]);
    const bestInCluster = clusterOutfits.reduce((best, curr) =>
      curr.finalScore > best.finalScore ? curr : best
    );
    selected.push(bestInCluster);
    if (selected.length >= 5) break;
  }

  return selected;
}

// ---------------------------------------------
//           Old outfit -> fake rec helper
// ---------------------------------------------
function buildFakeRec(outfit: any): OutfitRecommendation {
  return {
    outfitItems: outfit.outfitItems.map((oi: any) => ({
      closetItemId: oi.closetItemId,
      imageUrl: cdnUrlFor(oi.closetItem.filename),
      layerCategory: oi.closetItem.layerCategory,
      category: oi.closetItem.category,
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

// ---------------------------------------------
//                Exports (helpers)
// ---------------------------------------------
export {
  partitionClosetByLayer,
  getRequiredLayers,
  getLayerPlans,
  getCandidateOutfits,
  scoreOutfit,
};
