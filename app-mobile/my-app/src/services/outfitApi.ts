// src/services/outfitApi.ts
import axios from 'axios';
import { fetchWithAuth } from "./fetchWithAuth";


const API_URL = 'http://localhost:5001/api/outfits';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}


export interface OutfitItem {
    closetItemId: string;
    imageUrl: string;
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
    favourite?: boolean; // indicates if the outfit is a favorite
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
    if (style) body.style = style;
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
    const res = await axios.get<
        // we expect the backend to send back the Prisma shape,
        // where each outfitItem may have a nested closetItem.filename
        (RecommendedOutfit & { outfitItems: Array<Partial<OutfitItem> & { closetItem?: { filename: string } }> })[]
    >(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    // Normalize so every OutfitItem.imageUrl is filled—prefer the recommender’s imageUrl,
    // fallback to the closetItem.filename from Prisma.
    return res.data.map(o => ({
        ...o,
        outfitItems: o.outfitItems.map(it => ({
            ...it,
            imageUrl:
                it.imageUrl && it.imageUrl.length > 0
                    ? it.imageUrl
                    : // @ts-ignore: if closetItem was included by Prisma
                    `/uploads/${it.closetItem!.filename}`,
        })),
    }));
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

export function toggleOutfitFavourite(id: string) {
  return axios.patch(
    `${API_URL}/${id}/favourite`,
    {},
    { headers: { ...getAuthHeader() } }
  );
}

export async function createOutfitManual(data: any) {
  const token = localStorage.getItem("token");
  const res = await fetchWithAuth("http://localhost:5001/api/outfits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to create outfit");
  }
  return res.json();
}
