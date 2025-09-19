import axios from 'axios';
import { WeatherData, HourlyForecast, WeatherDataWithSummary, CityMatch } from './weather.interface';
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

// automatically detect user's location, otherwise fallback to pretoria 
async function detectUserLocation(): Promise<string> {
  try {
    const response = await axios.get<IPApiResponse>('http://ip-api.com/json');
    if (response.data && response.data.city) {
      return response.data.city;
    }
  } catch (err) {
    console.log("User Location Detection Failed, falling back to pretoria");
    return "Pretoria";
  }
  return '';
}

// If multiple cities are returned, avoid ambiguity by letting the user decide
export async function searchCities(query: string): Promise<CityMatch[]> {
  try {
    const geo = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: {
        name: query,
        count: 10,
        format: 'json'
      }
    });
    const results = (geo.data?.results || []) as any[];
    return results.map(r => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone
    }));
  } catch (err) {
    if (err instanceof Error) logger.warn(`Open-Meteo geocoding failed: ${err.message}`);
    else logger.warn('Open-Meteo geocoding failed:', err);
    return [];
  }
}

// Choose top match (we still expose /search-cities for UI selection path)
async function geocodeOpenMeteoTop(location: string): Promise<{lat: number; lon: number; name: string; timezone?: string} | null> {
  try {
    const matches = await searchCities(location);
    if (!matches.length) return null;
    const top = matches[0];
    return { lat: top.latitude, lon: top.longitude, name: `${top.name}${top.country ? ', ' + top.country : ''}`, timezone: top.timezone };
  } catch (err) {
    return null;
  }
}

// Open-Meteo makes use of codes instead of descriptions, here we map them
function weatherCodeToDescription(code: number): string {
  // Source: Open-Meteo WMO weather interpretation codes
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45) return 'Fog';
  if (code === 48) return 'Depositing rime fog';
  if ([51,53,55].includes(code)) return 'Drizzle';
  if ([56,57].includes(code)) return 'Freezing drizzle';
  if ([61,63,65].includes(code)) return 'Rain';
  if ([66,67].includes(code)) return 'Freezing rain';
  if ([71,73,75].includes(code)) return 'Snowfall';
  if (code === 77) return 'Snow grains';
  if ([80,81,82].includes(code)) return 'Rain showers';
  if ([85,86].includes(code)) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if ([96,99].includes(code)) return 'Thunderstorm with hail';
  return 'Unknown';
}

// Open-Meteo's icon URL. 
function weatherCodeToIcon(code: number, isDay: boolean): string | undefined {
  const base = process.env.OPEN_METEO_ICON_BASE; // https://open-meteo.com/images/meteocons
  if (!base) return undefined;
  // Icon naming scheme. Keep simple mapping:
  const map: Record<number, string> = {
    0: 'clear',
    1: 'mostly-clear',
    2: 'partly-cloudy',
    3: 'overcast',
    45: 'fog',
    48: 'fog',
    51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
    56: 'freezing-drizzle', 57: 'freezing-drizzle',
    61: 'rain', 63: 'rain', 65: 'rain',
    66: 'freezing-rain', 67: 'freezing-rain',
    71: 'snow', 73: 'snow', 75: 'snow',
    77: 'snow',
    80: 'showers', 81: 'showers', 82: 'showers',
    85: 'snow-showers', 86: 'snow-showers',
    95: 'thunderstorm',
    96: 'thunderstorm', 99: 'thunderstorm'
  };
  const name = map[code] || 'na';
  const variant = isDay ? 'day' : 'night';
  return `${base}/${name}-${variant}.svg`;
}

