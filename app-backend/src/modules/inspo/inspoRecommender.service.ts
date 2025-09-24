// src/modules/inspo/inspoRecommender.service.ts
import { ClosetItem, LayerCategory, Style } from '@prisma/client';
import { InspoOutfitRecommendation, InspoItemRecommendation, WeatherCondition } from './inspo.types';

// Calculate similarity between two items based on their features
export function calculateItemSimilarity(itemA: ClosetItem, itemB: ClosetItem): number {
  // Safety check for null/undefined items
  if (!itemA || !itemB) {
    return 0; // No similarity if either item is missing
  }
  
  // Start with a base similarity score
  let similarity = 0;
  
  // Category match is very important (max score: 0.3)
  if (itemA.category === itemB.category && itemA.category) {
    similarity += 0.3;
  }
  
  // Layer category match is critical for proper outfit construction (max score: 0.3)
  if (itemA.layerCategory === itemB.layerCategory) {
    similarity += 0.3;
  }
  
  // Style match contributes to visual coherence (max score: 0.2)
  if (itemA.style === itemB.style && itemA.style) {
    similarity += 0.2;
  }
  
  // Material match can indicate similar use cases (max score: 0.1)
  if (itemA.material === itemB.material && itemA.material) {
    similarity += 0.1;
  }
  
  // Warmth factor similarity (max score: 0.05)
  const warmthA = itemA.warmthFactor || 5;
  const warmthB = itemB.warmthFactor || 5;
  const warmthDiff = Math.abs(warmthA - warmthB);
  similarity += Math.max(0, 0.05 * (1 - (warmthDiff / 10)));
  
  // Waterproof similarity (max score: 0.05)
  if (itemA.waterproof === itemB.waterproof) {
    similarity += 0.05;
  }

  return similarity;
}

// Find similar items to a reference item using KNN logic
export function findSimilarItems(referenceItem: ClosetItem, candidateItems: ClosetItem[], k = 5): ClosetItem[] {
  // Safety checks for null/undefined inputs
  if (!referenceItem) {
    console.error('findSimilarItems: Reference item is null or undefined');
    return [];
  }
  
  if (!candidateItems || !Array.isArray(candidateItems) || candidateItems.length === 0) {
    console.error('findSimilarItems: No candidate items provided');
    return [];
  }
  
  // Calculate similarity scores for all candidate items
  const scoredItems = candidateItems
    .filter(item => item && item.id && item.id !== referenceItem.id) // Ensure item is valid and exclude the reference item itself
    .map(item => ({
      item,
      similarity: calculateItemSimilarity(referenceItem, item)
    }));
  
  // Sort by similarity (descending) and take top k
  return scoredItems
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
    .map(scored => scored.item);
}

// Check if an outfit is appropriate for given weather
export function isOutfitSuitableForWeather(
  outfit: InspoOutfitRecommendation, 
  temperature: number, 
  weatherConditions: string[]
): boolean {
  // Check temperature suitability
  const tempSuitable = temperature >= outfit.recommendedWeather.minTemp && 
                      temperature <= outfit.recommendedWeather.maxTemp;
  
  // More strict checks for warmth-to-temperature matching
  const isHotWeather = temperature > 25 || weatherConditions.includes('hot');
  const isWarmWeather = temperature > 20 || weatherConditions.includes('warm');
  const isVeryHotWeather = temperature > 30;
  
  // CRITICAL FIX: More aggressive filtering for warm weather
  // For temperatures >20°C, prevent any items with warmth >= 6
  if (temperature > 20) {
    const hasWarmItems = outfit.inspoItems.some(item => (item.warmthFactor || 0) >= 6);
    if (hasWarmItems) {
      return false;
    }
  }
  
  // For temperatures >25°C, prevent any items with warmth >= 5  
  if (temperature > 25) {
    const hasModerateWarmItems = outfit.inspoItems.some(item => (item.warmthFactor || 0) >= 5);
    if (hasModerateWarmItems) {
      return false;
    }
  }
  
  // For temperatures >30°C, prevent any items with warmth >= 4
  if (temperature > 30) {
    const hasAnyWarmItems = outfit.inspoItems.some(item => (item.warmthFactor || 0) >= 4);
    if (hasAnyWarmItems) {
      return false;
    }
  }
  
  // CRITICAL FIX: Explicit category-based filtering for warm weather
  // For temperatures >20°C, block specific categories regardless of warmth factor
  if (temperature > 20) {
    const hasInappropriateItems = outfit.inspoItems.some(item => {
      const category = item.category?.toLowerCase() || '';
      const layer = item.layerCategory;
      
      // Block all outerwear and mid-layer items
      if (layer === 'outerwear' || layer === 'mid_top') return true;
      
      // Block specific categories by name
      if (category.includes('hoodie') || category.includes('sweater') || 
          category.includes('sweatshirt') || category.includes('jacket') || 
          category.includes('coat') || category.includes('cardigan') ||
          category.includes('blazer')) return true;
      
      return false;
    });
    
    if (hasInappropriateItems) {
      console.log('Outfit blocked due to inappropriate warm-weather items');
      return false;
    }
  }
  
  // Check conditions match
  let conditionMatch = false;
  
  // If it's raining, outfit should be waterproof
  if (weatherConditions.includes('rain') || weatherConditions.includes('drizzle')) {
    conditionMatch = outfit.waterproof;
  } else {
    // For other conditions, just consider it a match if we have any overlap
    conditionMatch = weatherConditions.some(condition => 
      outfit.recommendedWeather.conditions.includes(condition)
    );
  }
  
  return tempSuitable && conditionMatch;
}

