// Enhanced inspoRecommender.service.ts with weighted warmth system
import { ClosetItem, LayerCategory, Style } from '@prisma/client';
import { InspoOutfitRecommendation, InspoItemRecommendation, WeatherCondition } from './inspo.types';
import { cdnUrlFor } from '../../utils/s3';

// Layer warmth weights - same as main recommender
const LAYER_WARMTH_WEIGHT: Record<string, number> = {
  base_top: 1.0,
  base_bottom: 1.0,
  mid_top: 1.2,
  outerwear: 1.6,
  footwear: 0.4,
  headwear: 0.2,
  accessory: 0.1,
};

// Temperature to target weighted warmth mapping - adapted from main recommender
const TEMP_WARMTH_POINTS: Array<[number, number]> = [
  [30, 5],
  [25, 7],
  [20, 10],
  [15, 14],
  [10, 20],
  [5, 24],
  [0, 28],
  [-5, 32],
];

// Calculate weighted warmth for a single item
function calculateWeightedItemWarmth(item: ClosetItem): number {
  const weight = LAYER_WARMTH_WEIGHT[item.layerCategory] ?? 1.0;
  const baseWarmth = getDefaultWarmthFactor(item);
  return baseWarmth * weight;
}

// Calculate weighted warmth for entire outfit
function calculateWeightedOutfitWarmth(items: ClosetItem[]): number {
  return items.reduce((sum, item) => sum + calculateWeightedItemWarmth(item), 0);
}

// Get target weighted warmth for given temperature
function getTargetWeightedWarmth(temperature: number): number {
  // Linear interpolation between temperature points
  for (let i = 0; i < TEMP_WARMTH_POINTS.length - 1; i++) {
    const [t1, w1] = TEMP_WARMTH_POINTS[i];
    const [t2, w2] = TEMP_WARMTH_POINTS[i + 1];
    
    if ((temperature <= t1 && temperature >= t2) || (temperature >= t1 && temperature <= t2)) {
      const ratio = (temperature - t1) / (t2 - t1);
      return w1 + ratio * (w2 - w1);
    }
  }
  
  // Handle edge cases
  if (temperature > TEMP_WARMTH_POINTS[0][0]) return TEMP_WARMTH_POINTS[0][1];
  return TEMP_WARMTH_POINTS[TEMP_WARMTH_POINTS.length - 1][1];
}

// Get warmth tolerance based on temperature (wider tolerance in warm weather)
function getWarmthTolerance(temperature: number): number {
  if (temperature >= 28) return 6;
  if (temperature >= 22) return 5;
  if (temperature >= 14) return 4.5;
  if (temperature >= 8) return 4;
  if (temperature >= 2) return 3.5;
  return 3;
}

// Helper function to check if a temperature falls within any of the selected ranges
function isTemperatureInRanges(temperature: number, temperatureRanges: { minTemp: number; maxTemp: number }[]): boolean {
  if (!temperatureRanges || temperatureRanges.length === 0) return true;
  
  return temperatureRanges.some(range => {
    const tolerance = 3; // Small tolerance for edge cases
    return temperature >= (range.minTemp - tolerance) && temperature <= (range.maxTemp + tolerance);
  });
}

// Enhanced weather-aware item scoring with multiple temperature ranges support
function scoreItemForWeatherWeighted(item: ClosetItem, temperature?: number, weatherConditions: string[] = []): number {
  let score = 1.0;
  
  if (temperature === undefined) return score;
  
  const itemWeightedWarmth = calculateWeightedItemWarmth(item);
  const targetWarmth = getTargetWeightedWarmth(temperature);
  const tolerance = getWarmthTolerance(temperature);
  
  // Score based on how close the item's weighted warmth is to the target range
  const warmthDelta = Math.abs(itemWeightedWarmth - targetWarmth);
  
  if (warmthDelta <= tolerance) {
    // Within tolerance - boost score
    score *= 1.5;
  } else {
    // Outside tolerance - apply penalty based on distance
    const penalty = Math.exp(-((warmthDelta - tolerance) ** 2) / 25);
    score *= penalty;
  }
  
  // Additional category-based filtering for extreme temperatures
  const category = item.category?.toLowerCase() || '';
  
  if (temperature > 25) {
    // Hot weather - heavily penalize inappropriate categories
    if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') {
      score *= 0.1;
    }
    if (category.includes('hoodie') || category.includes('sweater') || 
        category.includes('jacket') || category.includes('coat')) {
      score *= 0.05;
    }
  } else if (temperature < 10) {
    // Cold weather - boost warm layers
    if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') {
      score *= 1.8;
    }
  }
  
  // Weather condition bonuses
  if (weatherConditions.includes('rain') || weatherConditions.includes('drizzle')) {
    score *= item.waterproof ? 2.0 : 0.4;
  }
  
  return score;
}

