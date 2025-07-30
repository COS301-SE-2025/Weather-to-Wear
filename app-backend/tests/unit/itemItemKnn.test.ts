import { predictRatingKnn } from '../../src/modules/outfit/itemItemKnn';

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
