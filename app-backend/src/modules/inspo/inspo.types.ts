// inspo.types.ts

export interface WeatherCondition {
  minTemp: number;
  maxTemp: number;
  conditions: string[]; // ["sunny", "rainy", "windy", etc.]
}

export interface InspoOutfitRecommendation {
  id: string;
  overallStyle: string;
  warmthRating: number;
  waterproof: boolean;
  tags: string[];
  recommendedWeather: WeatherCondition;
  inspoItems: InspoItemRecommendation[];
  score: number;
}

export interface InspoItemRecommendation {
  closetItemId: string;
  imageUrl: string;
  layerCategory: string;
  category: string;
  style?: string;
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  dominantColors?: string[];
  sortOrder: number;
}

export interface GenerateInspoRequest {
  weatherFilter?: {
    minTemp?: number;
    maxTemp?: number;
    conditions?: string[];
    temperatureRanges?: { minTemp: number; maxTemp: number }[];
  };
  styleFilter?: string;
  limit?: number;
}

export interface LikedItem {
  closetItemId: string;
  tags: string[]; // Extracted from the item (style, category, color, etc.)
}
