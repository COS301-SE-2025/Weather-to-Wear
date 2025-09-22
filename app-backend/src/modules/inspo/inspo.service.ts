import { PrismaClient, OverallStyle, LayerCategory, Style } from '@prisma/client';
import { getFeatureVector, predictRatingKnn, cosineSimilarity } from '../outfit/itemItemKnn';
import { 
  partitionClosetByLayer, 
  getRequiredLayers, 
  getCandidateOutfits, 
  scoreOutfit 
} from '../outfit/outfitRecommender.service';
import { 
  InspoOutfitRecommendation, 
  GenerateInspoRequest, 
  WeatherCondition,
  LikedItem 
} from './inspo.types';
import tinycolor from 'tinycolor2';

const prisma = new PrismaClient();

// Helper function to extract tags from a closet item
function extractTagsFromItem(item: any): string[] {
  const tags: string[] = [];
  
  if (item.style) tags.push(`style:${item.style.toLowerCase()}`);
  if (item.category) tags.push(`category:${item.category.toLowerCase()}`);
  if (item.material) tags.push(`material:${item.material.toLowerCase()}`);
  if (item.colorHex) {
    const color = tinycolor(item.colorHex);
    const hsl = color.toHsl();
    
    // Add color-based tags
    if (hsl.l > 0.8) tags.push('color:light');
    else if (hsl.l < 0.3) tags.push('color:dark');
    else tags.push('color:medium');
    
    if (hsl.s > 0.5) tags.push('color:saturated');
    else tags.push('color:muted');
    
    // Add basic color name
    const colorName = color.toName() || 'unknown';
    if (colorName !== 'unknown') tags.push(`color:${colorName}`);
  }
  
  if (item.warmthFactor) {
    if (item.warmthFactor >= 8) tags.push('warmth:high');
    else if (item.warmthFactor >= 5) tags.push('warmth:medium');
    else tags.push('warmth:low');
  }
  
  if (item.waterproof) tags.push('feature:waterproof');
  if (item.layerCategory) tags.push(`layer:${item.layerCategory}`);
  
  return tags;
}

// Store a liked item and its tags
export async function storeLikedItem(userId: string, closetItemId: string): Promise<void> {
  const closetItem = await prisma.closetItem.findUnique({
    where: { id: closetItemId },
    include: { owner: true }
  });
  
  if (!closetItem || closetItem.ownerId !== userId) {
    throw new Error('Closet item not found or access denied');
  }
  
  const tags = extractTagsFromItem(closetItem);
  
  // Calculate weather recommendations based on this single item
  const weatherRec = calculateWeatherRecommendations(
    closetItem.warmthFactor || 5, 
    closetItem.waterproof || false
  );
  
  // Store liked item as individual InspoOutfit with single item
  await prisma.inspoOutfit.create({
    data: {
      userId,
      warmthRating: closetItem.warmthFactor || 5,
      waterproof: closetItem.waterproof || false,
      overallStyle: (closetItem.style as OverallStyle) || OverallStyle.Casual,
      tags,
      recommendedWeatherMin: weatherRec.minTemp,
      recommendedWeatherMax: weatherRec.maxTemp,
      recommendedConditions: weatherRec.conditions,
      inspoItems: {
        create: [{
          closetItemId,
          layerCategory: closetItem.layerCategory,
          sortOrder: 1
        }]
      }
    }
  });
}

// Calculate weather recommendations based on outfit warmth
function calculateWeatherRecommendations(warmthRating: number, waterproof: boolean): WeatherCondition {
  let minTemp: number;
  let maxTemp: number;
  const conditions: string[] = [];
  
  // Temperature recommendations based on warmth rating
  if (warmthRating >= 20) {
    minTemp = -10;
    maxTemp = 10;
    conditions.push('cold', 'freezing');
  } else if (warmthRating >= 15) {
    minTemp = 0;
    maxTemp = 15;
    conditions.push('cool', 'cold');
  } else if (warmthRating >= 10) {
    minTemp = 10;
    maxTemp = 25;
    conditions.push('mild', 'cool');
  } else if (warmthRating >= 5) {
    minTemp = 18;
    maxTemp = 30;
    conditions.push('warm', 'mild');
  } else {
    minTemp = 25;
    maxTemp = 40;
    conditions.push('hot', 'warm');
  }
  
  // Add weather conditions
  conditions.push('sunny', 'cloudy');
  if (waterproof) {
    conditions.push('rainy', 'drizzle');
  }
  
  return { minTemp, maxTemp, conditions };
}

