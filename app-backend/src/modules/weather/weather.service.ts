import axios from 'axios';
import { WeatherData, HourlyForecast } from './weather.interface';
import dotenv from 'dotenv';
import logger from '../../utils/logger';

dotenv.config();

interface IPApiResponse {
  city: string;
  lat: number;
  lon: number;
  [key: string]: any;
}

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

// --- FreeWeatherAPI Integration ---
async function fetchFromFreeWeatherAPI(location: string): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.FREE_WEATHER_API_KEY;
    const baseUrl = process.env.FREE_WEATHER_API_URL;

    const response = await axios.get<any>(baseUrl!, {
      params: {
        key: apiKey,
        q: location,
        days: 1,
        aqi: 'no',
        alerts: 'no'
      }
    });

    const forecastHours = response.data.forecast.forecastday[0].hour;
    const now = new Date();
    const currentHour = now.getHours();

    const selected: HourlyForecast[] = forecastHours
      .filter((h: any) => {
        const hourTime = new Date(h.time);
        return hourTime >= now && hourTime <= new Date(now.getTime() + 6 * 60 * 60 * 1000);
      })
      .map((h: any) => ({
        time: h.time,
        temperature: h.temp_c,
        description: h.condition.text,
        icon: h.condition.icon
      }));

    return {
      location: response.data.location.name,
      forecast: selected,
      source: 'FreeWeatherAPI'
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

// --- OpenWeatherMap Integration ---
async function fetchFromOpenWeatherMap(location: string): Promise<WeatherData | null> {
  try {
    // Step 1: Get coordinates for the location
    const geoRes = await axios.get<any>('http://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: location,
        appid: process.env.OPENWEATHER_API_KEY
      }
    });

    if (!geoRes.data.length) throw new Error('Geo lookup failed');
    const { lat, lon, name } = geoRes.data[0];

    // Step 2: Fetch forecast using 3-hour interval data
    const forecastRes = await axios.get<any>('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat,
        lon,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const now = new Date();

    // Step 3: Get next 6 upcoming forecast points (3-hour intervals)
    const upcoming: HourlyForecast[] = forecastRes.data.list
      .filter((entry: any) => new Date(entry.dt * 1000) > now)
      .slice(0, 6) // grab the next 6 entries
      .map((entry: any) => ({
        time: entry.dt_txt,
        temperature: entry.main.temp,
        description: entry.weather[0].description,
        icon: `http://openweathermap.org/img/w/${entry.weather[0].icon}.png`
      }));

    return {
      location: name,
      forecast: upcoming,
      source: 'OpenWeatherMap'
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

