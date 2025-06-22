// src/services/eventsApi.ts
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/events';

export const fetchAllEvents = async () => {
  try {
    const response = await axios.get(API_URL + '/getEvents', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

export const createEvent = async (eventData: {
  name: string;
  location: string;
  weather: string;
  dateFrom: string;
  dateTo: string;
  style: string;
}) => {
  const token = localStorage.getItem('token'); // assuming you store JWT here
  const res = await axios.post(`${API_URL}/createEvent`, eventData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

// Add other CRUD operations as needed