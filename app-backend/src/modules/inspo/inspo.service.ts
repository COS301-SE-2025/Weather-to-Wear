import { PrismaClient, OverallStyle, LayerCategory, Style } from '@prisma/client';
import { getFeatureVector, predictRatingKnn, cosineSimilarity } from '../outfit/itemItemKnn';
import { 
  partitionClosetByLayer, 
  getRequiredLayers, 
  getCandidateOutfits, 
  scoreOutfit 
} from '../outfit/outfitRecommender.service';
import { 
  calculateItemSimilarity,
  findSimilarItems,
  filterOutfitsByWeather,
  generateRandomOutfits,
  generatePersonalizedOutfits,
  isOutfitSuitableForWeather,
  scoreOutfitByTags,
  generateOutfitsFromLikedItemsOnly
} from './inspoRecommender.service';
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

// Store a liked outfit (multiple items from a social media post)
export async function storeLikedOutfit(userId: string, clothingItems: any[]): Promise<void> {
  if (!clothingItems || clothingItems.length === 0) {
    return;
  }

  // Extract all tags from all clothing items
  const allTags = clothingItems.flatMap(item => extractTagsFromItem(item));
  
  // Calculate overall warmth and waterproof status
  const totalWarmth = clothingItems.reduce((sum, item) => 
    sum + (item.warmthFactor || 5), 0
  );
  const avgWarmth = Math.round(totalWarmth / clothingItems.length);
  const hasWaterproof = clothingItems.some(item => item.waterproof);
  
  // Determine overall style (most common style)
  const styles = clothingItems
    .map(item => item.style)
    .filter(style => style);
  
  const styleCounts = styles.reduce((acc, style) => {
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonStyle = Object.keys(styleCounts).length > 0
    ? Object.keys(styleCounts).reduce((a, b) => styleCounts[a] > styleCounts[b] ? a : b)
    : 'Casual';
  
  // Calculate weather recommendations
  const weatherRec = calculateWeatherRecommendations(avgWarmth, hasWaterproof);
  
  // Store as inspiration outfit
  await prisma.inspoOutfit.create({
    data: {
      userId,
      warmthRating: avgWarmth,
      waterproof: hasWaterproof,
      overallStyle: (mostCommonStyle as OverallStyle) || OverallStyle.Casual,
      tags: [...new Set(allTags)], // Remove duplicates
      recommendedWeatherMin: weatherRec.minTemp,
      recommendedWeatherMax: weatherRec.maxTemp,
      recommendedConditions: weatherRec.conditions,
      inspoItems: {
        create: clothingItems.map((item, index) => ({
          closetItemId: item.id,
          layerCategory: item.layerCategory,
          sortOrder: index + 1
        }))
      }
    }
  });
}

// Store a liked item and its tags
export async function storeLikedItem(userId: string, closetItemId: string): Promise<void> {
  try {
    // Check if the item exists and belongs to the user
    const closetItem = await prisma.closetItem.findUnique({
      where: { id: closetItemId },
      include: { owner: true }
    });
    
    if (!closetItem) {
      throw new Error('Closet item not found');
    }
    
    // Check if this item has already been liked
    const existingLike = await prisma.inspoOutfit.findFirst({
      where: {
        userId,
        inspoItems: {
          some: {
            closetItemId
          }
        }
      }
    });
    
    if (existingLike) {
      // Item is already liked, no need to create a duplicate
      return;
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
    
    console.log(`Successfully liked item ${closetItemId} for user ${userId}`);
  } catch (error) {
    console.error(`Error liking item ${closetItemId}:`, error);
    throw error; // Re-throw for the controller to handle
  }
}

// Calculate weather recommendations based on outfit warmth
function calculateWeatherRecommendations(warmthRating: number, waterproof: boolean): WeatherCondition {
  let minTemp: number;
  let maxTemp: number;
  const conditions: string[] = [];
  
  // Temperature recommendations based on warmth rating
  if (warmthRating >= 20) {
    minTemp = -10;
    maxTemp = 5; // Reduced max temp for very warm items
    conditions.push('cold', 'freezing');
  } else if (warmthRating >= 15) {
    minTemp = -5;
    maxTemp = 10; // Reduced max temp for warm items
    conditions.push('cool', 'cold');
  } else if (warmthRating >= 10) {
    minTemp = 5;
    maxTemp = 15; // Reduced max temp for medium warmth items
    conditions.push('mild', 'cool');
  } else if (warmthRating >= 5) {
    minTemp = 15;
    maxTemp = 25; // More reasonable max temp for light items
    conditions.push('warm', 'mild');
  } else {
    minTemp = 20;
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

// Generate temporary inspiration outfit recommendations based on liked items
// NOTE: These are NOT stored in the database - they are temporary recommendations that replace previous ones
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
  
  // CRITICAL FIX: Inspo recommendations should ONLY use explicitly liked items from social posts
  // NO relation to user's personal closet or outfits whatsoever!
  
  console.log(`Found ${likedItems.length} total liked inspo outfits for user ${userId}`);
  
  if (likedItems.length === 0) {
    // No liked items from social posts - return empty with clear message
    console.log('No liked items available for inspo generation - user needs to like items from social feed');
    return [];
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
  
  // Use existing recommendation logic but filter based on liked tags
  const userPref = await prisma.userPreference.findUnique({ where: { userId } });
  const preferredStyle = request.styleFilter ? 
    (request.styleFilter as Style) : 
    (userPref?.style || Style.Casual);
  
  // Determine if we should use legacy outfit generation or our new recommendation system
  let recommendations: InspoOutfitRecommendation[] = [];
  
  // First try with the new inspoRecommender service for more personalized results
  try {
    // Extract the closet items from the liked outfits
    let likedClosetItems = likedItems.flatMap(outfit => 
      outfit.inspoItems.map(item => item.closetItem)
    );
    
    // CRITICAL FIX: Remove items that belong to the current user
    // Inspo should ONLY use items from OTHER users' posts, never your own closet items
    const beforeOwnFilter = likedClosetItems.length;
    likedClosetItems = likedClosetItems.filter(item => 
      item && item.ownerId !== userId
    );
    console.log(`Filtered out ${beforeOwnFilter - likedClosetItems.length} own items, ${likedClosetItems.length} items from others remaining`);
    
    // Remove duplicates to prevent bias toward frequently liked items
    likedClosetItems = likedClosetItems.filter((item, index, self) =>
      index === self.findIndex((i) => i.id === item.id)
    );
    
    // CRITICAL: Remove any null/undefined items
    likedClosetItems = likedClosetItems.filter(item => !!item);
    
    // Randomize the order to ensure different combinations on each generation
    likedClosetItems = likedClosetItems.sort(() => Math.random() - 0.5);
    
    if (likedClosetItems.length > 0) {
      console.log(`Generating outfits based on ${likedClosetItems.length} liked items from OTHER users (excluding own items)`);
      
      // Extract weather information from request
      const avgTemp = request.weatherFilter?.minTemp && request.weatherFilter?.maxTemp 
        ? (request.weatherFilter.minTemp + request.weatherFilter.maxTemp) / 2
        : undefined;
      const conditions = request.weatherFilter?.conditions || [];
      
      // CRITICAL FIX: ONLY use liked items from OTHER users, NOT the user's personal closet
      // Generate outfits directly from these external liked items
      recommendations = generateOutfitsFromLikedItemsOnly(
        likedClosetItems,
        topTags,
        preferredStyle,
        Math.min(5, request.limit || 5),
        avgTemp,
        conditions
      );
    } else {
      // If no liked items from other users, display a clear message
      console.log('No liked items from other users available for inspo generation - user needs to like items from other users posts');
      return []; // Return empty array, front-end will show the prompt to like items from others
    }
  } catch (err) {
    console.error('Error generating outfits with inspoRecommender:', err);
    // Fall back to legacy outfit generation if the new method fails
  }
  
  // If we couldn't generate any recommendations with the new method, 
  // we should not fall back to using the user's personal closet items
  if (recommendations.length === 0) {
    console.log('No recommendations could be generated from liked items from other users');
    // Return empty array - inspo should never use personal closet items
    return [];
    }
  
  // Before filtering, make sure we have recommendations
  if (recommendations.length === 0) {
    // No recommendations could be generated, return empty array with a message for frontend
    console.log('No inspiration outfits could be generated. The user should like more items.');
    return [];
  }
  
  // Apply weather filtering with debugging
  console.log(`Generated ${recommendations.length} recommendations before weather filtering`);
  const filteredRecommendations = applyWeatherFilter(recommendations, request);
  console.log(`${filteredRecommendations.length} recommendations after weather filtering`);
  
  if (filteredRecommendations.length === 0 && recommendations.length > 0) {
    console.log('Weather filtering removed all recommendations. Filter criteria:', JSON.stringify(request.weatherFilter));
    // Log the first few recommendations that were filtered out for debugging
    recommendations.slice(0, 2).forEach((rec, index) => {
      console.log(`Filtered out recommendation ${index + 1}:`, {
        id: rec.id,
        warmthRating: rec.warmthRating,
        recommendedWeather: rec.recommendedWeather,
        items: rec.inspoItems.map(item => ({
          category: item.category,
          layerCategory: item.layerCategory,
          warmthFactor: item.warmthFactor
        }))
      });
    });
  }
  
  return filteredRecommendations;
}

// Helper function to apply weather filtering
function applyWeatherFilter(
  recommendations: InspoOutfitRecommendation[], 
  request: GenerateInspoRequest
): InspoOutfitRecommendation[] {
  // Apply weather filtering if requested
  if (request.weatherFilter) {
    const { weatherFilter } = request;
    const filtered = recommendations.filter(rec => {
      const { recommendedWeather } = rec;
      
      // Make temperature filtering more lenient - allow some overlap
      if (weatherFilter.minTemp !== undefined && recommendedWeather.maxTemp < (weatherFilter.minTemp - 5)) {
        return false;
      }
      if (weatherFilter.maxTemp !== undefined && recommendedWeather.minTemp > (weatherFilter.maxTemp + 5)) {
        return false;
      }
      
      // Make condition filtering more lenient - if no conditions specified, allow all
      if (weatherFilter.conditions && weatherFilter.conditions.length > 0) {
        const hasMatchingCondition = weatherFilter.conditions.some(condition => 
          recommendedWeather.conditions.includes(condition)
        );
        // Also allow generic conditions like 'sunny' and 'cloudy' as fallbacks
        const hasGenericMatch = recommendedWeather.conditions.some(condition => 
          ['sunny', 'cloudy'].includes(condition)
        );
        if (!hasMatchingCondition && !hasGenericMatch) return false;
      }
      
      return true;
    });
    
    return filtered.slice(0, request.limit || 5);
  }
  
  // Return exactly the requested number of recommendations (max 5)
  return recommendations.slice(0, request.limit || 5);
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
  
  if (!inspoOutfits || inspoOutfits.length === 0) {
    return []; // Return empty array instead of throwing error
  }
  
  return inspoOutfits.map((outfit: any) => ({
    id: outfit.id,
    overallStyle: outfit.overallStyle,
    warmthRating: outfit.warmthRating,
    waterproof: outfit.waterproof,
    tags: outfit.tags || [],
    recommendedWeather: {
      minTemp: outfit.recommendedWeatherMin || 15,
      maxTemp: outfit.recommendedWeatherMax || 25,
      conditions: outfit.recommendedConditions || []
    },
    score: 0, // Not applicable for stored outfits
    inspoItems: outfit.inspoItems
      .filter((item: any) => item.closetItem) // Filter out items where closetItem is null
      .map((item: any) => ({
        closetItemId: item.closetItemId,
        imageUrl: item.closetItem.filename ? `/api/uploads/${item.closetItem.filename}` : '',
        layerCategory: item.layerCategory,
        category: item.closetItem.category || '',
        style: item.closetItem.style?.toString() || undefined,
        colorHex: item.closetItem.colorHex || undefined,
        warmthFactor: item.closetItem.warmthFactor || undefined,
        waterproof: item.closetItem.waterproof || undefined,
        dominantColors: Array.isArray(item.closetItem.dominantColors)
          ? (item.closetItem.dominantColors as string[])
          : (item.closetItem.colorHex ? [item.closetItem.colorHex] : ['#000000']),
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