// Filter outfits by weather conditions
export function filterOutfitsByWeather(
  outfits: InspoOutfitRecommendation[], 
  temperature: number, 
  conditions: string[] = []
): InspoOutfitRecommendation[] {
  return outfits.filter(outfit => isOutfitSuitableForWeather(outfit, temperature, conditions));
}

// Generate random outfits based on tags and preferences
export function generateRandomOutfits(
  closetItems: ClosetItem[], 
  preferredTags: string[] = [], 
  preferredStyle: Style = Style.Casual,
  count: number = 5,
  temperature?: number,
  weatherConditions: string[] = []
): InspoOutfitRecommendation[] {
  // Group items by layer category
  const itemsByLayer = closetItems.reduce((acc, item) => {
    const layer = item.layerCategory;
    if (!acc[layer]) {
      acc[layer] = [];
    }
    acc[layer].push(item);
    return acc;
  }, {} as Record<LayerCategory, ClosetItem[]>);
  
  const outfits: InspoOutfitRecommendation[] = [];
  
  // Try to generate the requested number of outfits
  for (let i = 0; i < count; i++) {
    // Required layers for a basic outfit
    const requiredLayers: LayerCategory[] = [
      LayerCategory.base_top,
      LayerCategory.base_bottom,
      LayerCategory.footwear
    ];
    
    // Optional layers that might be included
    const optionalLayers: LayerCategory[] = [
      LayerCategory.mid_top,
      LayerCategory.outerwear,
      LayerCategory.accessory,
      LayerCategory.headwear
    ];
    
    // Start building the outfit
    const outfitItems: {item: ClosetItem, sortOrder: number}[] = [];
    let sortOrder = 1;
    let totalWarmth = 0;
    let hasWaterproof = false;
    let outfitStyle = preferredStyle;
    
    // First add required layers
    for (const layer of requiredLayers) {
      const layerItems = itemsByLayer[layer] || [];
      
      // Skip if we don't have items for this required layer
      if (layerItems.length === 0) continue;
      
      // Prefer items with preferred style or tags, and apply weather scoring
      const scoredItems = layerItems.map(item => {
        let score = 0;
        
        // IMPROVED: Apply weather-aware scoring
        const weatherScore = scoreItemForWeather(item, temperature, weatherConditions);
        score += weatherScore;
        
        // Boost score for preferred style match
        if (item.style === preferredStyle) {
          score += 2;
        }
        
        // Boost score for each matching tag
        const itemTags = item.style ? [`style:${item.style.toLowerCase()}`] : [];
        if (item.category) itemTags.push(`category:${item.category.toLowerCase()}`);
        if (item.waterproof) itemTags.push('feature:waterproof');
        
        score += preferredTags.filter(tag => itemTags.includes(tag)).length;
        
        return { item, score };
      });
      
      // CRITICAL FIX: Filter out inappropriate items for hot weather BEFORE selection
      let filteredItems = scoredItems;
      if (temperature && temperature > 20) { // Changed from 25 to 20 to be more aggressive
        // In warm/hot weather, completely exclude hoodies, outerwear, and high-warmth items
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const warmth = getDefaultWarmthFactor(item);
          const category = item.category?.toLowerCase() || '';
          
          // More aggressive filtering: exclude items that are inappropriate for warm weather
          if (temperature > 25) {
            // Very hot weather: exclude warmth >= 5
            if (warmth >= 5) return false;
          } else if (temperature > 20) {
            // Warm weather: exclude warmth >= 6
            if (warmth >= 6) return false;
          }
          
          // Always exclude these categories and layers in warm+ weather
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('sweatshirt') || category.includes('jacket') || 
              category.includes('coat')) return false;
          
          return true;
        });
      }
      
      // If no appropriate items left after filtering, skip this outfit generation attempt
      if (filteredItems.length === 0) continue;
      
      // Choose a random item, with weighted probability toward higher scores
      filteredItems.sort((a, b) => b.score - a.score);
      // Take top 3 or fewer if we don't have enough
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      
      // Update outfit properties using improved warmth calculation
      totalWarmth += getDefaultWarmthFactor(selectedItem);
      if (selectedItem.waterproof) hasWaterproof = true;
      if (selectedItem.style) outfitStyle = selectedItem.style; // Let last style item set the style
    }
    
    // If we couldn't find all required items, skip this outfit
    if (outfitItems.length < requiredLayers.length) {
      continue;
    }
    
    // Add some random optional layers
    for (const layer of optionalLayers) {
      // 50% chance to include an optional layer
      if (Math.random() > 0.5) continue;
      
      const layerItems = itemsByLayer[layer] || [];
      if (layerItems.length === 0) continue;
      
      // Similar scoring as for required layers with weather awareness
      const scoredItems = layerItems.map(item => {
        let score = 0;
        
        // IMPROVED: Apply weather-aware scoring
        const weatherScore = scoreItemForWeather(item, temperature, weatherConditions);
        score += weatherScore;
        
        if (item.style === outfitStyle) score += 2;
        
        const itemTags = item.style ? [`style:${item.style.toLowerCase()}`] : [];
        if (item.category) itemTags.push(`category:${item.category.toLowerCase()}`);
        if (item.waterproof) itemTags.push('feature:waterproof');
        
        score += preferredTags.filter(tag => itemTags.includes(tag)).length;
        
        return { item, score };
      });
      
      // CRITICAL FIX: Filter out inappropriate items for hot weather BEFORE selection
      let filteredItems = scoredItems;
      if (temperature && temperature > 20) { // Changed from 25 to 20 to be more aggressive
        // In warm/hot weather, completely exclude hoodies, outerwear, and high-warmth items
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const warmth = getDefaultWarmthFactor(item);
          const category = item.category?.toLowerCase() || '';
          
          // More aggressive filtering: exclude items that are inappropriate for warm weather
          if (temperature > 25) {
            // Very hot weather: exclude warmth >= 5
            if (warmth >= 5) return false;
          } else if (temperature > 20) {
            // Warm weather: exclude warmth >= 6
            if (warmth >= 6) return false;
          }
          
          // Always exclude these categories and layers in warm+ weather
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('sweatshirt') || category.includes('jacket') || 
              category.includes('coat')) return false;
          
          return true;
        });
      }
      
      // If no appropriate items left after filtering, skip this layer
      if (filteredItems.length === 0) continue;
      
      filteredItems.sort((a, b) => b.score - a.score);
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      
      totalWarmth += getDefaultWarmthFactor(selectedItem);
      if (selectedItem.waterproof) hasWaterproof = true;
    }
    
    // Calculate average warmth for the outfit
    const avgWarmth = Math.round(totalWarmth / outfitItems.length);
    
    // Create weather recommendation based on outfit warmth
    const weatherRec = calculateWeatherRecommendation(avgWarmth, hasWaterproof);
    
    // Extract all tags from the outfit items
    const tags = outfitItems.flatMap(({ item }) => {
      const tags: string[] = [];
      if (item.style) tags.push(`style:${item.style.toLowerCase()}`);
      if (item.category) tags.push(`category:${item.category.toLowerCase()}`);
      if (item.material) tags.push(`material:${item.material.toLowerCase()}`);
      if (item.waterproof) tags.push('feature:waterproof');
      return tags;
    });
    
    // Create the InspoOutfitRecommendation object
    const outfit: InspoOutfitRecommendation = {
      id: `generated-${i}`,
      overallStyle: outfitStyle,
      warmthRating: avgWarmth,
      waterproof: hasWaterproof,
      tags: [...new Set(tags)], // Remove duplicates
      recommendedWeather: weatherRec,
      score: 0.5, // Base score for generated outfits
      inspoItems: outfitItems.map(({ item, sortOrder }) => ({
        closetItemId: item.id,
        imageUrl: `/api/uploads/${item.filename || ''}`,
        layerCategory: item.layerCategory,
        category: item.category || '',
        style: item.style?.toString() || undefined,
        colorHex: item.colorHex || undefined,
        warmthFactor: item.warmthFactor || undefined,
        waterproof: item.waterproof || false,
        dominantColors: item.dominantColors 
          ? (typeof item.dominantColors === 'string' 
              ? JSON.parse(item.dominantColors) 
              : item.dominantColors)
          : undefined,
        sortOrder
      }))
    };
    
    // CRITICAL FIX: Double-check that the outfit is actually suitable for the weather
    if (temperature !== undefined && !isOutfitSuitableForWeather(outfit, temperature, weatherConditions)) {
      console.log('Generated outfit failed weather suitability check, skipping');
      continue; // Skip this outfit if it's not suitable
    }
    
    outfits.push(outfit);
  }
  
  return outfits;
}

