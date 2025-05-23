import axios from 'axios';
import { WeatherData } from './weather.interface';
import dotenv from 'dotenv';
import logger from '../../utils/logger';

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

interface OpenWeatherMapResponse {
  name: string;
  main: {
    temp: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
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
      logger.warn('IP location detection failed:', err.message);
    } else {
      logger.warn('IP location detection failed:', err);
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

  const primaryWeather = await fetchFromFreeWeatherAPI(location);
  if (primaryWeather) return primaryWeather;

  const fallbackWeather = await fetchFromOpenWeatherMap(location);
  if (fallbackWeather) return fallbackWeather;

  throw new Error('Both weather services failed. Please try again later.');
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
      logger.warn(`Free Weather API failed: ${err.message}`);
    } else {
      logger.warn('Free Weather API failed:', err);
    }
    return null;
  }
}

async function fetchFromOpenWeatherMap(location: string): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const baseUrl = process.env.OPENWEATHER_API_URL;

    const response = await axios.get<OpenWeatherMapResponse>(baseUrl!, {
      params: {
        q: location,
        appid: apiKey,
        units: 'metric', // important for celsius
      },
    });

    const data = response.data;

    return {
      location: data.name,
      temperature: data.main.temp,
      description: data.weather[0].description,
      icon: `http://openweathermap.org/img/w/${data.weather[0].icon}.png`,
      source: 'OpenWeatherMap',
    };
  } catch (err) {
    if (err instanceof Error) {
      logger.warn(`OpenWeatherMap fallback failed: ${err.message}`);
    } else {
      logger.warn('OpenWeatherMap fallback failed:', err);
    }
    return null;
  }
}
