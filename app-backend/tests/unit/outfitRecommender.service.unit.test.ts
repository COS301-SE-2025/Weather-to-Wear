// tests/unit/outfitRecommender.service.unit.test.ts

import {
  partitionClosetByLayer,
  getRequiredLayers,
  getCandidateOutfits,
  scoreOutfit,
} from '../../src/modules/outfit/outfitRecommender.service';

import { ClosetItem, LayerCategory, Style } from '@prisma/client';

describe('outfitRecommender.service', () => {
  const dummyItem = (
    id: string,
    layer: LayerCategory,
    overrides: Partial<ClosetItem> = {}
  ): ClosetItem => ({
    id,
    filename: `${id}.png`,
    layerCategory: layer,
    style: Style.Casual,
    colorHex: '#ff0000',
    category: 'SHIRT' as any,
    warmthFactor: 5,
    waterproof: false,
    ownerId: 'user-1',
    createdAt: new Date(),
    material: null,
    favourite: false,
    dominantColors: ['#ff0000'],
    ...overrides,
  });

  describe('partitionClosetByLayer', () => {
    it('groups items by their layerCategory', () => {
      const closet = [
        dummyItem('1', LayerCategory.base_top),
        dummyItem('2', LayerCategory.base_top),
        dummyItem('3', LayerCategory.outerwear),
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
    it('includes mid and outerwear layers for cold weather', () => {
      const result = getRequiredLayers({ avgTemp: 10, minTemp: 8 });
      expect(result).toEqual(
        expect.arrayContaining(['base_top', 'mid_top', 'outerwear'])
      );
    });

    it('excludes outerwear for mild weather', () => {
      const result = getRequiredLayers({ avgTemp: 20, minTemp: 15 });
      expect(result).not.toContain('outerwear');
    });

    it('only returns base layers for warm weather', () => {
      const result = getRequiredLayers({ avgTemp: 25, minTemp: 20 });
      expect(result).toEqual(['base_top', 'base_bottom', 'footwear']);
    });
  });

  describe('getCandidateOutfits', () => {
    it('generates valid outfits when all layers have items', () => {
      const partitioned = {
        base_top: [dummyItem('1', LayerCategory.base_top, { warmthFactor: 7 })],
        base_bottom: [dummyItem('2', LayerCategory.base_bottom, { warmthFactor: 7 })],
        footwear: [dummyItem('3', LayerCategory.footwear, { warmthFactor: 7 })],
      };

      const result = getCandidateOutfits(
        partitioned,
        ['base_top', 'base_bottom', 'footwear'],
        Style.Casual,
        { minTemp: 10 }
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it('returns empty list if any required layer has no items', () => {
      const partitioned = {
        base_top: [dummyItem('1', LayerCategory.base_top)],
        base_bottom: [],
        footwear: [dummyItem('3', LayerCategory.footwear)],
      };

      const result = getCandidateOutfits(
        partitioned,
        ['base_top', 'base_bottom', 'footwear'],
        Style.Casual,
        { minTemp: 10 }
      );

      expect(result).toEqual([]);
    });

    it('filters out outfits with insufficient warmth', () => {
      const partitioned = {
        base_top: [dummyItem('1', LayerCategory.base_top, { warmthFactor: 1 })],
        base_bottom: [
          dummyItem('2', LayerCategory.base_bottom, { warmthFactor: 1 }),
        ],
        footwear: [
          dummyItem('3', LayerCategory.footwear, { warmthFactor: 1 }),
        ],
      };

      const result = getCandidateOutfits(
        partitioned,
        ['base_top', 'base_bottom', 'footwear'],
        Style.Casual,
        { minTemp: 0 } // high warmth requirement
      );

      expect(result).toEqual([]);
    });
  });

  describe('scoreOutfit', () => {
    const baseOutfit = [
      dummyItem('a', LayerCategory.base_top, {
        colorHex: '#ff0000',
        dominantColors: ['#ff0000'],
        warmthFactor: 10,
        waterproof: true,
      }),
      dummyItem('b', LayerCategory.base_bottom, {
        colorHex: '#ff1100',
        dominantColors: ['#ff1100'],
        warmthFactor: 10,
      }),
    ];

    it('rewards harmonious colors and preferred colors', () => {
      const score = scoreOutfit(baseOutfit, ['#ff0000'], {
        avgTemp: 15,
        minTemp: 10,
        willRain: false,
      });
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('penalizes white or near-white outfits', () => {
      const whiteOutfit = [
        dummyItem('c', LayerCategory.base_top, {
          colorHex: '#ffffff',
          dominantColors: ['#ffffff'],
        }),
      ];
      const score = scoreOutfit(whiteOutfit, [], {
        avgTemp: 20,
        minTemp: 15,
        willRain: false,
      });
      expect(score).toBeLessThan(0);
    });

    it('rewards waterproof items if raining', () => {
      const rainyScore = scoreOutfit(baseOutfit, [], {
        avgTemp: 10,
        minTemp: 5,
        willRain: true,
      });
      expect(rainyScore).toBeGreaterThan(0);
    });
  });
});