// Helper function to calculate weather recommendation
function calculateWeatherRecommendation(warmthRating: number, waterproof: boolean): WeatherCondition {
  let minTemp: number;
  let maxTemp: number;
  const conditions: string[] = [];
  
  // Temperature recommendations based on warmth rating
  if (warmthRating >= 20) {
    minTemp = -10;
    maxTemp = 5;
    conditions.push('freezing', 'cold');
  } else if (warmthRating >= 15) {
    minTemp = -5;
    maxTemp = 10;
    conditions.push('cold', 'cool');
  } else if (warmthRating >= 10) {
    minTemp = 0;
    maxTemp = 15;
    conditions.push('cool', 'mild');
  } else if (warmthRating >= 7) {
    minTemp = 5;
    maxTemp = 18; // Reduced from 20 to prevent warm weather recommendations
    conditions.push('mild');
  } else if (warmthRating >= 5) {
    minTemp = 15;
    maxTemp = 25;
    conditions.push('warm');
  } else {
    minTemp = 20;
    maxTemp = 35;
    conditions.push('hot');
  }
  
  // Add weather conditions
  conditions.push('sunny', 'cloudy');
  if (waterproof) {
    conditions.push('rainy', 'drizzle');
  }
  
  return { minTemp, maxTemp, conditions };
}

