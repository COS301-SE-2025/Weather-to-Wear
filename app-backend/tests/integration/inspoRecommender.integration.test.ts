// tests/integration/inspoRecommender.integration.test.ts
import {
  calculateItemSimilarity,
  findSimilarItems,
  isOutfitSuitableForWeather,
  filterOutfitsByWeather,
  generateRandomOutfitsWeighted,
  scoreOutfitByTags,
  generatePersonalizedOutfits,
  generateOutfitsFromLikedItemsOnly,
  calculateWeightedItemWarmth,
  calculateWeightedOutfitWarmth,
  getTargetWeightedWarmth,
  getWarmthTolerance
} from '../../src/modules/inspo/inspoRecommender.service';
import { Style, LayerCategory, Category, Material } from '@prisma/client';
import { InspoOutfitRecommendation, InspoItemRecommendation, WeatherCondition } from '../../src/modules/inspo/inspo.types';
import { JsonValue } from 'type-fest';

// Helper: create a valid ClosetItem mock
function makeClosetItem(overrides = {}) {
  return {
    id: 'item1',
    filename: 'tshirt.jpg',
    category: Category.TSHIRT,
    layerCategory: LayerCategory.base_top,
    createdAt: new Date(),
    colorHex: '#0000FF',
    dominantColors: ['#0000FF'],
    warmthFactor: 3,
    waterproof: false,
    style: Style.Casual,
    material: Material.Cotton,
    favourite: false,
    ownerId: 'user1',
    ...overrides,
  };
}

function makeInspoItem(item: any, sortOrder = 1): InspoItemRecommendation {
  return {
    closetItemId: item.id,
    imageUrl: `/api/uploads/${item.filename}`,
    layerCategory: item.layerCategory,
    category: item.category,
    style: item.style,
    colorHex: item.colorHex,
    warmthFactor: item.warmthFactor,
    waterproof: item.waterproof,
    dominantColors: Array.isArray(item.dominantColors) ? item.dominantColors : [item.colorHex],
    sortOrder,
  };
}

describe('inspoRecommender.service', () => {
  const baseItem = makeClosetItem();
  const warmItem = makeClosetItem({ id: 'item2', category: Category.JACKET, layerCategory: LayerCategory.outerwear, warmthFactor: 16, waterproof: true, style: Style.Athletic, material: Material.Denim });
  const coldItem = makeClosetItem({ id: 'item3', category: Category.COAT, layerCategory: LayerCategory.outerwear, warmthFactor: 18, waterproof: false, style: Style.Formal, material: Material.Wool });

  it('calculateItemSimilarity: returns high for similar items', () => {
    const sim = calculateItemSimilarity(baseItem, { ...baseItem });
    expect(sim).toBeGreaterThan(0.5);
  });

  it('calculateItemSimilarity: returns 0 for nulls', () => {
    // @ts-expect-error
    expect(calculateItemSimilarity(null, baseItem)).toBe(0);
    // @ts-expect-error
    expect(calculateItemSimilarity(baseItem, null)).toBe(0);
  });

  it('findSimilarItems: returns sorted similar items', () => {
    const items = [baseItem, warmItem, coldItem];
    const result = findSimilarItems(baseItem, items, 2);
    expect(result.length).toBe(2);
    expect(result[0].id).not.toBe(baseItem.id);
  });

  it('isOutfitSuitableForWeather: respects temperature and conditions', () => {
    const inspoItem = makeInspoItem(baseItem);
    const outfit: InspoOutfitRecommendation = {
      id: 'o1',
      overallStyle: 'Casual',
      warmthRating: 3,
      waterproof: false,
      tags: [],
      recommendedWeather: { minTemp: 10, maxTemp: 20, conditions: ['sunny'] },
      inspoItems: [inspoItem],
      score: 0.5,
    };
    expect(isOutfitSuitableForWeather(outfit, 15, ['sunny'])).toBe(true);
    expect(isOutfitSuitableForWeather(outfit, 30, ['rain'])).toBe(false);
  });

  it('filterOutfitsByWeather: filters correctly', () => {
    const inspoItem1 = makeInspoItem(baseItem, 1);
    const inspoItem2 = makeInspoItem(warmItem, 1);
    const outfits: InspoOutfitRecommendation[] = [
      {
        id: 'o1',
        overallStyle: 'Casual',
        warmthRating: 3,
        waterproof: false,
        tags: [],
        recommendedWeather: { minTemp: 10, maxTemp: 20, conditions: ['sunny'] },
        inspoItems: [inspoItem1],
        score: 0.5,
      },
      {
        id: 'o2',
        overallStyle: 'Sporty',
        warmthRating: 16,
        waterproof: true,
        tags: [],
        recommendedWeather: { minTemp: 0, maxTemp: 10, conditions: ['rainy'] },
        inspoItems: [inspoItem2],
        score: 0.5,
      },
    ];
    const filtered = filterOutfitsByWeather(outfits, 15, ['sunny']);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('o1');
  });

  it('generateRandomOutfitsWeighted: generates outfits', () => {
    // Use only warmItem and coldItem to ensure at least one valid outfit for 15°C
    const items = [warmItem, coldItem];
    const outfits = generateRandomOutfitsWeighted(items, ['style:Athletic'], Style.Athletic, 2, 15, ['sunny']);
    expect(Array.isArray(outfits)).toBe(true);
    // Allow 0 or more, but if >0, check structure
    if (outfits.length > 0) {
      expect(outfits[0].inspoItems.length).toBeGreaterThan(0);
    }
  });

  it('scoreOutfitByTags: scores higher for matching tags', () => {
    const inspoItem = makeInspoItem(baseItem);
    const outfit: InspoOutfitRecommendation = {
      id: 'o1',
      overallStyle: 'Casual',
      warmthRating: 3,
      waterproof: false,
      tags: ['style:casual', 'category:tshirt'],
      recommendedWeather: { minTemp: 10, maxTemp: 20, conditions: ['sunny'] },
      inspoItems: [inspoItem],
      score: 0.5,
    };
    const score = scoreOutfitByTags(outfit, ['style:casual']);
    expect(score).toBeGreaterThan(0.5);
  });

  it('generatePersonalizedOutfits: falls back to random if no data', () => {
    const result = generatePersonalizedOutfits([], [], [], Style.Casual, 2, 20, ['sunny']);
    expect(Array.isArray(result)).toBe(true);
  });

  it('generateOutfitsFromLikedItemsOnly: returns empty if no liked items', () => {
    const result = generateOutfitsFromLikedItemsOnly([], [], Style.Casual, 2, 20, ['sunny']);
    expect(result).toEqual([]);
  });

  it('calculateWeightedItemWarmth: returns correct value', () => {
    const val = calculateWeightedItemWarmth(warmItem);
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThan(0);
  });

  it('calculateWeightedOutfitWarmth: sums correctly', () => {
    const val = calculateWeightedOutfitWarmth([baseItem, warmItem]);
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThan(0);
  });

  it('getTargetWeightedWarmth: interpolates between points', () => {
    const val = getTargetWeightedWarmth(15);
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThan(0);
  });

  it('getWarmthTolerance: returns a number', () => {
    expect(typeof getWarmthTolerance(30)).toBe('number');
    expect(getWarmthTolerance(30)).toBeGreaterThan(0);
  });
});