// Enhanced outfit suitability check using weighted warmth
function isOutfitSuitableForWeatherWeighted(
  outfit: InspoOutfitRecommendation, 
  temperature: number, 
  weatherConditions: string[]
): boolean {
  // Convert InspoItemRecommendation back to ClosetItem-like objects for calculation
  const items = outfit.inspoItems.map(item => ({
    layerCategory: item.layerCategory,
    category: item.category,
    warmthFactor: item.warmthFactor || 5,
    waterproof: item.waterproof || false,
  } as Partial<ClosetItem>));
  
  const outfitWeightedWarmth = items.reduce((sum, item) => {
    const weight = LAYER_WARMTH_WEIGHT[item.layerCategory as string] ?? 1.0;
    const warmth = item.warmthFactor || 5;
    return sum + (warmth * weight);
  }, 0);
  
  const targetWarmth = getTargetWeightedWarmth(temperature);
  const tolerance = getWarmthTolerance(temperature);
  
  // Check if outfit's weighted warmth is within acceptable range
  const isWarmthSuitable = Math.abs(outfitWeightedWarmth - targetWarmth) <= tolerance * 1.2;
  
  // Additional checks for extreme temperatures
  if (temperature > 25) {
    const hasInappropriateItems = outfit.inspoItems.some(item => {
      const category = item.category?.toLowerCase() || '';
      return item.layerCategory === 'outerwear' || 
             item.layerCategory === 'mid_top' ||
             category.includes('hoodie') || 
             category.includes('sweater') ||
             category.includes('jacket') ||
             category.includes('coat');
    });
    
    if (hasInappropriateItems) return false;
  }
  
  // Rain condition check
  if (weatherConditions.includes('rain') || weatherConditions.includes('drizzle')) {
    return outfit.waterproof && isWarmthSuitable;
  }
  
  return isWarmthSuitable;
}

// Enhanced weather recommendation calculation using weighted warmth
function calculateWeatherRecommendationWeighted(
  items: ClosetItem[], 
  hasWaterproof: boolean
): WeatherCondition {
  const totalWeightedWarmth = calculateWeightedOutfitWarmth(items);
  
  // Define consistent, user-friendly temperature ranges based on weighted warmth
  // These ranges align with rebalanced warmth factors and frontend temperature categories
  // Logic: Higher weighted warmth = Colder weather, Lower weighted warmth = Warmer weather
  let minTemp: number, maxTemp: number;
  
  if (totalWeightedWarmth >= 28) {
    // Very heavy outfits (heavy coats + layers) for freezing weather
    minTemp = -10;
    maxTemp = 0;
  } else if (totalWeightedWarmth >= 24) {
    // Heavy outfits (jackets) for very cold weather  
    minTemp = 0;
    maxTemp = 8;
  } else if (totalWeightedWarmth >= 20) {
    // Warm outfits (light jackets, heavy sweaters) for cold weather
    minTemp = 8;
    maxTemp = 15;
  } else if (totalWeightedWarmth >= 16) {
    // Moderate-warm outfits (hoodies, sweaters) for cool weather
    minTemp = 15;
    maxTemp = 22;
  } else if (totalWeightedWarmth >= 12) {
    // Light-moderate outfits (light sweaters, cardigans) for mild weather  
    minTemp = 22;
    maxTemp = 28;
  } else if (totalWeightedWarmth >= 8) {
    // Light outfits (base layers with light layer) for warm weather
    minTemp = 28;
    maxTemp = 32;
  } else {
    // Very light outfits (minimal clothing) for hot weather
    minTemp = 32;
    maxTemp = 40;
  }
  
  // Calculate average temperature for primary weather condition
  const avgTemp = (minTemp + maxTemp) / 2;
  
  // Determine primary weather condition based on temperature and waterproof status
  const conditions: string[] = [];
  
  if (hasWaterproof) {
    // If outfit is waterproof, prioritize rainy conditions
    if (avgTemp <= 0) {
      conditions.push('freezing', 'rainy');
    } else if (avgTemp <= 15) {
      conditions.push('rainy', 'cool', 'cloudy');
    } else {
      conditions.push('rainy', 'drizzle', 'cloudy');
    }
  } else {
    // Temperature-based weather conditions (prioritize most relevant icon first)
    if (avgTemp >= 30) {
      // Very hot weather - clear sunny skies
      conditions.push('hot', 'sunny');
    } else if (avgTemp >= 25) {
      // Warm weather - mostly sunny
      conditions.push('sunny', 'warm');
    } else if (avgTemp >= 18) {
      // Mild weather - partly cloudy but pleasant
      conditions.push('mild', 'sunny', 'cloudy');
    } else if (avgTemp >= 10) {
      // Cool weather - more clouds than sun
      conditions.push('cool', 'cloudy');
    } else if (avgTemp >= 2) {
      // Cold weather - overcast and cold
      conditions.push('cold', 'cloudy');
    } else {
      // Freezing weather - snow/ice conditions
      conditions.push('freezing', 'cold');
    }
  }
  
  // Add windy condition for certain temperature ranges
  if (avgTemp >= 10 && avgTemp <= 20 && !hasWaterproof) {
    conditions.push('windy');
  }
  
  return { minTemp, maxTemp, conditions };
}

