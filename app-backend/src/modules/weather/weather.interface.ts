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

export interface HourlyForecast {
  time: string; 
  temperature: number;
  description: string;
  icon?: string;
}

export interface WeatherData {
  location: string;
  source: 'FreeWeatherAPI' | 'OpenWeatherMap';
  forecast: HourlyForecast[];
}
