import axios from "axios";

export interface HourlyForecast {
  time: string;
  temperature: number;
  description: string;
  icon?: string;
  precipitationMm?: number;
  precipitationProbability?: number;
}

export interface WeatherData {
  location: string;
  forecast: HourlyForecast[];
  source: string;
}

export interface WeatherSummary {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  willRain: boolean;
  mainCondition: string;
}

export interface WeatherDataWithSummary extends WeatherData {
  summary: WeatherSummary;
}

export interface CityMatch {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export const fetchWeather = async (location: string): Promise<WeatherDataWithSummary> => {
  try {
    const response = await axios.get<WeatherDataWithSummary>("/api/weather", {
      params: { location },
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch weather data");
  }
};

export const fetchCitySuggestions = async (query: string): Promise<CityMatch[]> => {
  try {
    const response = await axios.get<{ matches: CityMatch[] }>("/api/weather/search-cities", {
      params: { q: query },
      timeout: 5000,
    });
    return response.data.matches;
  } catch (error) {
    throw new Error("Failed to fetch city suggestions");
  }
};