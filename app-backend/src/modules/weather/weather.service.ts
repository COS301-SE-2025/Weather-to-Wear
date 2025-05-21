import axios from 'axios';
import { WeatherData } from './weather.interface';

import dotenv from 'dotenv';
dotenv.config();

interface IPApiResponse {
  city: string;
  country: string;
  regionName: string;
  lat: number;
  lon: number;
  [key: string]: any;
}

interface FreeWeatherAPIResponse {
  location: {
    name: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  };
}

// try get user location via IP. if fail return empty string for manual input
async function detectUserLocation(): Promise<string> {
  try {
    const response = await axios.get<IPApiResponse>('http://ip-api.com/json');
    if (response.data && response.data.city) {
      return response.data.city;
    }
  } catch (err) {
    if (err instanceof Error) {
      console.warn('IP location detection failed:', err.message);
    } else {
      console.warn('IP location detection failed:', err);
    }
  }
  return '';
}

// public - fetch weather based on location. 
// automatically detect location if none is passed
export async function getWeatherByLocation(manualLocation?: string): Promise<WeatherData> {
  const location = manualLocation || await detectUserLocation();

  if (!location) {
    throw new Error('Could not determine user location automatically. Please provide it manually.');
  }

  const weather = await fetchFromFreeWeatherAPI(location);

  if (weather) return weather;

  // fallback will be handled in Step 4 (OpenWeatherMap)
  throw new Error('Primary weather service failed. Fallback not yet implemented.');
}


async function fetchFromFreeWeatherAPI(location: string): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.FREE_WEATHER_API_KEY;
    const baseUrl = process.env.FREE_WEATHER_API_URL;

    const response = await axios.get<FreeWeatherAPIResponse>(baseUrl!, {
      params: {
        key: apiKey,
        q: location,
      },
    });

    const data = response.data;

    return {
      location: data.location.name,
      temperature: data.current.temp_c,
      description: data.current.condition.text,
      icon: data.current.condition.icon,
      source: 'FreeWeatherAPI',
    };
  } catch (err) {
    if (err instanceof Error) {
      console.warn(`Free Weather API failed: ${err.message}`);
    } else {
      console.warn('Free Weather API failed:', err);
    }
    return null;
  }
}
