// src/services/closetApi.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/closet';

// Utility to get the JWT from localStorage
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// shape of a closet item coming from the backend
export interface ClosetItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  favorite?: boolean;
  // any other fields your API returns...
}

// fetch all closet items and return the typed data array
export const fetchAllItems = async (): Promise<ClosetItem[]> => {
  const res = await axios.get<ClosetItem[]>(`${BASE_URL}/all`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  return res.data;
};

// fetch items by category
export const fetchByCategory = async (category: string): Promise<ClosetItem[]> => {
  const res = await axios.get<ClosetItem[]>(`${BASE_URL}/category/${category}`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  return res.data;
};

// upload a single image
export const uploadImage = (image: File, category: string, layerCategory: string) => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('category', category);
  formData.append('layerCategory', layerCategory);
  return axios.post(`${BASE_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...getAuthHeader(),
    },
  });
};

// upload multiple images
export const uploadBatch = (images: File[], category: string) => {
  const formData = new FormData();
  images.forEach((img) => formData.append('images', img));
  formData.append('category', category);
  return axios.post(`${BASE_URL}/upload/batch`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...getAuthHeader(),
    },
  });
};

// delete a closet item by id
export const deleteItem = async (id: string): Promise<{ success: boolean }> => {
  const res = await axios.delete<{ success: boolean }>(`${BASE_URL}/${id}`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  return res.data;
};
