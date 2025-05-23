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
