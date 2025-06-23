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

import tinycolor from 'tinycolor2';

// Use the same Prisma instantiation style as outfit.service.ts:
const prisma = new PrismaClient();

/**
 * Main entry point for the recommendation engine.
 * @param userId Authenticated user's ID
 * @param req   The request body for recommendations
 * @returns     Array of recommended outfits (not saved to DB)
 */
export async function recommendOutfits(
    userId: string,
    req: RecommendOutfitsRequest
): Promise<OutfitRecommendation[]> {
    // fetch closet items for this user
    const closetItems = await prisma.closetItem.findMany({
        where: { ownerId: userId }
    });

    // fetch user preferences
    const userPref = await prisma.userPreference.findUnique({
        where: { userId }
    });

    // 3. (Optional) Fetch event details if provided
    // -- You can fetch and use event logic here if req.eventId is present.

    // 4. TODO: Implement logic to partition closet items, build outfit candidates,
    //          score/rank, and select top 3-5 recommendations.
    // Step 1: Partition closet
    const partitioned = partitionClosetByLayer(closetItems);

    // Step 2: Decide layers
    const requiredLayers = getRequiredLayers(req.weatherSummary);

    // Step 3: Build candidate outfits (use style from req or user pref)
    // const style = req.style || userPref?.style || 'Casual';
    const style: Style = (req.style as Style) || userPref?.style || Style.Casual;
    const rawCandidates = getCandidateOutfits(partitioned, requiredLayers, style);

    // Step 4: Score outfits
    // const preferredColors: string[] = userPref?.preferredColours ?? [];
    const preferredColors: string[] = Array.isArray(userPref?.preferredColours)
        ? userPref.preferredColours as string[]
        : [];

    const scored = rawCandidates.map(outfit => ({
        outfitItems: outfit.map(item => ({
            closetItemId: item.id,
            layerCategory: item.layerCategory,
            category: item.category,
            style: item.style,
            colorHex: item.colorHex,
            warmthFactor: item.warmthFactor,
            waterproof: item.waterproof,
        })),
        overallStyle: style,
        score: scoreOutfit(outfit, preferredColors),
        // TODO: compute warmthRating, waterproof, etc.
        warmthRating: outfit.reduce((sum, item) => sum + (item.warmthFactor || 0), 0),
        waterproof: outfit.some(item => item.waterproof),
        weatherSummary: req.weatherSummary,
    }));

    // Sort and return top 3–5 unique outfits
    scored.sort((a, b) => b.score - a.score);

    // 5. For now, return an empty array as a placeholder
    return [];
}

// Partition closet items 
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

// Get candidate outfits
function getCandidateOutfits(
    partitioned: PartitionedCloset,
    requiredLayers: string[],
    style: Style
) {
    // Start with all items that match the requested style
    const layerChoices: ClosetItem[][] = requiredLayers.map(layer =>
        (partitioned[layer] || []).filter(item => item.style === style)
    );

    // If any required layer has no options, no valid outfit can be built
    if (layerChoices.some(arr => arr.length === 0)) return [];

    // Now, produce every combination (Cartesian product) of those choices
    // (In real life, you'd optimize or random-sample if N is huge)
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

    // Build raw candidate outfits (array of ClosetItem[])
    const candidates = [...combine()];

    return candidates;
}

// Score/rank
function scoreOutfit(
    outfit: ClosetItem[],
    userPreferredColors: string[] = []
): number {
    let score = 0;

    // 1. Reward if colors are close together or complementary
    //    (Simple: average color distance in HSL/HSV)

    // const colors = outfit.map(item => item.colorHex).filter(Boolean);
    const colors: string[] = outfit
        .map(item => item.colorHex)
        .filter((c): c is string => !!c);

    if (colors.length > 1) {
        let totalDistance = 0;
        for (let i = 0; i < colors.length; ++i) {
            for (let j = i + 1; j < colors.length; ++j) {
                const c1 = tinycolor(colors[i]).toHsl();
                const c2 = tinycolor(colors[j]).toHsl();
                totalDistance += Math.abs(c1.h - c2.h); // crude, just as a start
            }
        }
        // Less distance == better harmony
        score += 10 - totalDistance / (colors.length - 1);
    }

    // 2. Reward items in user's preferred colors
    score += outfit.filter(item => userPreferredColors.includes(item.colorHex || '')).length * 2;

    // 3. You can add other rules for warmth, waterproof, etc. later

    return score;
}