// Score an outfit based on how well it matches a set of preferred tags
export function scoreOutfitByTags(outfit: InspoOutfitRecommendation, preferredTags: string[]): number {
  if (!preferredTags.length) return 0.5; // Default score if no preferences
  
  // Count matching tags
  const matchingTags = outfit.tags.filter(tag => preferredTags.includes(tag));
  
  // Calculate score based on percentage of matching tags (scale from 0.1 to 1.0)
  // Higher weight given to matches with preferred tags
  const matchRatio = matchingTags.length / Math.min(preferredTags.length, outfit.tags.length);
  return 0.1 + (matchRatio * 0.9);
}

// Generate personalized outfit recommendations based on liked items
export function generatePersonalizedOutfits(
  userCloset: ClosetItem[],
  likedItems: ClosetItem[],
  preferredTags: string[],
  preferredStyle: Style,
  count: number = 10,
  temperature?: number,
  weatherConditions: string[] = []
): InspoOutfitRecommendation[] {
  if (!userCloset.length || !likedItems.length) {
    // Fallback to random generation if no data is available
    return generateRandomOutfits(userCloset, preferredTags, preferredStyle, count, temperature, weatherConditions);
  }
  
  // Group items by layer category for easier outfit assembly
  const itemsByLayer = userCloset.reduce((acc, item) => {
    const layer = item.layerCategory;
    if (!acc[layer]) {
      acc[layer] = [];
    }
    acc[layer].push(item);
    return acc;
  }, {} as Record<LayerCategory, ClosetItem[]>);
  
  // For each liked item, find similar items in the user's closet
  const similarItemSets = likedItems.map(likedItem => {
    // Find similar items in the same layer category
    const sameLayerItems = itemsByLayer[likedItem.layerCategory] || [];
    
    // Ensure we don't just get the exact liked item - filter it out if it exists
    const filteredItems = sameLayerItems.filter(item => 
      item.id !== likedItem.id // Remove the exact same item to force new combinations
    );
    
    // If we filtered out all items (only had the original), use all items in that layer
    const itemsToSearch = filteredItems.length > 0 ? filteredItems : sameLayerItems;
    
    return findSimilarItems(likedItem, itemsToSearch, 3); // Find top 3 similar items
  }).filter(set => set.length > 0);
  
  // Start building outfit combinations
  const outfits: InspoOutfitRecommendation[] = [];
  
  // Try to create outfits based on similar items
  for (let i = 0; i < count && similarItemSets.length > 0; i++) {
    // Required layers for a basic outfit
    const requiredLayers: LayerCategory[] = [
      LayerCategory.base_top,
      LayerCategory.base_bottom,
      LayerCategory.footwear
    ];
    
    // Optional layers that might be included
    const optionalLayers: LayerCategory[] = [
      LayerCategory.mid_top,
      LayerCategory.outerwear,
      LayerCategory.accessory,
      LayerCategory.headwear
    ];
    
    // Start building the outfit
    const outfitItems: {item: ClosetItem, sortOrder: number}[] = [];
    let sortOrder = 1;
    let totalWarmth = 0;
    let hasWaterproof = false;
    let outfitStyle = preferredStyle;
    
    // First, try to include similar items from our similar sets
    for (const layer of [...requiredLayers, ...optionalLayers]) {
      // Find a similar item set for this layer
      const setsForLayer = similarItemSets.filter(set => 
        set.length > 0 && set[0].layerCategory === layer
      );
      
      if (setsForLayer.length > 0) {
        // Randomly choose one of the similar item sets for this layer
        const chosenSet = setsForLayer[Math.floor(Math.random() * setsForLayer.length)];
        // Randomly choose one of the similar items
        const chosenItem = chosenSet[Math.floor(Math.random() * chosenSet.length)];
        
        outfitItems.push({ item: chosenItem, sortOrder });
        sortOrder++;
        
        totalWarmth += getDefaultWarmthFactor(chosenItem);
        if (chosenItem.waterproof) hasWaterproof = true;
        if (chosenItem.style) outfitStyle = chosenItem.style;
      }
    }
    
    // Now fill in any missing required layers with random items
    for (const layer of requiredLayers) {
      // Skip if we already have this layer
      if (outfitItems.some(({ item }) => item.layerCategory === layer)) continue;
      
      const layerItems = itemsByLayer[layer] || [];
      
      // Skip if we don't have items for this required layer
      if (layerItems.length === 0) continue;
      
      // Prefer items with preferred style or tags and apply weather scoring
      const scoredItems = layerItems.map(item => {
        let score = 0;
        
        // IMPROVED: Apply weather-aware scoring
        const weatherScore = scoreItemForWeather(item, temperature, weatherConditions);
        score += weatherScore;
        
        if (item.style === outfitStyle) score += 2;
        
        const itemTags = item.style ? [`style:${item.style.toLowerCase()}`] : [];
        if (item.category) itemTags.push(`category:${item.category.toLowerCase()}`);
        if (item.waterproof) itemTags.push('feature:waterproof');
        
        score += preferredTags.filter(tag => itemTags.includes(tag)).length;
        
        return { item, score };
      });
      
      // CRITICAL FIX: Filter out inappropriate items for hot weather BEFORE selection
      let filteredItems = scoredItems;
      if (temperature && temperature > 20) {
        // In warm/hot weather, completely exclude hoodies, outerwear, and high-warmth items
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const warmth = getDefaultWarmthFactor(item);
          const category = item.category?.toLowerCase() || '';
          
          // More aggressive filtering: exclude items that are inappropriate for warm weather
          if (temperature > 25) {
            // Very hot weather: exclude warmth >= 5
            if (warmth >= 5) return false;
          } else if (temperature > 20) {
            // Warm weather: exclude warmth >= 6
            if (warmth >= 6) return false;
          }
          
          // Always exclude these categories and layers in warm+ weather
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('sweatshirt') || category.includes('jacket') || 
              category.includes('coat')) return false;
          
          return true;
        });
      }
      
      // If no appropriate items left after filtering, skip this layer
      if (filteredItems.length === 0) continue;
      
      filteredItems.sort((a, b) => b.score - a.score);
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      
      totalWarmth += getDefaultWarmthFactor(selectedItem);
      if (selectedItem.waterproof) hasWaterproof = true;
    }
    
    // If we couldn't find all required items, skip this outfit
    if (!requiredLayers.every(layer => 
      outfitItems.some(({ item }) => item.layerCategory === layer)
    )) {
      continue;
    }
    
    // Calculate average warmth for the outfit
    const avgWarmth = Math.round(totalWarmth / outfitItems.length);
    
    // Create weather recommendation based on outfit warmth
    const weatherRec = calculateWeatherRecommendation(avgWarmth, hasWaterproof);
    
    // Extract all tags from the outfit items
    const tags = outfitItems.flatMap(({ item }) => {
      const tags: string[] = [];
      if (item.style) tags.push(`style:${item.style.toLowerCase()}`);
      if (item.category) tags.push(`category:${item.category.toLowerCase()}`);
      if (item.material) tags.push(`material:${item.material.toLowerCase()}`);
      if (item.waterproof) tags.push('feature:waterproof');
      return tags;
    });
    
    // Calculate score based on tag matching
    const score = scoreOutfitByTags({ 
      id: '', 
      overallStyle: outfitStyle, 
      warmthRating: avgWarmth, 
      waterproof: hasWaterproof, 
      tags: [...new Set(tags)],
      recommendedWeather: weatherRec,
      inspoItems: [],
      score: 0
    }, preferredTags);
    
    // Create the InspoOutfitRecommendation object
    const outfit: InspoOutfitRecommendation = {
      id: `personalized-${i}`,
      overallStyle: outfitStyle,
      warmthRating: avgWarmth,
      waterproof: hasWaterproof,
      tags: [...new Set(tags)], // Remove duplicates
      recommendedWeather: weatherRec,
      score,
      inspoItems: outfitItems.map(({ item, sortOrder }) => ({
        closetItemId: item.id,
        imageUrl: `/api/uploads/${item.filename || ''}`,
        layerCategory: item.layerCategory,
        category: item.category || '',
        style: item.style?.toString() || undefined,
        colorHex: item.colorHex || undefined,
        warmthFactor: item.warmthFactor || undefined,
        waterproof: item.waterproof || false,
        dominantColors: item.dominantColors 
          ? (typeof item.dominantColors === 'string' 
              ? JSON.parse(item.dominantColors) 
              : item.dominantColors)
          : undefined,
        sortOrder
      }))
    };
    
    // CRITICAL FIX: Double-check that the outfit is actually suitable for the weather
    if (temperature !== undefined && !isOutfitSuitableForWeather(outfit, temperature, weatherConditions)) {
      console.log('Generated personalized outfit failed weather suitability check, skipping');
      continue; // Skip this outfit if it's not suitable
    }
    
    outfits.push(outfit);
  }
  
  // If we couldn't generate enough outfits, fill in with random ones
  if (outfits.length < count) {
    const randomOutfits = generateRandomOutfits(
      userCloset, 
      preferredTags, 
      preferredStyle, 
      count - outfits.length,
      temperature,
      weatherConditions
    );
    outfits.push(...randomOutfits);
  }
  
  // Sort by score (descending)
  return outfits.sort((a, b) => b.score - a.score);
}