// Build HourlyForecast[] from Open-Meteo hourly arrays
function buildHourlyFromOpenMeteo(hourly: any, tz?: string): HourlyForecast[] {
  const times: string[] = hourly.time || [];
  const temps: number[] = hourly.temperature_2m || [];
  const codes: number[] = hourly.weathercode || [];
  const isDayArr: number[] = hourly.is_day || []; // 1=day,0=night (if requested)

  const precipProb: number[] = hourly.precipitation_probability || [];
  const precip: number[] = hourly.precipitation || [];

  const out: HourlyForecast[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const temp = typeof temps[i] === 'number' ? temps[i] : NaN;
    const code = typeof codes[i] === 'number' ? codes[i] : -1;
    const desc = weatherCodeToDescription(code);
    const isDay = typeof isDayArr[i] === 'number' ? isDayArr[i] === 1 : true;
    const icon = weatherCodeToIcon(code, isDay);
    out.push({
      time: t, // Open-Meteo returns ISO local time strings matching timezone=auto
      temperature: temp,
      description: desc,
      icon
    });
  }
  return out;
}

// Primary: Open-Meteo (location → 7 days hourly)
async function fetchFromOpenMeteo(location: string, hours: number | null, opts?: { days?: number }): Promise<WeatherData | null> {
  try {
    const geo = await geocodeOpenMeteoTop(location);
    if (!geo) throw new Error('Geocoding failed');
    const { lat, lon, name, timezone } = geo;

    // 7-day default for planner; if hours is provided, we still request enough and slice.
    const days = opts?.days ?? 7;

    const resp = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        timezone: 'auto',
        hourly: [
          'temperature_2m',
          'weathercode',
          'precipitation',
          'precipitation_probability',
          'is_day'
        ].join(','),
        forecast_days: days
      }
    });

    const hourly = resp.data?.hourly;
    if (!hourly?.time?.length) throw new Error('No hourly data');

    let selected = buildHourlyFromOpenMeteo(hourly, timezone);

    // If hours constraint is specified (e.g., legacy "next 24h"), filter now .. now+hours
    if (typeof hours === 'number' && hours > 0) {
      const now = new Date();
      const limit = new Date(now.getTime() + hours * 60 * 60 * 1000);
      selected = selected.filter(h => {
        const ht = new Date(h.time);
        return ht >= now && ht <= limit;
      });
    }

    return {
      location: name,
      forecast: selected,
      source: 'openMeteo'
    };
  } catch (err) {
    if (err instanceof Error) logger.warn(`Open-Meteo primary failed: ${err.message}`);
    else logger.warn('Open-Meteo primary failed:', err);
    return null;
  }
}

// Primary (specific date → 24h hourly for that date) 
async function fetchFromOpenMeteoForDay(location: string, date: string): Promise<WeatherData | null> {
  try {
    const geo = await geocodeOpenMeteoTop(location);
    if (!geo) throw new Error('Geocoding failed');
    const { lat, lon, name } = geo;

    // Request exactly that date (start & end). Open-Meteo supports hourly ranges via start/end dates.
    const start = `${date}T00:00`;
    const end = `${date}T23:59`;

    const resp = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        timezone: 'auto',
        hourly: [
          'temperature_2m',
          'weathercode',
          'precipitation',
          'precipitation_probability',
          'is_day'
        ].join(','),
        start_date: date,
        end_date: date
      }
    });

    const hourly = resp.data?.hourly;
    if (!hourly?.time?.length) return null;

    // Keep only that date’s timestamps (safety)
    let selected = buildHourlyFromOpenMeteo(hourly);
    selected = selected.filter(h => h.time.startsWith(date));

    // Ensure we produce 24 entries or fewer if provider has gaps
    return {
      location: name,
      forecast: selected,
      source: 'openMeteo'
    };
  } catch (err) {
    if (err instanceof Error) logger.warn(`Open-Meteo (by day) failed: ${err.message}`);
    else logger.warn('Open-Meteo (by day) failed:', err);
    return null;
  }
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