// Enhanced random outfit generation with weighted warmth
function generateRandomOutfitsWeighted(
  closetItems: ClosetItem[], 
  preferredTags: string[] = [], 
  preferredStyle: Style = Style.Casual,
  count: number = 5,
  temperature?: number,
  weatherConditions: string[] = []
): InspoOutfitRecommendation[] {
  const itemsByLayer = closetItems.reduce((acc, item) => {
    const layer = item.layerCategory;
    if (!acc[layer]) acc[layer] = [];
    acc[layer].push(item);
    return acc;
  }, {} as Record<LayerCategory, ClosetItem[]>);
  
  const outfits: InspoOutfitRecommendation[] = [];
  const targetWarmth = temperature ? getTargetWeightedWarmth(temperature) : null;
  const tolerance = temperature ? getWarmthTolerance(temperature) : null;
  
  for (let i = 0; i < count; i++) {
    const requiredLayers: LayerCategory[] = [
      LayerCategory.base_top,
      LayerCategory.base_bottom,
      LayerCategory.footwear
    ];
    
    const optionalLayers: LayerCategory[] = [
      LayerCategory.mid_top,
      LayerCategory.outerwear,
      LayerCategory.accessory,
      LayerCategory.headwear
    ];
    
    const outfitItems: {item: ClosetItem, sortOrder: number}[] = [];
    let sortOrder = 1;
    let outfitStyle = preferredStyle;
    let currentWeightedWarmth = 0;
    
    // Build outfit with weighted warmth awareness
    for (const layer of requiredLayers) {
      const layerItems = itemsByLayer[layer] || [];
      if (layerItems.length === 0) continue;
      
      const scoredItems = layerItems.map(item => {
        let score = 0;
        
        // Weather-aware scoring with weighted warmth
        if (temperature) {
          score += scoreItemForWeatherWeighted(item, temperature, weatherConditions);
        } else {
          score += 1;
        }
        
        // Style and tag preferences
        if (item.style === preferredStyle) score += 2;
        
        const itemTags = item.style ? [`style:${item.style.toLowerCase()}`] : [];
        if (item.category) itemTags.push(`category:${item.category.toLowerCase()}`);
        if (item.waterproof) itemTags.push('feature:waterproof');
        
        score += preferredTags.filter(tag => itemTags.includes(tag)).length;
        
        return { item, score };
      });
      
      // Filter inappropriate items for temperature
      let filteredItems = scoredItems;
      if (temperature && temperature > 25) {
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const category = item.category?.toLowerCase() || '';
          
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('jacket') || category.includes('coat')) return false;
          
          return true;
        });
      }
      
      if (filteredItems.length === 0) continue;
      
      filteredItems.sort((a, b) => b.score - a.score);
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      currentWeightedWarmth += calculateWeightedItemWarmth(selectedItem);
      
      if (selectedItem.style) outfitStyle = selectedItem.style;
    }
    
    // Add optional layers based on warmth needs and weather
    for (const layer of optionalLayers) {
      // Check if we need more warmth
      let includeChance = 0.5;
      
      if (targetWarmth && tolerance) {
        const warmthGap = targetWarmth - currentWeightedWarmth;
        if (warmthGap > tolerance) {
          // Need more warmth
          includeChance = 0.8;
        } else if (warmthGap < -tolerance) {
          // Too much warmth already
          includeChance = 0.2;
        }
      }
      
      // Weather-specific adjustments
      if (temperature && temperature > 25 && (layer === 'mid_top' || layer === 'outerwear')) {
        includeChance = 0.1;
      } else if (temperature && temperature < 15 && (layer === 'mid_top' || layer === 'outerwear')) {
        includeChance = 0.9;
      }
      
      if (Math.random() > includeChance) continue;
      
      const layerItems = itemsByLayer[layer] || [];
      if (layerItems.length === 0) continue;
      
      // Similar scoring and filtering as required layers
      const scoredItems = layerItems.map(item => ({
        item,
        score: temperature ? scoreItemForWeatherWeighted(item, temperature, weatherConditions) : 1
      }));
      
      let filteredItems = scoredItems;
      if (temperature && temperature > 25) {
        filteredItems = scoredItems.filter(scored => {
          const item = scored.item;
          const category = item.category?.toLowerCase() || '';
          
          if (item.layerCategory === 'outerwear' || item.layerCategory === 'mid_top') return false;
          if (category.includes('hoodie') || category.includes('sweater') || 
              category.includes('jacket') || category.includes('coat')) return false;
          
          return true;
        });
      }
      
      if (filteredItems.length === 0) continue;
      
      filteredItems.sort((a, b) => b.score - a.score);
      const topItems = filteredItems.slice(0, Math.min(3, filteredItems.length));
      const selectedItem = topItems[Math.floor(Math.random() * topItems.length)].item;
      
      outfitItems.push({ item: selectedItem, sortOrder });
      sortOrder++;
      currentWeightedWarmth += calculateWeightedItemWarmth(selectedItem);
    }
    
    if (outfitItems.length < requiredLayers.length) continue;
    
    const hasWaterproof = outfitItems.some(({ item }) => item.waterproof);
    const weatherRec = calculateWeatherRecommendationWeighted(
      outfitItems.map(({ item }) => item), 
      hasWaterproof
    );
    
    // Calculate traditional warmth rating for display
    const totalWarmth = outfitItems.reduce((sum, { item }) => sum + getDefaultWarmthFactor(item), 0);
    const avgWarmth = Math.round(totalWarmth / outfitItems.length);
    
    const tags = outfitItems.flatMap(({ item }) => {
      const tags: string[] = [];
      if (item.style) tags.push(`style:${item.style.toLowerCase()}`);
      if (item.category) tags.push(`category:${item.category.toLowerCase()}`);
      if (item.material) tags.push(`material:${item.material.toLowerCase()}`);
      if (item.waterproof) tags.push('feature:waterproof');
      return tags;
    });
    
    const outfit: InspoOutfitRecommendation = {
      id: `weighted-${i}`,
      overallStyle: outfitStyle,
      warmthRating: Math.round(currentWeightedWarmth), // Show weighted warmth
      waterproof: hasWaterproof,
      tags: [...new Set(tags)],
      recommendedWeather: weatherRec,
      score: 0.5,
      inspoItems: outfitItems.map(({ item, sortOrder }) => ({
        closetItemId: item.id,
        // imageUrl: `/api/uploads/${item.filename || ''}`, // ! bomboclaat
        imageUrl: item.filename ? cdnUrlFor(item.filename) : '',
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
    
    // Final weighted warmth suitability check
    if (temperature !== undefined && !isOutfitSuitableForWeatherWeighted(outfit, temperature, weatherConditions)) {
      continue;
    }
    
    outfits.push(outfit);
  }
  
  return outfits;
}

// Helper function to get default warmth factor (balanced for proper temperature alignment)
function getDefaultWarmthFactor(item: ClosetItem): number {
  const category = item.category?.toLowerCase() || '';
  const layerCategory = item.layerCategory;
  
  // According to TEMP_WARMTH_POINTS mapping and layer weights:
  // 30°C = warmth 5, 25°C = warmth 7, 20°C = warmth 10, 15°C = warmth 14, 10°C = warmth 20, 5°C = warmth 24, 0°C = warmth 28
  // Layer weights: base=1.0, mid_top=1.2, outerwear=1.6, footwear=0.4, headwear=0.2, accessory=0.1
  
  if (category.includes('jacket') || category.includes('coat')) {
    // Heavy outerwear for cold weather (0-5°C range)
    // Target weighted warmth ~24-28, with outerwear weight 1.6: 24/1.6 = 15, 28/1.6 = 17.5
    return Math.max(item.warmthFactor || 16, 16);
  }
  
  if (category.includes('hoodie') || category.includes('sweatshirt')) {
    // Warm mid-layer for cool weather (15°C range)
    // Target weighted warmth ~14, with mid_top weight 1.2: 14/1.2 = 11.7
    return Math.max(item.warmthFactor || 12, 12);
  }
  
  if (category.includes('sweater') || category.includes('pullover')) {
    // Moderate warmth for cool weather (15-20°C range)
    // Target weighted warmth ~10-14, with mid_top weight 1.2: 10/1.2 = 8.3, 14/1.2 = 11.7
    return Math.max(item.warmthFactor || 10, 10);
  }
  
  if (layerCategory === 'outerwear') {
    // General outerwear for cold weather
    // Target weighted warmth ~20-24, with outerwear weight 1.6: 20/1.6 = 12.5, 24/1.6 = 15
    return Math.max(item.warmthFactor || 14, 14);
  }
  
  if (layerCategory === 'mid_top') {
    // Mid-layer for cool weather (15-20°C range)
    // Target weighted warmth ~10-14, with mid_top weight 1.2: 10/1.2 = 8.3, 14/1.2 = 11.7
    return Math.max(item.warmthFactor || 9, 9);
  }
  
  // Base layers and light items for warm weather (20-30°C range = warmth 5-10)
  // Base layer weight 1.0, so direct mapping
  return item.warmthFactor || 7;
}

// ======= ORIGINAL FUNCTIONS FOR BACKWARD COMPATIBILITY =======

// Calculate similarity between two items based on their features
function calculateItemSimilarity(itemA: ClosetItem, itemB: ClosetItem): number {
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
function findSimilarItems(referenceItem: ClosetItem, candidateItems: ClosetItem[], k = 5): ClosetItem[] {
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

// Check if an outfit is appropriate for given weather (original version)
function isOutfitSuitableForWeather(
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
function filterOutfitsByWeather(
  outfits: InspoOutfitRecommendation[], 
  temperature: number, 
  conditions: string[] = []
): InspoOutfitRecommendation[] {
  return outfits.filter(outfit => isOutfitSuitableForWeather(outfit, temperature, conditions));
}

// Generate random outfits based on tags and preferences (original version)
function generateRandomOutfits(
  closetItems: ClosetItem[], 
  preferredTags: string[] = [], 
  preferredStyle: Style = Style.Casual,
  count: number = 5,
  temperature?: number,
  weatherConditions: string[] = []
): InspoOutfitRecommendation[] {
  // For now, delegate to the weighted version for better results
  return generateRandomOutfitsWeighted(closetItems, preferredTags, preferredStyle, count, temperature, weatherConditions);
}

// Score an outfit based on how well it matches a set of preferred tags
function scoreOutfitByTags(outfit: InspoOutfitRecommendation, preferredTags: string[]): number {
  if (!preferredTags.length) return 0.5; // Default score if no preferences
  
  // Count matching tags
  const matchingTags = outfit.tags.filter(tag => preferredTags.includes(tag));
  
  // Calculate score based on percentage of matching tags (scale from 0.1 to 1.0)
  // Higher weight given to matches with preferred tags
  const matchRatio = matchingTags.length / Math.min(preferredTags.length, outfit.tags.length);
  return 0.1 + (matchRatio * 0.9);
}

// Generate personalized outfit recommendations based on liked items (original version)
function generatePersonalizedOutfits(
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
  
  // For now, delegate to random generation with weighted logic
  return generateRandomOutfitsWeighted(userCloset, preferredTags, preferredStyle, count, temperature, weatherConditions);
}

// Generate outfits ONLY from liked items (original version)
function generateOutfitsFromLikedItemsOnly(
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
  
  // Use the weighted generation logic with only the liked items
  return generateRandomOutfitsWeighted(likedItems, preferredTags, preferredStyle, count, temperature, weatherConditions);
}

// ======= END ORIGINAL FUNCTIONS =======

// Export the enhanced functions while keeping backward compatibility
export {
  calculateItemSimilarity,
  findSimilarItems,
  isOutfitSuitableForWeather, // Keep original for backward compatibility
  isOutfitSuitableForWeatherWeighted, // New weighted version
  filterOutfitsByWeather,
  generateRandomOutfits, // Keep original
  generateRandomOutfitsWeighted, // New weighted version
  scoreOutfitByTags,
  generatePersonalizedOutfits,
  generateOutfitsFromLikedItemsOnly,
  // New exports
  calculateWeightedItemWarmth,
  calculateWeightedOutfitWarmth,
  getTargetWeightedWarmth,
  getWarmthTolerance,
};