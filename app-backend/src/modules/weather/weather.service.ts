import axios from 'axios';
import { WeatherData } from './weather.interface';

interface IPApiResponse {
  city: string;
  country: string;
  regionName: string;
  lat: number;
  lon: number;
  [key: string]: any;
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

  // TODO: Placeholder return until we integrate real APIs
  return {
    location,
    temperature: 0,
    description: 'Clear skies',
    source: 'FreeWeatherAPI'
  };
}
