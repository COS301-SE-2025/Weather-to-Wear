// src/hooks/useWeather.ts
import { useEffect, useState } from 'react';
import axios from 'axios';


export interface ForecastItem {
  time: string;         
  temperature: number;  
  description: string;  
  icon?: string;        
}

export interface WeatherData {
  location: string;
  forecast: ForecastItem[];
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
          ? `http://localhost:5001/api/weather?location=${city}`
          : `http://localhost:5001/api/weather?`;
        const res = await axios.get<WeatherData>(url);
        setWeather(res.data);
      } catch (err) {
        setError('Failed to fetch weather data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city]);  

  return { weather, loading, error, setCity };
};