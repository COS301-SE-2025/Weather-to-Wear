import axios from 'axios';
import { WeatherData, HourlyForecast, WeatherDataWithSummary } from './weather.interface';
import dotenv from 'dotenv';
import logger from '../../utils/logger';

// Simple in-memory cache
const weatherCache = new Map<string, { data: WeatherDataWithSummary, time: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

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

// export async function getWeatherByLocation(manualLocation?: string): Promise<WeatherData> {
//   const location = manualLocation || await detectUserLocation();

//   if (!location) {
//     throw new Error('Could not determine user location automatically. Please provide it manually.');
//   }

//   const primaryWeather = await fetchFromFreeWeatherAPI(location);
//   if (primaryWeather) return primaryWeather;

//   const fallbackWeather = await fetchFromOpenWeatherMap(location);
//   if (fallbackWeather) return fallbackWeather;

//   throw new Error('Both weather services failed. Please try again later.');
// }

export async function getWeatherByLocation(manualLocation?: string): Promise<WeatherDataWithSummary> {
  const location = manualLocation || await detectUserLocation();
  const cacheKey = location.trim().toLowerCase();
  const now = Date.now();

  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const primaryWeather = await fetchFromFreeWeatherAPI(location, 24);
  if (primaryWeather) {
    const summary = summarizeWeather(primaryWeather.forecast);
    const result = { ...primaryWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  const fallbackWeather = await fetchFromOpenWeatherMap(location, 24);
  if (fallbackWeather) {
    const summary = summarizeWeather(fallbackWeather.forecast);
    const result = { ...fallbackWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  throw new Error('Both weather services failed. Please try again later.');
}

// --- FreeWeatherAPI Integration ---
// async function fetchFromFreeWeatherAPI(location: string): Promise<WeatherData | null> {
//   try {
//     const apiKey = process.env.FREE_WEATHER_API_KEY;
//     const baseUrl = process.env.FREE_WEATHER_API_URL;

//     const response = await axios.get<any>(baseUrl!, {
//       params: {
//         key: apiKey,
//         q: location,
//         days: 1,
//         aqi: 'no',
//         alerts: 'no'
//       }
//     });

//     const forecastHours = response.data.forecast.forecastday[0].hour;
//     const now = new Date();
//     const currentHour = now.getHours();

//     const selected: HourlyForecast[] = forecastHours
//       .filter((h: any) => {
//         const hourTime = new Date(h.time);
//         return hourTime >= now && hourTime <= new Date(now.getTime() + 6 * 60 * 60 * 1000);
//       })
//       .map((h: any) => ({
//         time: h.time,
//         temperature: h.temp_c,
//         description: h.condition.text,
//         icon: h.condition.icon
//       }));

//     return {
//       location: response.data.location.name,
//       forecast: selected,
//       source: 'FreeWeatherAPI'
//     };

//   } catch (err) {
//     if (err instanceof Error) {
//       logger.warn(`Free Weather API failed: ${err.message}`);
//     } else {
//       logger.warn('Free Weather API failed:', err);
//     }
//     return null;
//   }
// }

async function fetchFromFreeWeatherAPI(location: string, hours: number): Promise<WeatherData | null> {
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
    // get all hours >= now, up to "hours" ahead
    const limit = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const selected: HourlyForecast[] = forecastHours
      .filter((h: any) => {
        const hourTime = new Date(h.time);
        return hourTime >= now && hourTime <= limit;
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
// async function fetchFromOpenWeatherMap(location: string): Promise<WeatherData | null> {
//   try {
//     // Step 1: Get coordinates for the location
//     const geoRes = await axios.get<any>('http://api.openweathermap.org/geo/1.0/direct', {
//       params: {
//         q: location,
//         appid: process.env.OPENWEATHER_API_KEY
//       }
//     });

//     if (!geoRes.data.length) throw new Error('Geo lookup failed');
//     const { lat, lon, name } = geoRes.data[0];

//     // Step 2: Fetch forecast using 3-hour interval data
//     const forecastRes = await axios.get<any>('https://api.openweathermap.org/data/2.5/forecast', {
//       params: {
//         lat,
//         lon,
//         appid: process.env.OPENWEATHER_API_KEY,
//         units: 'metric'
//       }
//     });

//     const now = new Date();

//     // Step 3: Get next 6 upcoming forecast points (3-hour intervals)
//     const upcoming: HourlyForecast[] = forecastRes.data.list
//       .filter((entry: any) => new Date(entry.dt * 1000) > now)
//       .slice(0, 6) // grab the next 6 entries
//       .map((entry: any) => ({
//         time: entry.dt_txt,
//         temperature: entry.main.temp,
//         description: entry.weather[0].description,
//         icon: `http://openweathermap.org/img/w/${entry.weather[0].icon}.png`
//       }));

//     return {
//       location: name,
//       forecast: upcoming,
//       source: 'OpenWeatherMap'
//     };

//   } catch (err) {
//     if (err instanceof Error) {
//       logger.warn(`OpenWeatherMap fallback failed: ${err.message}`);
//     } else {
//       logger.warn('OpenWeatherMap fallback failed:', err);
//     }
//     return null;
//   }
// }

async function fetchFromOpenWeatherMap(location: string, hours: number): Promise<WeatherData | null> {
  try {
    const geoRes = await axios.get<any>('http://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: location,
        appid: process.env.OPENWEATHER_API_KEY
      }
    });

    if (!geoRes.data.length) throw new Error('Geo lookup failed');
    const { lat, lon, name } = geoRes.data[0];

    const forecastRes = await axios.get<any>('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat,
        lon,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const now = new Date();
    const limit = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const upcoming: HourlyForecast[] = forecastRes.data.list
      .filter((entry: any) => {
        const entryTime = new Date(entry.dt * 1000);
        return entryTime > now && entryTime <= limit;
      })
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

// -- Weather type abstraction helper -> extracts a summary of weather -> to be used in rule based engine --
export interface WeatherSummary {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  willRain: boolean;
  mainCondition: string;
}

export function summarizeWeather(forecast: HourlyForecast[]): WeatherSummary {
  if (!forecast.length) return { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: "unknown" };
  const temps = forecast.map(f => f.temperature);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const willRain = forecast.some(f =>
    /rain|shower|drizzle/i.test(f.description)
  );
  const condCount = forecast.reduce((acc, cur) => {
    const desc = cur.description.toLowerCase();
    acc[desc] = (acc[desc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mainCondition = Object.keys(condCount).reduce((a, b) => condCount[a] > condCount[b] ? a : b);
  return { avgTemp, minTemp, maxTemp, willRain, mainCondition };
}
