// src/services/eventsApi.ts
import { fetchWithAuth } from './fetchWithAuth';

export type Style = 'Formal' | 'Casual' | 'Athletic' | 'Party' | 'Business' | 'Outdoor';

export interface EventDto {
  id: string;
  name: string | null;
  location: string;
  dateFrom: string;          // ISO string from backend
  dateTo: string;            // ISO string from backend
  style: Style;
  weather?: string | null;   // may be null or a JSON string
  isTrip?: boolean;          // trips only when true (backend field `isTrip`)
}

const BASE = 'http://localhost:5001/api/events';

export async function fetchAllEvents(): Promise<EventDto[]> {
  const res = await fetchWithAuth(`${BASE}/getEvents`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  return res.json();
}

export async function createEvent(input: {
  name: string;
  location: string;
  dateFrom: string;  // ISO
  dateTo: string;    // ISO
  style: Style;
  isTrip?: boolean;
}): Promise<EventDto> {
  const res = await fetchWithAuth(`${BASE}/createEvent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create event (${res.status})`);
  return res.json();
}

export async function updateEvent(input: {
  id: string;
  name: string;
  location: string;
  dateFrom: string;  // ISO
  dateTo: string;    // ISO
  style: Style | string;
}): Promise<EventDto> {
  const res = await fetchWithAuth(`${BASE}/updateEvent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to update event (${res.status})`);
  return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetchWithAuth(`${BASE}/deleteEvent?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete event (${res.status})`);
}
