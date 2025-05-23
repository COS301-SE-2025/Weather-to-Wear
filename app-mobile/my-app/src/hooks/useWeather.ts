import { useEffect, useState } from 'react';
import axios from 'axios';

interface ForecastItem {
  time: string;
  temperature: number;
  description: string;
  icon?: string;
}

interface WeatherData {
  location: string;
  forecast: ForecastItem[];
  source: 'FreeWeatherAPI' | 'OpenWeatherMap';
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/weather');
        setWeather(res.data); // expects location, forecast, source
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