// Generate inspiration outfits based on liked items
export async function generateInspoOutfits(
  userId: string, 
  request: GenerateInspoRequest
): Promise<InspoOutfitRecommendation[]> {
  
  // Get user's liked items (stored as inspo outfits)
  const likedItems = await prisma.inspoOutfit.findMany({
    where: { userId },
    include: {
      inspoItems: {
        include: {
          closetItem: true
        }
      }
    }
  });
  
  if (likedItems.length === 0) {
    // Fallback: use highly rated outfits as inspiration
    const userOutfits = await prisma.outfit.findMany({
      where: { 
        userId,
        userRating: { gte: 4 } // Only well-rated outfits
      },
      include: {
        outfitItems: {
          include: {
            closetItem: true
          }
        }
      },
      orderBy: { userRating: 'desc' },
      take: 10
    });

    if (userOutfits.length === 0) {
      throw new Error('No liked items or highly rated outfits found. Like some items or rate some outfits highly first to generate inspiration.');
    }

    // Convert existing outfits to inspiration format
    const recommendations: InspoOutfitRecommendation[] = userOutfits.map((outfit) => {
      const totalWarmth = outfit.outfitItems.reduce((sum, item) => 
        sum + (item.closetItem.warmthFactor || 0), 0
      );
      const hasWaterproof = outfit.outfitItems.some(item => 
        item.closetItem.waterproof
      );
      
      const weatherRec = calculateWeatherRecommendations(totalWarmth, hasWaterproof);
      
      // Extract tags from outfit items
      const tags = outfit.outfitItems.flatMap(item => 
        extractTagsFromItem(item.closetItem)
      );

      return {
        id: `inspiration-${outfit.id}`,
        overallStyle: outfit.overallStyle,
        warmthRating: totalWarmth,
        waterproof: hasWaterproof,
        tags: [...new Set(tags)], // Remove duplicates
        recommendedWeather: weatherRec,
        score: outfit.userRating || 0,
        inspoItems: outfit.outfitItems.map((item) => ({
          closetItemId: item.closetItemId,
          imageUrl: item.closetItem.filename ? `/api/uploads/${item.closetItem.filename}` : '',
          layerCategory: item.layerCategory,
          category: item.closetItem.category,
          style: item.closetItem.style?.toString(),
          colorHex: item.closetItem.colorHex || undefined,
          warmthFactor: item.closetItem.warmthFactor || undefined,
          waterproof: item.closetItem.waterproof || undefined,
          dominantColors: Array.isArray(item.closetItem.dominantColors)
            ? (item.closetItem.dominantColors as string[])
            : [item.closetItem.colorHex || '#000000'],
          sortOrder: item.sortOrder
        }))
      };
    });

    return applyWeatherFilter(recommendations, request);
  }
  
  // Extract all tags from liked items
  const allTags = likedItems.flatMap((outfit: any) => outfit.tags);
  const tagFrequency = allTags.reduce((acc: Record<string, number>, tag: string) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  
  // Get most common tags (user preferences)
  const topTags = Object.entries(tagFrequency)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([tag]) => tag);
  
  // Get all user's closet items
  const allClosetItems = await prisma.closetItem.findMany({
    where: { ownerId: userId }
  });
  
  // Use existing recommendation logic but filter based on liked tags
  const userPref = await prisma.userPreference.findUnique({ where: { userId } });
  const preferredStyle = request.styleFilter ? 
    (request.styleFilter as Style) : 
    (userPref?.style || Style.Casual);
  
  // Create synthetic weather for outfit generation (we'll override this later)
  const syntheticWeather = { avgTemp: 20, minTemp: 15, willRain: false };
  
  // Partition closet by layer
  const partitioned = partitionClosetByLayer(allClosetItems);
  const requiredLayers = ['base_top', 'base_bottom', 'footwear']; // Basic layers
  
  // Get candidate outfits
  const rawCandidates = getCandidateOutfits(
    partitioned, 
    requiredLayers, 
    preferredStyle, 
    syntheticWeather
  );
  
  // Score outfits based on how well they match liked item tags
  const scoredOutfits = rawCandidates.map(outfit => {
    const outfitTags = outfit.flatMap(item => extractTagsFromItem(item));
    
    // Calculate similarity to liked tags
    const tagMatchScore = outfitTags.reduce((score, tag) => {
      return score + (tagFrequency[tag] || 0);
    }, 0);
    
    // Calculate warmth and waterproof
    const totalWarmth = outfit.reduce((sum, item) => sum + (item.warmthFactor || 0), 0);
    const hasWaterproof = outfit.some(item => item.waterproof);
    
    return {
      items: outfit,
      score: tagMatchScore,
      warmthRating: totalWarmth,
      waterproof: hasWaterproof,
      tags: [...new Set(outfitTags)] // Remove duplicates
    };
  });
  
  // Sort by score and take top results
  const topOutfits = scoredOutfits
    .sort((a, b) => b.score - a.score)
    .slice(0, request.limit || 20);
  
  // Convert to InspoOutfitRecommendation format
  const recommendations: InspoOutfitRecommendation[] = topOutfits.map((outfit, index) => {
    const weatherRec = calculateWeatherRecommendations(outfit.warmthRating, outfit.waterproof);
    
    return {
      id: `generated-${index}`,
      overallStyle: preferredStyle,
      warmthRating: outfit.warmthRating,
      waterproof: outfit.waterproof,
      tags: outfit.tags,
      recommendedWeather: weatherRec,
      score: outfit.score,
      inspoItems: outfit.items.map((item, itemIndex) => ({
        closetItemId: item.id,
        imageUrl: item.filename ? `/api/uploads/${item.filename}` : '',
        layerCategory: item.layerCategory,
        category: item.category,
        style: item.style?.toString(),
        colorHex: item.colorHex || undefined,
        warmthFactor: item.warmthFactor || undefined,
        waterproof: item.waterproof || undefined,
        dominantColors: Array.isArray(item.dominantColors) 
          ? (item.dominantColors as string[])
          : [item.colorHex || '#000000'],
        sortOrder: itemIndex + 1
      }))
    };
  });
  
  return applyWeatherFilter(recommendations, request);
}

