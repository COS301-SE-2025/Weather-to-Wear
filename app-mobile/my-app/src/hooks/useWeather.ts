// src/hooks/useWeather.ts
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export interface ForecastItem {
  time: string;         // e.g. "2025-06-23 00:00"
  temperature: number;  // e.g. 10.1
  description: string;  // e.g. "Rain showers"
  icon?: string;        // e.g. "//cdn.weatherapi.com/..."
}

export interface WeatherSummary {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  willRain: boolean;
  mainCondition: string;
}

export interface WeatherData {
  location: string;
  forecast: ForecastItem[];
  source: string;
  summary: WeatherSummary;
}

export const useWeather = () => {
  const [city, setCity] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = city
          ? `${API_BASE}/api/weather?location=${encodeURIComponent(city)}`
          : `${API_BASE}/api/weather`;
        const res = await axios.get<WeatherData>(url);
        setWeather(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch weather data.');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city]);

  return { weather, loading, error, setCity };
};
