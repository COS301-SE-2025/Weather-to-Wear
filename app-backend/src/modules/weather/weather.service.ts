import axios from 'axios';
import { WeatherData } from './weather.interface';

export async function getWeatherByLocation(location: string): Promise<WeatherData> {
  // TODO: Try Free Weather API, fallback to OpenWeatherMap
  throw new Error('Weather service not implemented yet.');
}
