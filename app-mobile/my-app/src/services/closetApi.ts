// src/api/closetApi.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/closet'; // Adjust if your backend runs on a different port

export const fetchAllItems = () => axios.get(`${BASE_URL}/all`);

export const fetchByCategory = (category: string) =>
  axios.get(`${BASE_URL}/category/${category}`);

export const uploadImage = (image: File, category: string) => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('category', category);
  return axios.post(`${BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadBatch = (images: File[], category: string) => {
  const formData = new FormData();
  images.forEach((img) => formData.append('images', img));
  formData.append('category', category);
  return axios.post(`${BASE_URL}/upload/batch`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
