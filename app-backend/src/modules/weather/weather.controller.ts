import { Request, Response } from 'express';
import { getWeatherByLocation } from './weather.service';

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
