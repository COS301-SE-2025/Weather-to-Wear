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

export const createEvent = async (eventData: any) => {
  try {
    const response = await axios.post(API_URL + '/createEvent', eventData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Add other CRUD operations as needed