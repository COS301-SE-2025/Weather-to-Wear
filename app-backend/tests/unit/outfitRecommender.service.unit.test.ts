// tests/unit/outfitRecommender.service.unit.test.ts

const getFeatureVectorMock: jest.Mock = jest.fn(() => [0, 0, 0]);
const predictRatingKnnMock: jest.Mock = jest.fn(() => 5);

jest.mock('../../src/utils/s3', () => ({
  cdnUrlFor: (f: string) => `cdn://${f}`,
}));

jest.mock('../../src/modules/outfit/itemItemKnn', () => ({
  getFeatureVector: getFeatureVectorMock,
  predictRatingKnn: predictRatingKnnMock,
  cosineSimilarity: jest.fn(() => 1),
}));

const mPrisma = {
  closetItem: { findMany: jest.fn() },
  userPreference: { findUnique: jest.fn() },
  outfit: { findMany: jest.fn() },
};
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => mPrisma),
    Style: { Casual: 'Casual', Formal: 'Formal', Athletic: 'Athletic' },
    LayerCategory: {
      base_top: 'base_top',
      base_bottom: 'base_bottom',
      footwear: 'footwear',
      mid_top: 'mid_top',
      outerwear: 'outerwear',
    },
  };
});

import {
  partitionClosetByLayer,
  getRequiredLayers,
  getLayerPlans,
  getCandidateOutfits,
  scoreOutfit,
  recommendOutfits,
} from '../../src/modules/outfit/outfitRecommender.service';
import { ClosetItem, LayerCategory, Style, PrismaClient } from '@prisma/client';

