import { Request, Response } from 'express';
import {
  getWeatherByLocation,
  getWeatherByDay,
  getWeatherWeek,
  searchCities
} from './weather.service';

export async function getWeather(req: Request, res: Response) {
  try {
    const location = (req.query.location as string) || ''; // or manual input
    const weather = await getWeatherByLocation(location);
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

/** NEW: 7-day planner */
export async function getWeatherForWeek(req: Request, res: Response): Promise<void> {
  try {
    const location = (req.query.location as string) || '';
    if (!location) {
      res.status(400).json({ error: 'Location is required' });
      return;
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

/** NEW: city search for disambiguation */
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
