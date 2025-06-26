// outfit.types.ts

export interface WeatherSummary {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  willRain: boolean;
  mainCondition: string;
}

export interface RecommendOutfitsRequest {
  weatherSummary: WeatherSummary;
  style?: string;      // Optional (e.g., "Formal", "Casual", etc.)
  eventId?: string;    // Optional
}

export interface OutfitItemRecommendation {
  closetItemId: string;
  imageUrl: string; // URL to the item's image
  layerCategory: string;
  category: string;
  style?: string;
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
}

export interface OutfitRecommendation {
  outfitItems: OutfitItemRecommendation[];
  overallStyle: string;
  score: number;
  warmthRating: number;
  waterproof: boolean;
  weatherSummary: WeatherSummary;
}
