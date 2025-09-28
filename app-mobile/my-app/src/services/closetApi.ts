import axios from 'axios';
import { API_BASE } from '../config';
import type { ClosetItemDTO } from './closetApiTypes';

const BASE_URL = `${API_BASE}/api/closet`;

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const fetchAllItems = () =>
  axios.get<ClosetItemDTO[]>(`${BASE_URL}/all`, {
    headers: { ...getAuthHeader() },
  });

export function toggleFavourite(id: string) {
  return axios.patch<{ id: string; favourite: boolean }>(
    `${BASE_URL}/${id}/favourite`,
    {},
    { headers: { ...getAuthHeader() } }
  );
}

export const fetchByCategory = (category: string) =>
  axios.get<ClosetItemDTO[]>(`${BASE_URL}/category/${category}`, {
    headers: { ...getAuthHeader() },
  });

export const uploadImage = (image: File, category: string, layerCategory: string) => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('category', category);
  formData.append('layerCategory', layerCategory);
  return axios.post<ClosetItemDTO>(`${BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeader() },
  });
};


export const uploadBatch = (images: File[], category: string) => {
  const formData = new FormData();
  images.forEach((img) => formData.append('images', img));
  formData.append('category', category);
  return axios.post<ClosetItemDTO[]>(`${BASE_URL}/upload/batch`, formData, {
    headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeader() },
  });
};

export const deleteItem = (id: string) =>
  axios.delete<void>(`${BASE_URL}/${id}`, {
    headers: { ...getAuthHeader() },
  });

export const getItemCount = async (): Promise<number> => {
  const resp = await fetchAllItems();
  return Array.isArray(resp.data) ? resp.data.length : 0;
};
