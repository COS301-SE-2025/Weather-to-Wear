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
  style?: string;      
  eventId?: string;    // the two are optional
}

export interface OutfitItemRecommendation {
  closetItemId: string;
  imageUrl: string; 
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