describe('outfitRecommender.service (pure helpers)', () => {
  const dummyItem = (
    id: string,
    layer: LayerCategory,
    overrides: Partial<ClosetItem> = {}
  ): ClosetItem => ({
    id,
    filename: `${id}.png`,
    layerCategory: layer,
    style: Style.Casual as any,
    colorHex: '#ff0000',
    category: 'SHIRT' as any,
    warmthFactor: 5,
    waterproof: false,
    ownerId: 'user-1',
    createdAt: new Date(),
    material: null as any,
    favourite: false,
    dominantColors: ['#ff0000'],
    ...overrides,
  });

  describe('partitionClosetByLayer', () => {
    it('groups items by their layerCategory', () => {
      const closet = [
        dummyItem('1', LayerCategory.base_top as any),
        dummyItem('2', LayerCategory.base_top as any),
        dummyItem('3', LayerCategory.outerwear as any),
      ];
      const result = partitionClosetByLayer(closet);
      expect(result.base_top).toHaveLength(2);
      expect(result.outerwear).toHaveLength(1);
    });

    it('returns empty object when closet is empty', () => {
      const result = partitionClosetByLayer([]);
      expect(result).toEqual({});
    });
  });

  describe('getRequiredLayers', () => {
    it('always returns only the core required layers', () => {
      const warm = getRequiredLayers({ avgTemp: 25, minTemp: 20 } as any);
      const mild = getRequiredLayers({ avgTemp: 20, minTemp: 15 } as any);
      const cold = getRequiredLayers({ avgTemp: 10, minTemp: 8 } as any);

      const core = ['base_top', 'base_bottom', 'footwear'];

      expect(warm).toEqual(core);
      expect(mild).toEqual(core);
      expect(cold).toEqual(core);

      expect(cold).not.toContain('mid_top');
      expect(cold).not.toContain('outerwear');
    });
  });

  describe('getLayerPlans', () => {
    it('includes outerwear without mid_top when raining and warm', () => {
      const plans = getLayerPlans({
        avgTemp: 22,
        minTemp: 20,
        willRain: true,
      } as any);

      const core = ['base_top', 'base_bottom', 'footwear'];
      expect(plans.some(p => core.every(x => p.includes(x)))).toBe(true);

      const hasOuterwearOnly = plans.some(
        p => p.includes('outerwear') && !p.includes('mid_top')
      );
      expect(hasOuterwearOnly).toBe(true);
    });

    it('includes mid_top (but not necessarily outerwear) when cool and dry', () => {
      const plans = getLayerPlans({
        avgTemp: 16,
        minTemp: 12,
        willRain: false,
      } as any);
      expect(plans.some(p => p.includes('mid_top'))).toBe(true);
    });

    it('includes both mid_top and outerwear when cold', () => {
      const plans = getLayerPlans({
        avgTemp: 10,
        minTemp: 8,
        willRain: false,
      } as any);
      const hasBoth = plans.some(
        p => p.includes('mid_top') && p.includes('outerwear')
      );
      expect(hasBoth).toBe(true);
    });

    it('may provide core-only plan when warm and dry', () => {
      const plans = getLayerPlans({
        avgTemp: 25,
        minTemp: 20,
        willRain: false,
      } as any);
      expect(plans).toContainEqual(['base_top', 'base_bottom', 'footwear']);
    });
  });

  describe('getCandidateOutfits', () => {
    it('generates valid outfits when all layers have items', () => {
      const partitioned = {
        base_top: [{ ...dummyItem('1', LayerCategory.base_top as any), warmthFactor: 7 }],
        base_bottom: [{ ...dummyItem('2', LayerCategory.base_bottom as any), warmthFactor: 7 }],
        footwear: [{ ...dummyItem('3', LayerCategory.footwear as any), warmthFactor: 7 }],
      } as any;

      const result = getCandidateOutfits(
        partitioned,
        ['base_top', 'base_bottom', 'footwear'],
        Style.Casual as any,
        { minTemp: 10 } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it('returns empty list if any required layer has no items', () => {
      const partitioned = {
        base_top: [dummyItem('1', LayerCategory.base_top as any)],
        base_bottom: [],
        footwear: [dummyItem('3', LayerCategory.footwear as any)],
      } as any;

      const result = getCandidateOutfits(
        partitioned,
        ['base_top', 'base_bottom', 'footwear'],
        Style.Casual as any,
        { minTemp: 10 } as any
      );

      expect(result).toEqual([]);
    });

    it('filters out outfits with insufficient warmth', () => {
      const partitioned = {
        base_top: [{ ...dummyItem('1', LayerCategory.base_top as any), warmthFactor: 1 }],
        base_bottom: [{ ...dummyItem('2', LayerCategory.base_bottom as any), warmthFactor: 1 }],
        footwear: [{ ...dummyItem('3', LayerCategory.footwear as any), warmthFactor: 1 }],
      } as any;

      const result = getCandidateOutfits(
        partitioned,
        ['base_top', 'base_bottom', 'footwear'],
        Style.Casual as any,
        { minTemp: 0 } as any
      );

      expect(result).toEqual([]);
    });
  });

  describe('scoreOutfit', () => {
    const baseOutfit = [
      dummyItem('a', LayerCategory.base_top as any, {
        colorHex: '#ff0000',
        dominantColors: ['#ff0000'],
        warmthFactor: 10,
        waterproof: true,
      }),
      dummyItem('b', LayerCategory.base_bottom as any, {
        colorHex: '#ff1100',
        dominantColors: ['#ff1100'],
        warmthFactor: 10,
      }),
    ];

    it('rewards harmonious colors and preferred colors', () => {
      const score = scoreOutfit(baseOutfit as any, ['#ff0000'], {
        avgTemp: 15,
        minTemp: 10,
        willRain: false,
      } as any);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('penalizes white or near-white outfits', () => {
      const whiteOutfit = [
        dummyItem('c', LayerCategory.base_top as any, {
          colorHex: '#ffffff',
          dominantColors: ['#ffffff'],
        }),
      ];
      const score = scoreOutfit(whiteOutfit as any, [], {
        avgTemp: 20,
        minTemp: 15,
        willRain: false,
      } as any);
      expect(score).toBeLessThan(0);
    });

    it('rewards waterproof items if raining (stronger bias)', () => {
      const rainyScore = scoreOutfit(baseOutfit as any, [], {
        avgTemp: 10,
        minTemp: 5,
        willRain: true,
      } as any);
      expect(rainyScore).toBeGreaterThan(0);
    });
  });
});

describe('recommendOutfits (integration-ish with mocks)', () => {
  const prisma = new PrismaClient() as unknown as typeof mPrisma;

  const makeItem = (id: string, layer: keyof typeof LayerCategory, extras: Partial<any> = {}) => ({
    id,
    filename: `${id}.png`,
    layerCategory: layer,
    style: Style.Casual,
    colorHex: '#123456',
    category: 'SHIRT',
    warmthFactor: 10,
    waterproof: false,
    ownerId: 'user-1',
    createdAt: new Date(),
    favourite: false,
    material: null,
    dominantColors: ['#123456'],
    ...extras,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns [] when no candidate outfits can be formed', async () => {
    prisma.closetItem.findMany.mockResolvedValueOnce([
      makeItem('t', 'base_top' as any),
      makeItem('sh', 'footwear' as any),
    ]);
    prisma.userPreference.findUnique.mockResolvedValueOnce({ userId: 'user-1', style: Style.Formal, preferredColours: [] });
    prisma.outfit.findMany.mockResolvedValueOnce([]);

    const res = await recommendOutfits('user-1', {
      style: undefined as any,
      weatherSummary: { avgTemp: 22, minTemp: 20, willRain: false, maxTemp: 25, mainCondition: 'clear' } as any,
    });

    expect(res).toEqual([]);
    expect(prisma.closetItem.findMany).toHaveBeenCalledWith({ where: { ownerId: 'user-1' } });
  });

  it('builds, scores, and returns at least one outfit; maps image URLs via CDN and defaults item style', async () => {
    prisma.closetItem.findMany.mockResolvedValueOnce([
      makeItem('top1', 'base_top' as any, { warmthFactor: 7, waterproof: true }),
      makeItem('bot1', 'base_bottom' as any, { warmthFactor: 7 }),
      makeItem('sh1', 'footwear' as any, { warmthFactor: 7 }),
    ]);
    prisma.userPreference.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      style: Style.Casual,
      preferredColours: ['#123456'],
    });
    prisma.outfit.findMany.mockResolvedValueOnce([]);

    const res = await recommendOutfits('user-1', {
      style: undefined as any,
      weatherSummary: { avgTemp: 18, minTemp: 13, maxTemp: 22, willRain: true, mainCondition: 'rain' } as any,
    });

    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);

    const rec = res[0];
    expect(rec.overallStyle).toBe(Style.Casual);
    expect(rec.outfitItems).toHaveLength(3);
    for (const it of rec.outfitItems) {
      expect(it.imageUrl).toMatch(/^cdn:\/\/.+\.png$/);
      expect(it.style).toBe(Style.Casual);
    }
    expect(typeof rec.score).toBe('number');
    expect(rec.warmthRating).toBeGreaterThan(0);
    expect(rec.waterproof).toBe(true);
  });

  it('uses req.style over user preference and blends with history via KNN', async () => {
    prisma.closetItem.findMany.mockResolvedValueOnce([
      makeItem('top2', 'base_top' as any, { warmthFactor: 8 }),
      makeItem('bot2', 'base_bottom' as any, { warmthFactor: 8 }),
      makeItem('sh2', 'footwear' as any, { warmthFactor: 8 }),
    ]);
    prisma.userPreference.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      style: Style.Formal,
      preferredColours: [],
    });
    prisma.outfit.findMany.mockResolvedValueOnce([
      {
        id: 'past-1',
        userId: 'user-1',
        userRating: 4,
        warmthRating: 20,
        waterproof: false,
        overallStyle: Style.Casual,
        weatherSummary: JSON.stringify({ avgTemp: 15, minTemp: 10, maxTemp: 20, willRain: false, mainCondition: 'clouds' }),
        outfitItems: [
          {
            closetItemId: 'x',
            closetItem: {
              id: 'x',
              filename: 'x.png',
              layerCategory: 'base_top',
              category: 'SHIRT',
              style: Style.Casual,
              dominantColors: ['#111111'],
              colorHex: '#111111',
              warmthFactor: 5,
              waterproof: false,
            },
          },
        ],
      },
    ]);

    const res = await recommendOutfits('user-1', {
      style: Style.Casual as any,
      weatherSummary: { avgTemp: 18, minTemp: 13, maxTemp: 20, willRain: false, mainCondition: 'clouds' } as any,
    });

    expect(res).toHaveLength(1);
    expect(res[0].overallStyle).toBe(Style.Casual);
    expect(getFeatureVectorMock).toHaveBeenCalled();
    expect(predictRatingKnnMock).toHaveBeenCalled();
  });

  it('produces multiple candidates and still caps selection to <= 5 via clustering', async () => {
    prisma.closetItem.findMany.mockResolvedValueOnce([
      makeItem('t1', 'base_top' as any, { warmthFactor: 7 }),
      makeItem('t2', 'base_top' as any, { warmthFactor: 7 }),
      makeItem('b1', 'base_bottom' as any, { warmthFactor: 7 }),
      makeItem('b2', 'base_bottom' as any, { warmthFactor: 7 }),
      makeItem('s1', 'footwear' as any, { warmthFactor: 7 }),
      makeItem('s2', 'footwear' as any, { warmthFactor: 7 }),
    ]);
    prisma.userPreference.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      style: Style.Casual,
      preferredColours: [],
    });
    prisma.outfit.findMany.mockResolvedValueOnce([]);

    const res = await recommendOutfits('user-1', {
      style: Style.Casual as any,
      weatherSummary: { avgTemp: 20, minTemp: 15, maxTemp: 25, willRain: false, mainCondition: 'clear' } as any,
    });

    expect(res.length).toBeGreaterThan(0);
    expect(res.length).toBeLessThanOrEqual(5);
    for (const r of res) {
      expect(r.outfitItems.every(oi => oi.imageUrl.startsWith('cdn://'))).toBe(true);
    }
  });
});
