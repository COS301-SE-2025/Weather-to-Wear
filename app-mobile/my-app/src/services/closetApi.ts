import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/closet';

// Utility to get the JWT from localStorage
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const fetchAllItems = () =>
  axios.get(`${BASE_URL}/all`, {
    headers: {
      ...getAuthHeader(),
    },
  });

export const fetchByCategory = (category: string) =>
  axios.get(`${BASE_URL}/category/${category}`, {
    headers: {
      ...getAuthHeader(),
    },
  });

// export const uploadImage = (image: File, category: string) => {
//   const formData = new FormData();
//   formData.append('image', image);
//   formData.append('category', category);
//   return axios.post(`${BASE_URL}/upload`, formData, {
//     headers: {
//       'Content-Type': 'multipart/form-data',
//       ...getAuthHeader(),
//     },
//   });
// };

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

export const deleteItem = (id: string) =>
  axios.delete(`${BASE_URL}/${id}`, {
    headers: {
      ...getAuthHeader(),
    },
  });