// Weather type abstraction helper -> extracts a summary of weather -> to be used in rule based engine
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

  // Strengthen willRain using description + precipitation signals (if present)
  const hasRainyDesc = forecast.some(f => /rain|shower|drizzle/i.test(f.description));
  // We didn’t include numeric values on HourlyForecast, so we infer via descriptions only here.
  // If you want, we can extend HourlyForecast later with precip fields (kept minimal now).
  const willRain = hasRainyDesc;

  const condCount = forecast.reduce((acc, cur) => {
    const desc = cur.description.toLowerCase();
    acc[desc] = (acc[desc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mainCondition = Object.keys(condCount).reduce((a, b) => condCount[a] > condCount[b] ? a : b);
  return { avgTemp, minTemp, maxTemp, willRain, mainCondition };
}


// --------------------------- PUBLIC SERVICE API --------------------------

export async function getWeatherByLocation(manualLocation?: string): Promise<WeatherDataWithSummary> {
  const location = manualLocation || await detectUserLocation();
  const cacheKey = `loc:${location.trim().toLowerCase()}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  // PRIMARY: Open-Meteo — keep legacy “next 24h” behavior here (UI dependence), but request extra data
  const primaryWeather = await fetchFromOpenMeteo(location, 24, { days: 7 });
  if (primaryWeather) {
    const summary = summarizeWeather(primaryWeather.forecast);
    const result = { ...primaryWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  // Fallback: FreeWeatherAPI
  const fallback1 = await fetchFromFreeWeatherAPI(location, 24);
  if (fallback1) {
    const summary = summarizeWeather(fallback1.forecast);
    const result = { ...fallback1, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  // Fallback: OpenWeatherMap
  const fallback2 = await fetchFromOpenWeatherMap(location, 24);
  if (fallback2) {
    const summary = summarizeWeather(fallback2.forecast);
    const result = { ...fallback2, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  throw new Error('Both weather services failed. Please try again later.');
}

// NEW: full 7-day planner (hourly across 7 days) 
export async function getWeatherWeek(location: string): Promise<WeatherDataWithSummary> {
  if (!location) throw new Error('Location is required');
  const cacheKey = `week:${location.trim().toLowerCase()}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  // PRIMARY: Open-Meteo (7 days)
  const primary = await fetchFromOpenMeteo(location, null, { days: 7 });
  if (primary && primary.forecast.length) {
    const summary = summarizeWeather(primary.forecast);
    const result = { ...primary, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  // Fallback behavior:
  // If Open-Meteo fails AND others can only serve next ~1-5 days,
  // we return “can’t fetch” if user expects full week. But we keep attempt:
  const fw = await fetchFromFreeWeatherAPI(location, 24 * 2); // up to 2 days (approx)
  if (fw && fw.forecast.length) {
    // Not enough for a full week; signal insufficient data by returning empty (UI will show message)
    return { location: fw.location, source: fw.source, forecast: [], summary: { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: 'unknown' } };
  }

  const owm = await fetchFromOpenWeatherMap(location, 24 * 2);
  if (owm && owm.forecast.length) {
    return { location: owm.location, source: owm.source, forecast: [], summary: { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: 'unknown' } };
  }

  // Nothing viable
  throw new Error("Can't fetch the weather right now, check back later");
}

export async function getWeatherByDay(location: string, date: string): Promise<WeatherDataWithSummary> {
  if (!location || !date) throw new Error('Location and date are required');
  const cacheKey = `${location.trim().toLowerCase()}|${date}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  // PRIMARY: Open-Meteo for specific day
  const primaryWeather = await fetchFromOpenMeteoForDay(location, date);
  if (primaryWeather) {
    const summary = summarizeWeather(primaryWeather.forecast);
    const result = { ...primaryWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  // Fallbacks (existing)
  const fallbackWeather = await fetchFromFreeWeatherAPIForDay(location, date);
  if (fallbackWeather) {
    const summary = summarizeWeather(fallbackWeather.forecast);
    const result = { ...fallbackWeather, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  const owmDay = await fetchFromOpenWeatherMapForDay(location, date);
  if (owmDay) {
    const summary = summarizeWeather(owmDay.forecast);
    const result = { ...owmDay, summary };
    weatherCache.set(cacheKey, { data: result, time: now });
    return result;
  }

  throw new Error('Both weather services failed. Please try again later.');
}