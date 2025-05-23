// src/hooks/useWeather.ts
import { useEffect, useState } from 'react';
import axios from 'axios';

interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  icon?: string;
  source: 'FreeWeatherAPI' | 'OpenWeatherMap';
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/weather'); // <-- matches your app.ts route
        setWeather(res.data);
      } catch (err: any) {
        setError('Failed to fetch weather data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  return { weather, loading, error };
};
