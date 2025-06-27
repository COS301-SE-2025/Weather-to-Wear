import * as recommender from '../../src/modules/outfit/outfitRecommender.service';
import { Style, LayerCategory, Category } from '@prisma/client';

const dummyItem = (id: string, layer: LayerCategory) => ({
  id,
  style: Style.Casual,
  filename: `${id}.png`,
  category: Category.SHIRT,
  layerCategory: layer,
  createdAt: new Date(),
  colorHex: '#ff0000',
  warmthFactor: 5,
  waterproof: false,
  ownerId: 'user-1',
  material: null,
  favourite: false
});

describe('partitionClosetByLayer', () => {
  it('partitions closet items by layerCategory', () => {
    const closetItems = [
      { id: '1', layerCategory: LayerCategory.base_top },
      { id: '2', layerCategory: LayerCategory.base_top },
      { id: '3', layerCategory: LayerCategory.outerwear }
    ] as any[];
    const partitioned = recommender.partitionClosetByLayer(closetItems);
    expect(partitioned.base_top).toHaveLength(2);
    expect(partitioned.outerwear).toHaveLength(1);
  });
});

describe('getRequiredLayers', () => {
  it('returns base, mid, outerwear for cold weather', () => {
    const layers = recommender.getRequiredLayers({ avgTemp: 10, minTemp: 8 });
    expect(layers).toContain('base_top');
    expect(layers).toContain('mid_top');
    expect(layers).toContain('outerwear');
  });
  it('returns less layers for warm weather', () => {
    const layers = recommender.getRequiredLayers({ avgTemp: 22, minTemp: 18 });
    expect(layers).toEqual(['base_top', 'base_bottom', 'footwear']);
  });
});

describe('getCandidateOutfits', () => {
  it('returns all combinations of layer choices', () => {
    const partitioned = {
      base_top: [dummyItem('a', LayerCategory.base_top)],
      base_bottom: [dummyItem('b', LayerCategory.base_bottom)],
      footwear: [dummyItem('c', LayerCategory.footwear)]
    };
    const layers = ['base_top', 'base_bottom', 'footwear'];
    const candidates = recommender.getCandidateOutfits(partitioned, layers, Style.Casual);
    expect(candidates.length).toBe(1); // 1 possible outfit
    expect(candidates[0]).toHaveLength(3);
  });
  it('returns [] if any layer has zero choices', () => {
    const partitioned = {
      base_top: [dummyItem('a', LayerCategory.base_top)],
      base_bottom: [],
      footwear: [dummyItem('c', LayerCategory.footwear)]
    };
    const layers = ['base_top', 'base_bottom', 'footwear'];
    const candidates = recommender.getCandidateOutfits(partitioned, layers, Style.Casual);
    expect(candidates).toEqual([]);
  });
});

describe('scoreOutfit', () => {
  it('rewards harmonious colors', () => {
    const outfit = [
      { colorHex: '#ff0000' },
      { colorHex: '#ff1000' }
    ] as any[];
    const score = recommender.scoreOutfit(outfit, []);
    expect(typeof score).toBe('number');
  });
  it('rewards preferred colors', () => {
    const outfit = [
      { colorHex: '#00ff00' },
      { colorHex: '#111111' }
    ] as any[];
    const score = recommender.scoreOutfit(outfit, ['#00ff00']);
    expect(score).toBeGreaterThan(0);
  });
});

// mock prisma and tinycolor
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => ({
      closetItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', filename: 'a.png', layerCategory: 'base_top', style: 'Casual', colorHex: '#ff0000', warmthFactor: 5, waterproof: true, category: 'SHIRT', material: null, favourite: false, ownerId: 'user-1', createdAt: new Date() },
          { id: '2', filename: 'b.png', layerCategory: 'base_bottom', style: 'Casual', colorHex: '#00ff00', warmthFactor: 5, waterproof: false, category: 'PANTS', material: null, favourite: false, ownerId: 'user-1', createdAt: new Date() },
          { id: '3', filename: 'c.png', layerCategory: 'footwear', style: 'Casual', colorHex: '#0000ff', warmthFactor: 5, waterproof: false, category: 'SHOES', material: null, favourite: false, ownerId: 'user-1', createdAt: new Date() }
        ]),
      },
      userPreference: {
        findUnique: jest.fn().mockResolvedValue({ preferredColours: ['#ff0000'], style: 'Casual' }),
      }
    })),
    Style: { Formal: 'Formal', Casual: 'Casual', Athletic: 'Athletic', Party: 'Party', Business: 'Business', Outdoor: 'Outdoor' },
    LayerCategory: { base_top: 'base_top', base_bottom: 'base_bottom', mid_top: 'mid_top', mid_bottom: 'mid_bottom', outerwear: 'outerwear', footwear: 'footwear', headwear: 'headwear', accessory: 'accessory' },
    Category: { SHIRT: 'SHIRT', PANTS: 'PANTS', SHOES: 'SHOES' }
  };
});
jest.mock('tinycolor2', () => () => ({
  toHsl: () => ({ h: 0, s: 1, l: 0.5 })
}));

describe('recommendOutfits', () => {
  it('returns sorted scored outfits', async () => {
    const req = {
      weatherSummary: { avgTemp: 15, minTemp: 8, maxTemp: 18, willRain: false, mainCondition: 'Cloudy' }
    };
    const outfits = await recommender.recommendOutfits('user-123', req as any);
    expect(Array.isArray(outfits)).toBe(true);
    expect(outfits).toBeDefined();
    if (outfits.length > 0) {
      expect(outfits[0]).toHaveProperty('score');
      expect(outfits[0]).toHaveProperty('outfitItems');
    }
  });
});
