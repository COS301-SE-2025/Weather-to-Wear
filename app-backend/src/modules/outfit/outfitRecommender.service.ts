/*

Still very MVP, improvements TODO:
- Warmth scoring: Is the total outfit warmth suitable for min/avg temp? (can use a basic range mapping.)
- Waterproof scoring: If willRain, reward/require at least one waterproof layer (e.g. shoes or outerwear).
- Optional layers: e.g. add headwear if sunny/cold and user owns it.
- Variety: Avoid recommending duplicate outfits or same items in every combo.
- Performance: For very large closets, you might want to limit the number of combinations (random sample, etc.).
*/


import { PrismaClient, ClosetItem, LayerCategory, Style } from '@prisma/client';
import { RecommendOutfitsRequest, OutfitRecommendation } from './outfit.types';
import {
    getFeatureVector,
    predictRatingKnn,
} from './itemItemKnn';

import tinycolor from 'tinycolor2';

const prisma = new PrismaClient();


export async function recommendOutfits(
    userId: string,
    req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {
    // fetch closet items for this user
    const closetItems = await prisma.closetItem.findMany({
        where: { ownerId: userId },
    });

    // fetch user preferences
    const userPref = await prisma.userPreference.findUnique({
        where: { userId }
    });


    const partitioned = partitionClosetByLayer(closetItems);

    const requiredLayers = getRequiredLayers(req.weatherSummary);


    const style: Style = (req.style as Style) || userPref?.style || Style.Casual;
    const rawCandidates = getCandidateOutfits(partitioned, requiredLayers, style);


    const preferredColors: string[] = Array.isArray(userPref?.preferredColours)
        ? userPref.preferredColours as string[]
        : [];

    const scored = rawCandidates.map(outfit => ({

        outfitItems: outfit.map(item => ({
            closetItemId: item.id,
            imageUrl: `/uploads/${item.filename}`,
            layerCategory: item.layerCategory,
            category: item.category,
            style: item.style ?? "Casual", // fallback, or assert not null
            colorHex: item.colorHex ?? "#000000", // fallback
            warmthFactor: item.warmthFactor ?? 5, // fallback to mid value
            waterproof: item.waterproof ?? false, // fallback to false
        })),
        overallStyle: style,
        score: scoreOutfit(outfit, preferredColors),
        // TODO: compute warmthRating, waterproof, etc.
        warmthRating: outfit.reduce((sum, item) => sum + (item.warmthFactor || 0), 0),
        waterproof: outfit.some(item => item.waterproof),
        weatherSummary: req.weatherSummary,
    }));

    scored.sort((a, b) => b.score - a.score);

    // ——— 1. Fetch user’s past rated outfits ———
    const past = await prisma.outfit.findMany({
        where: { userId, userRating: { not: null } },
        include: {
            outfitItems: { include: { closetItem: true } }
        }
    });

    // ——— 2. Build history vectors & ratings ———
    const historyVecs: number[][] = [];
    const historyRatings: number[] = [];
    for (const p of past) {
        // recreate an OutfitRecommendation-shaped object
        const fakeRec: OutfitRecommendation = {
            outfitItems: p.outfitItems.map(oi => ({
                closetItemId: oi.closetItemId,
                imageUrl: `/uploads/${oi.closetItem.filename}`,
                layerCategory: oi.layerCategory,
                category: oi.closetItem.category,
                style: oi.closetItem.style ?? Style.Casual,
                colorHex: oi.closetItem.colorHex ?? '#000000',
                warmthFactor: oi.closetItem.warmthFactor ?? 5,
                waterproof: oi.closetItem.waterproof ?? false,
            })),
            overallStyle: p.overallStyle,
            // add a score so TS is happy:
            score: p.userRating!,   // or just `0`
            warmthRating: p.warmthRating,
            waterproof: p.waterproof,
            weatherSummary: JSON.parse(p.weatherSummary || '{}'),
        };
        historyVecs.push(getFeatureVector(fakeRec));
        historyRatings.push(p.userRating!);
    }

    // ——— 3. Re-score via KNN & merge ———
    const augmented = scored.map(rec => {
        const baseScore = rec.score;
        if (historyRatings.length === 0) {
            // no history → keep rule score
            return { ...rec, finalScore: baseScore };
        }
        const fv = getFeatureVector(rec);
        const knnPred = predictRatingKnn(fv, historyVecs, historyRatings, 5);
        // blend: adjust alpha to taste (e.g. more KNN as you get more ratings)
        const alpha = 0.5;
        return { ...rec, finalScore: alpha * baseScore + (1 - alpha) * knnPred };
    });

    augmented.sort((a, b) => b.finalScore - a.finalScore);
    return augmented.slice(0, 5).map(({ finalScore, ...rest }) => rest);

    // return scored.slice(0, 5);
}

type PartitionedCloset = {
    [layerCategory: string]: ClosetItem[];
};

function partitionClosetByLayer(
    closetItems: ClosetItem[]
): PartitionedCloset {
    const partition: PartitionedCloset = {};
    for (const item of closetItems) {
        if (!partition[item.layerCategory]) {
            partition[item.layerCategory] = [];
        }
        partition[item.layerCategory].push(item);
    }
    return partition;
}

function getRequiredLayers(weather: { avgTemp: number; minTemp: number }): string[] {
    const required = ['base_top', 'base_bottom', 'footwear'];

    if (weather.avgTemp < 18 || weather.minTemp < 13) {
        required.push('mid_top'); // e.g. hoodie/sweater
    }
    if (weather.avgTemp < 12 || weather.minTemp < 10) {
        required.push('outerwear'); // e.g. jacket/raincoat
    }
    return required;
}

function getCandidateOutfits(
    partitioned: PartitionedCloset,
    requiredLayers: string[],
    style: Style
) {
    const layerChoices: ClosetItem[][] = requiredLayers.map(layer =>
        (partitioned[layer] || []).filter(item => item.style === style)
    );

    if (layerChoices.some(arr => arr.length === 0)) return [];


    function* combine(index = 0, current: ClosetItem[] = []): Generator<ClosetItem[]> {
        if (index === layerChoices.length) {
            yield current;
            return;
        }
        for (const item of layerChoices[index]) {
            if (current.find(i => i.id === item.id)) continue; // no duplicate
            yield* combine(index + 1, [...current, item]);
        }
    }

    const candidates = [...combine()];

    return candidates;
}

// Score/rank
function scoreOutfit(
    outfit: ClosetItem[],
    userPreferredColors: string[] = []
): number {
    let score = 0;

    const colors: string[] = outfit
        .map(item => item.colorHex)
        .filter((c): c is string => !!c);

    if (colors.length > 1) {
        let totalDistance = 0;
        for (let i = 0; i < colors.length; ++i) {
            for (let j = i + 1; j < colors.length; ++j) {
                const c1 = tinycolor(colors[i]).toHsl();
                const c2 = tinycolor(colors[j]).toHsl();
                totalDistance += Math.abs(c1.h - c2.h); 
            }
        }
        score += 10 - totalDistance / (colors.length - 1);
    }

    score += outfit.filter(item => userPreferredColors.includes(item.colorHex || '')).length * 2;


    return score;
}

export { partitionClosetByLayer, getRequiredLayers, getCandidateOutfits, scoreOutfit };