// Helper function to apply weather filtering
function applyWeatherFilter(
  recommendations: InspoOutfitRecommendation[], 
  request: GenerateInspoRequest
): InspoOutfitRecommendation[] {
  // Apply weather filtering if requested
  if (request.weatherFilter) {
    const { weatherFilter } = request;
    return recommendations.filter(rec => {
      const { recommendedWeather } = rec;
      
      if (weatherFilter.minTemp !== undefined && recommendedWeather.maxTemp < weatherFilter.minTemp) {
        return false;
      }
      if (weatherFilter.maxTemp !== undefined && recommendedWeather.minTemp > weatherFilter.maxTemp) {
        return false;
      }
      if (weatherFilter.conditions) {
        const hasMatchingCondition = weatherFilter.conditions.some(condition => 
          recommendedWeather.conditions.includes(condition)
        );
        if (!hasMatchingCondition) return false;
      }
      
      return true;
    });
  }
  
  return recommendations.slice(0, request.limit || 10);
}

// Get all stored inspo outfits for a user
export async function getUserInspoOutfits(userId: string): Promise<InspoOutfitRecommendation[]> {
  const inspoOutfits = await prisma.inspoOutfit.findMany({
    where: { userId },
    include: {
      inspoItems: {
        include: {
          closetItem: true
        },
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return inspoOutfits.map((outfit: any) => ({
    id: outfit.id,
    overallStyle: outfit.overallStyle,
    warmthRating: outfit.warmthRating,
    waterproof: outfit.waterproof,
    tags: outfit.tags,
    recommendedWeather: {
      minTemp: outfit.recommendedWeatherMin || 15,
      maxTemp: outfit.recommendedWeatherMax || 25,
      conditions: outfit.recommendedConditions || []
    },
    score: 0, // Not applicable for stored outfits
    inspoItems: outfit.inspoItems.map((item: any) => ({
      closetItemId: item.closetItemId,
      imageUrl: item.closetItem.filename ? `/api/uploads/${item.closetItem.filename}` : '',
      layerCategory: item.layerCategory,
      category: item.closetItem.category,
      style: item.closetItem.style?.toString(),
      colorHex: item.closetItem.colorHex || undefined,
      warmthFactor: item.closetItem.warmthFactor || undefined,
      waterproof: item.closetItem.waterproof || undefined,
      dominantColors: Array.isArray(item.closetItem.dominantColors)
        ? (item.closetItem.dominantColors as string[])
        : [item.closetItem.colorHex || '#000000'],
      sortOrder: item.sortOrder
    }))
  }));
}

// Delete an inspo outfit
export async function deleteInspoOutfit(userId: string, inspoOutfitId: string): Promise<void> {
  const outfit = await prisma.inspoOutfit.findUnique({
    where: { id: inspoOutfitId }
  });
  
  if (!outfit || outfit.userId !== userId) {
    throw new Error('Inspo outfit not found or access denied');
  }
  
  await prisma.inspoItem.deleteMany({
    where: { inspoOutfitId }
  });
  
  await prisma.inspoOutfit.delete({
    where: { id: inspoOutfitId }
  });
}