// Generate outfits ONLY from liked items 
export function generateOutfitsFromLikedItemsOnly(
  likedItems: ClosetItem[],
  preferredTags: string[],
  preferredStyle: Style,
  count: number = 5,
  temperature?: number,
  weatherConditions: string[] = []
): InspoOutfitRecommendation[] {
  if (!likedItems.length) {
    return []; // No liked items, can't generate anything
  }
  
  // Group liked items by layer category
  const itemsByLayer = likedItems.reduce((acc, item) => {
    const layer = item.layerCategory;
    if (!acc[layer]) {
      acc[layer] = [];
    }
    acc[layer].push(item);
    return acc;
  }, {} as Record<LayerCategory, ClosetItem[]>);
  
  // Check if we have enough layer categories to make outfits
  const requiredLayers: LayerCategory[] = [
    LayerCategory.base_top,
    LayerCategory.base_bottom,
    LayerCategory.footwear
  ];
  
  // If we don't have at least one item in each required layer, we can't create proper outfits
  if (!requiredLayers.every(layer => (itemsByLayer[layer]?.length || 0) > 0)) {
    console.log('Not enough layer categories in liked items to generate proper outfits');
    return [];
  }
  
  // Optional layers that might be included
  const optionalLayers: LayerCategory[] = [
    LayerCategory.mid_top,
    LayerCategory.outerwear,
    LayerCategory.accessory,
    LayerCategory.headwear
  ];
  
  // Start building outfit combinations
  const outfits: InspoOutfitRecommendation[] = [];
  
  // Generate the requested number of outfits (max 5)
  const maxOutfits = Math.min(count, 5);
  for (let i = 0; i < maxOutfits; i++) {
    // Start building the outfit
    const outfitItems: {item: ClosetItem, sortOrder: number}[] = [];
    let sortOrder = 1;
    let totalWarmth = 0;
    let hasWaterproof = false;
    let outfitStyle = preferredStyle;
    
    // First add required layers with weather-aware selection
    for (const layer of requiredLayers) {
      const layerItems = itemsByLayer[layer] || [];
      if (layerItems.length === 0) continue;
      
      // IMPROVED: Apply weather-aware scoring instead of pure random selection
      const scoredItems = layerItems.map(item => ({
        item,
        score: scoreItemForWeather(item, temperature, weatherConditions)
      }));
      
      // CRITICAL FIX: Filter out inappropriate items for hot weather BEFORE selection
      let filteredItems = scoredItems;
      if (temperature && temperature > 20) { // Changed from 25 to 20 to be more aggressive
        // In warm/hot weather, completely exclude hoodies, outerwear, and high-warmth items
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const warmth = getDefaultWarmthFactor(item);
          const category = item.category?.toLowerCase() || '';
          
          // More aggressive filtering: exclude items that are inappropriate for warm weather
          if (temperature > 25) {
            // Very hot weather: exclude warmth >= 5
            if (warmth >= 5) return false;
          } else if (temperature > 20) {
            // Warm weather: exclude warmth >= 6
            if (warmth >= 6) return false;
          }
          
          // Always exclude these categories and layers in warm+ weather
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('sweatshirt') || category.includes('jacket') || 
              category.includes('coat')) return false;
          
          return true;
        });
      }
      
      // If no appropriate items left after filtering, skip this outfit generation attempt
      if (filteredItems.length === 0) continue;
      
      // Sort by score and select from top candidates
      filteredItems.sort((a, b) => b.score - a.score);
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      
      totalWarmth += getDefaultWarmthFactor(selectedItem);
      if (selectedItem.waterproof) hasWaterproof = true;
      if (selectedItem.style) outfitStyle = selectedItem.style;
    }
    
    // Add some weather-aware optional layers (if available)
    for (const layer of optionalLayers) {
      // IMPROVED: Adjust probability based on weather
      let includeLayerChance = 0.5;
      
      // Reduce chance of mid-layer/outerwear in hot weather
      if ((temperature && temperature > 25) && (layer === 'mid_top' || layer === 'outerwear')) {
        includeLayerChance = 0.1;
      }
      // Increase chance of outerwear in cold weather
      else if ((temperature && temperature < 15) && (layer === 'mid_top' || layer === 'outerwear')) {
        includeLayerChance = 0.8;
      }
      
      if (Math.random() > includeLayerChance) continue;
      
      const layerItems = itemsByLayer[layer] || [];
      if (layerItems.length === 0) continue;
      
      // IMPROVED: Apply weather-aware scoring
      const scoredItems = layerItems.map(item => ({
        item,
        score: scoreItemForWeather(item, temperature, weatherConditions)
      }));
      
      // CRITICAL FIX: Filter out inappropriate items for hot weather BEFORE selection
      let filteredItems = scoredItems;
      if (temperature && temperature > 20) { // Changed from 25 to 20 to be more aggressive
        // In warm/hot weather, completely exclude hoodies, outerwear, and high-warmth items
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const warmth = getDefaultWarmthFactor(item);
          const category = item.category?.toLowerCase() || '';
          
          // More aggressive filtering: exclude items that are inappropriate for warm weather
          if (temperature > 25) {
            // Very hot weather: exclude warmth >= 5
            if (warmth >= 5) return false;
          } else if (temperature > 20) {
            // Warm weather: exclude warmth >= 6
            if (warmth >= 6) return false;
          }
          
          // Always exclude these categories and layers in warm+ weather
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('sweatshirt') || category.includes('jacket') || 
              category.includes('coat')) return false;
          
          return true;
        });
      }
      
      // If no appropriate items left after filtering, skip this layer
      if (filteredItems.length === 0) continue;
      
      filteredItems.sort((a, b) => b.score - a.score);
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      
      totalWarmth += getDefaultWarmthFactor(selectedItem);
      if (selectedItem.waterproof) hasWaterproof = true;
    }
    
    // Calculate average warmth for the outfit
    const avgWarmth = Math.round(totalWarmth / outfitItems.length);
    
    // Create weather recommendation based on outfit warmth
    const weatherRec = calculateWeatherRecommendation(avgWarmth, hasWaterproof);
    
    // Extract all tags from the outfit items
    const tags = outfitItems.flatMap(({ item }) => {
      const tags: string[] = [];
      if (item.style) tags.push(`style:${item.style.toLowerCase()}`);
      if (item.category) tags.push(`category:${item.category.toLowerCase()}`);
      if (item.material) tags.push(`material:${item.material.toLowerCase()}`);
      if (item.waterproof) tags.push('feature:waterproof');
      return tags;
    });
    
    // Calculate score based on tag matching
    const score = scoreOutfitByTags({ 
      id: '', 
      overallStyle: outfitStyle, 
      warmthRating: avgWarmth, 
      waterproof: hasWaterproof, 
      tags: [...new Set(tags)],
      recommendedWeather: weatherRec,
      inspoItems: [],
      score: 0
    }, preferredTags);
    
    // Create the InspoOutfitRecommendation object
    const outfit: InspoOutfitRecommendation = {
      id: `liked-items-${i}`,
      overallStyle: outfitStyle,
      warmthRating: avgWarmth,
      waterproof: hasWaterproof,
      tags: [...new Set(tags)], // Remove duplicates
      recommendedWeather: weatherRec,
      score,
      inspoItems: outfitItems.map(({ item, sortOrder }) => ({
        closetItemId: item.id,
        imageUrl: `/api/uploads/${item.filename || ''}`,
        layerCategory: item.layerCategory,
        category: item.category || '',
        style: item.style?.toString() || undefined,
        colorHex: item.colorHex || undefined,
        warmthFactor: item.warmthFactor || undefined,
        waterproof: item.waterproof || false,
        dominantColors: item.dominantColors 
          ? (typeof item.dominantColors === 'string' 
              ? JSON.parse(item.dominantColors) 
              : item.dominantColors)
          : undefined,
        sortOrder
      }))
    };
    
    // CRITICAL FIX: Double-check that the outfit is actually suitable for the weather
    if (temperature !== undefined && !isOutfitSuitableForWeather(outfit, temperature, weatherConditions)) {
      console.log('Generated outfit from liked items failed weather suitability check, skipping');
      continue; // Skip this outfit if it's not suitable
    }
    
    outfits.push(outfit);
  }
  
  return outfits;
}

