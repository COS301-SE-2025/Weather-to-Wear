// src/services/eventsApi.ts
import axios from 'axios';
import exp from 'constants';

const API_URL = 'http://localhost:5001/api/events';

export const fetchAllEvents = async () => {
  try {
    const response = await axios.get(API_URL + '/getEvents', {
      headers: {
        Authorization: Bearer ${localStorage.getItem('token')}
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
  const token = localStorage.getItem('token');
  const res = await axios.post(${API_URL}/createEvent, eventData, {
    headers: {
      Authorization: Bearer ${token},
    },
  });
  return res.data;
};

export const updateEvent = async (eventData: {
  id: string;
  name?: string;
  location?: string;
  weather?: string;
  dateFrom?: string;
  dateTo?: string;
  style?: string;
}) => {
  const token = localStorage.getItem('token');
  const res = await axios.put(${API_URL}/updateEvent, eventData, {
    headers: { Authorization: Bearer ${token} },
  });
  return res.data;
};

export const deleteEvent = async (id: string) => {
  const token = localStorage.getItem('token');
  const res = await axios.delete(${API_URL}/deleteEvent, {
    headers: { Authorization: Bearer ${token} },
    data: { id },
  });
  return res.data;
};