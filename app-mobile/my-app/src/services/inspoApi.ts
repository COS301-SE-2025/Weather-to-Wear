// src/services/inspoApi.ts
import { fetchWithAuth } from './fetchWithAuth';
import { API_BASE } from '../config';

export interface WeatherCondition {
  minTemp: number;
  maxTemp: number;
  conditions: string[];
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

export interface InspoOutfitRecommendation {
  id: string;
  overallStyle: string;
  warmthRating: number;
  waterproof: boolean;
  tags: string[];
  recommendedWeather: WeatherCondition;
  score: number;
  inspoItems: InspoItemRecommendation[];
}

export interface GenerateInspoRequest {
  weatherFilter?: {
    minTemp?: number;
    maxTemp?: number;
    conditions?: string[];
  };
  styleFilter?: string;
  limit?: number;
}

// Like an item for inspiration
export const likeItemForInspiration = async (closetItemId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_BASE}/inspo/like`, {
    method: 'POST',
    body: JSON.stringify({ closetItemId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to like item for inspiration');
  }
};

// Generate inspiration outfits
export const generateInspoOutfits = async (request: GenerateInspoRequest): Promise<InspoOutfitRecommendation[]> => {
  const response = await fetchWithAuth(`${API_BASE}/inspo/generate`, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to generate inspiration outfits');
  }

  return response.json();
};

// Get all stored inspiration outfits
export const getAllInspoOutfits = async (): Promise<InspoOutfitRecommendation[]> => {
  const response = await fetchWithAuth(`${API_BASE}/inspo`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to fetch inspiration outfits');
  }

  return response.json();
};

// Delete an inspiration outfit
export const deleteInspoOutfit = async (inspoOutfitId: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_BASE}/inspo/${inspoOutfitId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to delete inspiration outfit');
  }
};
