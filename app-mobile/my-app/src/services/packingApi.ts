import axios from 'axios';
import { API_BASE } from '../config';

const API_URL = `${API_BASE}/api/packing`;

export type PackingListDto = {
  id: string;
  tripId: string;
  items: Array<{
    id: string;
    packed: boolean;
    closetItemId: string;
    closetItem?: { id: string; name: string; imageUrl?: string | null };
  }>;
  outfits: Array<{
    id: string;
    packed: boolean;
    outfitId: string;
    outfit?: { id: string; name: string; coverImageUrl?: string | null };
  }>;
  others: Array<{ id: string; label: string; packed: boolean }>;
};

export type PackingCreateInput = {
  tripId: string;
  items: string[];   
  outfits: string[]; 
  others: string[];  
};

export type PackingUpdateInput = {
  items?: Array<{ id: string; packed: boolean }>;
  outfits?: Array<{ id: string; packed: boolean }>;
  others?: Array<{ id: string; packed: boolean }>;
};

export async function getPackingList(tripId: string): Promise<PackingListDto | null> {
  try {
    const response = await axios.get(`${API_URL}/${tripId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function createPackingList(input: PackingCreateInput): Promise<PackingListDto> {
  const response = await axios.post(API_URL, input, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
}

export async function updatePackingList(
  listId: string,
  input: PackingUpdateInput
): Promise<PackingListDto> {
  const response = await axios.put(`${API_URL}/${listId}`, input, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
}

export async function deletePackingList(listId: string): Promise<void> {
  await axios.delete(`${API_URL}/${listId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
}