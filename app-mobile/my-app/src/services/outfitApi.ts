// src/services/outfitApi.ts
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/outfits';

export interface OutfitItem {
  closetItemId: string;
  layerCategory: string;
  category: string;
  colorHex: string;
  style: string;
}

export interface RecommendedOutfit {
  id: string;
  outfitItems: OutfitItem[];
  overallStyle: string;
  score: number;
  warmthRating: number;
  waterproof: boolean;
  userRating?: number;
  weatherSummary: {
    avgTemp: number;
    minTemp: number;
    maxTemp: number;
    willRain: boolean;
    mainCondition: string;
  };
}

export interface OutfitItemPayload {
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
}

export interface SaveOutfitPayload {
  outfitItems: OutfitItemPayload[];
  warmthRating: number;
  waterproof: boolean;
  overallStyle: string;
  weatherSummary: string;   // stringified JSON
  userRating: number;
}

// Fire off the recommender
export const fetchRecommendedOutfits = async (
  weatherSummary: RecommendedOutfit['weatherSummary'],
  style?: string,
  eventId?: string
): Promise<RecommendedOutfit[]> => {
  const body: any = { weatherSummary };
  if (style)   body.style   = style;
  if (eventId) body.eventId = eventId;

  const res = await axios.post<RecommendedOutfit[]>(
    `${API_URL}/recommend`,
    body,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  return res.data;
};

// Persist a chosen outfit (only after rating)
export const createOutfit = async (
  data: SaveOutfitPayload
): Promise<RecommendedOutfit> => {
  const res = await axios.post<RecommendedOutfit>(
    API_URL,
    data,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  return res.data;
};

// Fetch all saved outfits
export const fetchAllOutfits = async (): Promise<RecommendedOutfit[]> => {
  const res = await axios.get<RecommendedOutfit[]>(
    API_URL,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  return res.data;
};

// Fetch one by id
export const fetchOutfitById = async (id: string): Promise<RecommendedOutfit> => {
  const res = await axios.get<RecommendedOutfit>(
    `${API_URL}/${id}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  return res.data;
};

// Update an existing outfit
export const updateOutfit = async (
  id: string,
  payload: Partial<SaveOutfitPayload>
): Promise<RecommendedOutfit> => {
  const res = await axios.put<RecommendedOutfit>(
    `${API_URL}/${id}`,
    payload,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  return res.data;
};

// Delete an outfit
export const deleteOutfit = async (id: string): Promise<{ success: boolean }> => {
  const res = await axios.delete<{ success: boolean }>(
    `${API_URL}/${id}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }
  );
  return res.data;
};
