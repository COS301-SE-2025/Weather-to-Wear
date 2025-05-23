export interface WeatherData {
  location: string;
  temperature: number; 
  description: string;
  icon?: string;
  source: 'FreeWeatherAPI' | 'OpenWeatherMap';
}
