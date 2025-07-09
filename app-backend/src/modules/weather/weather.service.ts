import axios from 'axios';
import { WeatherData, HourlyForecast, WeatherDataWithSummary } from './weather.interface';
import dotenv from 'dotenv';
import logger from '../../utils/logger';

const weatherCache = new Map<string, { data: WeatherDataWithSummary, time: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

export const __weatherCache = weatherCache;

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
    return "Pretoria";
  }
  return '';
}

export async function getWeatherByLocation(manualLocation?: string): Promise<WeatherDataWithSummary> {
  const location = manualLocation || await detectUserLocation();
  const cacheKey = location.trim().toLowerCase();
  const now = Date.now();

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

// --- FreeWeatherAPI (location) ---
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

// --- FreeWeatherAPI (location and date) ---
async function fetchFromFreeWeatherAPIForDay(location: string, date: string): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.FREE_WEATHER_API_KEY;
    const baseUrl = process.env.FREE_WEATHER_API_URL;

    const response = await axios.get<any>(baseUrl!, {
      params: {
        key: apiKey,
        q: location,
        days: 3,
        aqi: 'no',
        alerts: 'no'
      }
    });

    const forecastDay = response.data.forecast.forecastday.find((fd: any) => fd.date === date);

    if (!forecastDay) return null; // No data for that date

    const selected: HourlyForecast[] = forecastDay.hour.map((h: any) => ({
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
      logger.warn(`Free Weather API (by day) failed: ${err.message}`);
    } else {
      logger.warn('Free Weather API (by day) failed:', err);
    }
    return null;
  }
}

// --- OpenWeatherMap (location) ---
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

// --- OWM: Get 24 hours for specific date, with hourly interpolation ---
async function fetchFromOpenWeatherMapForDay(location: string, date: string): Promise<WeatherData | null> {
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

    // OWM only provides up to 5 days
    const availableDates = forecastRes.data.list.map((entry: any) => entry.dt_txt.substring(0, 10));
    if (!availableDates.includes(date)) {
      return null;
    }

    const dailyEntries = forecastRes.data.list.filter((entry: any) =>
      entry.dt_txt.startsWith(date)
    );

    if (!dailyEntries.length) return null;

    const threeHourly = dailyEntries.map((entry: any) => ({
      hour: parseInt(entry.dt_txt.substring(11, 13), 10),
      time: entry.dt_txt,
      temperature: entry.main.temp,
      description: entry.weather[0].description,
      icon: `http://openweathermap.org/img/w/${entry.weather[0].icon}.png`
    }));

    const hourlyForecast: HourlyForecast[] = [];
    for (let hour = 0; hour < 24; hour++) {

      const before = threeHourly.slice().reverse().find((e: typeof threeHourly[0]) => e.hour <= hour);
      const after = threeHourly.find((e: typeof threeHourly[0]) => e.hour >= hour);

      if (before && after && before.hour !== after.hour) {
        const frac = (hour - before.hour) / (after.hour - before.hour);
        const temperature = before.temperature + (after.temperature - before.temperature) * frac;

        const desc = (hour - before.hour) < (after.hour - hour) ? before.description : after.description;
        const icon = (hour - before.hour) < (after.hour - hour) ? before.icon : after.icon;

        hourlyForecast.push({
          time: `${date} ${hour.toString().padStart(2, '0')}:00`,
          temperature,
          description: desc,
          icon
        });
      } else if (before) {
        hourlyForecast.push({
          time: `${date} ${hour.toString().padStart(2, '0')}:00`,
          temperature: before.temperature,
          description: before.description,
          icon: before.icon
        });
      } else if (after) {
        hourlyForecast.push({
          time: `${date} ${hour.toString().padStart(2, '0')}:00`,
          temperature: after.temperature,
          description: after.description,
          icon: after.icon
        });
      } else {
        hourlyForecast.push({
          time: `${date} ${hour.toString().padStart(2, '0')}:00`,
          temperature: NaN,
          description: "Unavailable",
          icon: ""
        });
      }
    }

    return {
      location: name,
      forecast: hourlyForecast,
      source: 'OpenWeatherMap'
    };

  } catch (err) {
    if (err instanceof Error) {
      logger.warn(`OpenWeatherMap (by day) failed: ${err.message}`);
    } else {
      logger.warn('OpenWeatherMap (by day) failed:', err);
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

export async function getWeatherByDay(location: string, date: string): Promise<WeatherDataWithSummary> {
  if (!location || !date) throw new Error('Location and date are required');
  const cacheKey = `${location.trim().toLowerCase()}|${date}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  // Try FreeWeatherAPI
  const primaryWeather = await fetchFromFreeWeatherAPIForDay(location, date);
  if (primaryWeather) {
    const summary = summarizeWeather(primaryWeather.forecast);
    const result = { ...primaryWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  // Fallback to OWM
  const fallbackWeather = await fetchFromOpenWeatherMapForDay(location, date);
  if (fallbackWeather) {
    const summary = summarizeWeather(fallbackWeather.forecast);
    const result = { ...fallbackWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  throw new Error('Both weather services failed. Please try again later.');
}