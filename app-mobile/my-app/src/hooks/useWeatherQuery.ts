// src/hooks/useWeatherQuery.ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../config';

export interface ForecastItem { time: string; temperature: number; description: string; icon?: string; }
export interface WeatherSummary { avgTemp: number; minTemp: number; maxTemp: number; willRain: boolean; mainCondition: string; }
export interface WeatherData { location: string; forecast: ForecastItem[]; source: string; summary: WeatherSummary; }

export function useWeatherQuery(city?: string): UseQueryResult<WeatherData, Error> {
  const key = ['weather', (city?.trim() || 'auto')];

  return useQuery<WeatherData, Error>({
    queryKey: key,
    queryFn: async () => {
      const url = city && city.trim()
        ? `${API_BASE}/api/weather?location=${encodeURIComponent(city.trim())}`
        : `${API_BASE}/api/weather`;
      const { data } = await axios.get<WeatherData>(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return data;
    },
  });
}