// IMPROVED: Helper function to get default warmth factor for categories
function getDefaultWarmthFactor(item: ClosetItem): number {
  const category = item.category?.toLowerCase() || '';
  const layerCategory = item.layerCategory;
  
  // IMPROVED: Enforce higher defaults for certain categories
  if (category.includes('hoodie') || category.includes('sweatshirt')) {
    return Math.max(item.warmthFactor || 7, 7); // Hoodies minimum warmth 7
  }
  
  if (category.includes('sweater') || category.includes('pullover')) {
    return Math.max(item.warmthFactor || 6, 6); // Sweaters minimum warmth 6
  }
  
  if (category.includes('jacket') || category.includes('coat')) {
    return Math.max(item.warmthFactor || 8, 8); // Jackets/coats minimum warmth 8
  }
  
  if (layerCategory === 'outerwear') {
    return Math.max(item.warmthFactor || 7, 7); // All outerwear minimum warmth 7
  }
  
  if (layerCategory === 'mid_top') {
    return Math.max(item.warmthFactor || 6, 6); // Mid-layer tops minimum warmth 6
  }
  
  // Return original warmth factor or default
  return item.warmthFactor || 5;
}

// IMPROVED: Weather-aware item scoring function
function scoreItemForWeather(item: ClosetItem, temperature?: number, weatherConditions: string[] = []): number {
  let score = 1.0; // Base score
  
  if (temperature === undefined) return score;
  
  const itemWarmth = getDefaultWarmthFactor(item);
  const isHotWeather = temperature > 25 || weatherConditions.includes('hot');
  const isWarmWeather = temperature > 20 || weatherConditions.includes('warm');
  const isColdWeather = temperature < 15 || weatherConditions.includes('cold');
  const isVeryHotWeather = temperature > 30;
  
  // IMPROVED: Bias selection based on weather
  if (isVeryHotWeather) {
    // Boost very light items (warmth <= 3) for very hot weather
    if (itemWarmth <= 3) {
      score *= 2.0;
    } else if (itemWarmth >= 5) {
      score *= 0.1; // Heavily penalize warm items
    }
    
    // Exclude outerwear and mid-layer completely in very hot weather
    if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') {
      score *= 0.01;
    }
  } else if (isHotWeather) {
    // Boost light items (warmth <= 4) for hot weather
    if (itemWarmth <= 4) {
      score *= 1.5;
    } else if (itemWarmth >= 6) {
      score *= 0.2; // Penalize warm items
    }
    
    // Discourage outerwear and mid-layer in hot weather
    if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') {
      score *= 0.1;
    }
  } else if (isWarmWeather) {
    // Boost medium items (warmth 4-6) for warm weather
    if (itemWarmth >= 4 && itemWarmth <= 6) {
      score *= 1.3;
    } else if (itemWarmth >= 8) {
      score *= 0.5; // Penalize very warm items
    }
  } else if (isColdWeather) {
    // Boost warm items (warmth >= 7) for cold weather
    if (itemWarmth >= 7) {
      score *= 1.5;
    } else if (itemWarmth <= 3) {
      score *= 0.3; // Penalize very light items
    }
    
    // Boost outerwear and mid-layer in cold weather
    if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') {
      score *= 1.5;
    }
  }
  
  // Weather condition bonuses
  if (weatherConditions.includes('rain') || weatherConditions.includes('drizzle')) {
    if (item.waterproof) {
      score *= 1.8; // Boost waterproof items
    } else {
      score *= 0.6; // Penalize non-waterproof items
    }
  }
  
  return score;
}
