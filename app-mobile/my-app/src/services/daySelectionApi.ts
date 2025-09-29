import http from './http';
import { API_BASE } from '../config';

const URL = `${API_BASE}/api/day-selections`;

export type DaySelectionDTO = {
  id: string;
  date: string; 
  location?: string;
  style?: string;
  items: { closetItemId: string; layerCategory: string; sortOrder: number }[];
  weatherAvg?: number;
  weatherMin?: number;
  weatherMax?: number;
  willRain?: boolean;
  mainCondition?: string;
  outfitId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function getDaySelection(dateISO: string) {
  const { data } = await http.get<DaySelectionDTO | null>(URL, {
    params: { date: dateISO },
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  return data;
}

export async function upsertDaySelection(payload: {
  date: string; 
  location?: string;
  style?: string;
  items: { closetItemId: string; layerCategory: string; sortOrder: number }[];
  weather: { avgTemp: number; minTemp: number; maxTemp: number; willRain: boolean; mainCondition: string };
  outfitId?: string | null;
}) {
  const { data } = await http.post<DaySelectionDTO>(URL, payload, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  return data;
}

export async function deleteDaySelection(dateISO: string) {
  const url = `${URL}/${encodeURIComponent(dateISO)}`;
  await http.delete(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
}