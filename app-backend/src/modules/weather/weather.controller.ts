import { Request, Response } from 'express';
import {
  getWeatherByLocation,
  getWeatherByDay,
  getWeatherWeek,
  searchCities
} from './weather.service';

// instead of using server IP, we need client's IP
function getClientIp(req: Request): string | undefined {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf;

  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();

  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real;

  const fastly = req.headers['fastly-client-ip'];
  if (typeof fastly === 'string' && fastly) return fastly;

  const trueClient = req.headers['true-client-ip'];
  if (typeof trueClient === 'string' && trueClient) return trueClient;

  const xclient = req.headers['x-client-ip'];
  if (typeof xclient === 'string' && xclient) return xclient;

  const ra = req.socket?.remoteAddress;
  return typeof ra === 'string' ? ra : undefined;
}

export async function getWeather(req: Request, res: Response) {
  try {
    const location = (req.query.location as string) || '';
    const clientIp = getClientIp(req); 
    const weather = await getWeatherByLocation(location, clientIp); 
    res.json(weather);
  } catch (error: any) {
    console.error('Weather fetch error:', error.message);
    res.status(500).json({ error: 'Unable to fetch weather data' });
  }
}

export async function getWeatherForDay(req: Request, res: Response): Promise<void> {
  try {
    const location = (req.query.location as string) || '';
    const date = (req.query.date as string) || '';
    if (!location || !date) {
      res.status(400).json({ error: 'Location and date are required' });
      return;
    }
    const weather = await getWeatherByDay(location, date);
    if (!weather || !weather.forecast.length) {
      res.status(404).json({ error: 'Forecast is unavailable for the requested date (too far in the future or insufficient data).' });
      return;
    }
    res.json(weather);
  } catch (error: any) {
    console.error('Weather (by day) fetch error:', error.message);
    res.status(500).json({ error: 'Unable to fetch weather data for day' });
  }
}

export async function getWeatherForWeek(req: Request, res: Response) {
  try {
    let location = (req.query.location as string) || '';
    if (!location) {
      const clientIp = getClientIp(req); 
      const today = await getWeatherByLocation('', clientIp);
      location = today.location;
    }
    const weather = await getWeatherWeek(location);
    if (!weather || !weather.forecast.length) {
      res.status(404).json({ error: 'Forecast is unavailable for the requested week.' });
      return;
    }
    res.json(weather);
  } catch (error: any) {
    console.error('Weather (week) fetch error:', error.message);
    res.status(500).json({ error: 'Unable to fetch weekly weather' });
  }
}


export async function getCityMatches(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string) || '';
    if (!q) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }
    const matches = await searchCities(q);
    res.json({ matches });
  } catch (error: any) {
    console.error('City search error:', error.message);
    res.status(500).json({ error: 'Unable to search for cities' });
  }
}
