import axios from 'axios';
import exp from 'constants';
import { API_BASE } from '../config';

const API_URL = `${API_BASE}/api/events`;

type Style = 'Casual' | 'Formal' | 'Athletic' | 'Party' | 'Business' | 'Outdoor';

export type EventDto = {

  id: string;
  name: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  style: Style;
  isTrip?: boolean;
  weather?: string | null;
};

export const fetchAllEvents = async (): Promise<EventDto[]> => {

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

export const fetchAllTrips = async (): Promise<EventDto[]> => {
  try {
    const response = await axios.get(API_URL + '/getEvents', {
      params: { isTrip: true },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
};

export const getEventById = async (id: string): Promise<EventDto> => {
  try {
    const response = await axios.get(API_URL + '/getEvent', {
      params: { id },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

export const createEvent = async (eventData: {
  name: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  style: string;
  isTrip?: boolean;
}): Promise<EventDto> => {
  const token = localStorage.getItem('token');
  const res = await axios.post(`${API_URL}/createEvent`, eventData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const createTrip = async (tripData: {
  name: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  style: string;
}): Promise<EventDto> => {
  return createEvent({ ...tripData, isTrip: true });
};

export const updateEvent = async (eventData: {
  id: string;
  name?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  style?: string;
  isTrip?: boolean;
}) => {
  const token = localStorage.getItem('token');
  const res = await axios.put(`${API_URL}/updateEvent`, eventData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteEvent = async (id: string) => {
  const token = localStorage.getItem('token');
  const res = await axios.delete(`${API_URL}/deleteEvent`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { id },
  });
  return res.data;
};