import { getFeatureVector, cosineSimilarity, predictRatingKnn } from '../../src/modules/outfit/itemItemKnn';
import { Style } from '@prisma/client';

describe('predictRatingKnn smoke test', () => {
  it('should predict close to the high-rated neighbor', () => {
    // Two past outfits:
    //  • vecA = [1, 0], rating 5  
    //  • vecB = [0, 1], rating 1
    const historyVecs = [
      [1, 0],
      [0, 1],
    ];
    const historyRatings = [5, 1];

    // New candidate exactly matches vecA
    const query = [1, 0];
    const pred = predictRatingKnn(query, historyVecs, historyRatings, 2);

    // With equal k=2, the weighted average around mean=3 should lean toward 5.
    // mean = (5+1)/2 = 3 -> numerator = (1*(5−3) + 0*(1−3)) = 2 -> pred = 3 + 2/1 = 5
    expect(pred).toBeCloseTo(5, 5);
  });
});

describe('itemItemKnn', () => {
  const mockOutfit = {
    outfitItems: [
      { colorHex: '#ff0000', dominantColors: ['#ff0000'] },
      { colorHex: '#00ff00', dominantColors: ['#00ff00'] }
    ],
    overallStyle: Style.Casual,
    warmthRating: 10,
    waterproof: true,
    weatherSummary: { avgTemp: 15, minTemp: 8 }
  };

  it('getFeatureVector returns a numerical vector of expected length', () => {
    const vec = getFeatureVector(mockOutfit as any);
    expect(Array.isArray(vec)).toBe(true);
    expect(vec).toHaveLength(5 + Object.keys(Style).length); // 5 features + style one-hot
    expect(typeof vec[0]).toBe('number');
  });

  it('cosineSimilarity returns 1 for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });

  it('predictRatingKnn returns average rating when similarities are equal', () => {
    const query = [1, 1, 1, 1, 1, 0, 0, 0]; // padded to match real vector length
    const history = [
      [1, 1, 1, 1, 1, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 0, 0]
    ];
    const ratings = [3, 5];
    const predicted = predictRatingKnn(query, history, ratings, 2);
    expect(predicted).toBeCloseTo(4); // average
  });
});