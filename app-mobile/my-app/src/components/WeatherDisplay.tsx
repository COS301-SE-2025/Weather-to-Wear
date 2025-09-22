// components/WeatherDisplay.tsx
import React from 'react';
import { MapPin } from 'lucide-react';
import { WeatherData } from '../hooks/useWeather';

interface WeatherDisplayProps {
  weather: WeatherData;
  setCity: (city: string) => void; // kept in case it's needed elsewhere
}

function resolveIconUrl(icon?: string): string | undefined {
  if (!icon) return undefined;
  const s = icon.trim();

  if (/^https?:\/\//i.test(s)) return s;

  if (s.startsWith('//')) return `https:${s}`;

  if (s.startsWith('/')) return s;

  return s;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather }) => {
  if (!weather || !weather.forecast.length) return null;

  const current = weather.forecast[0];
  const iconSrc = resolveIconUrl(current.icon);

  return (
    <div className="flex flex-col items-start bg-white dark:bg-gray-700 p-4 px-8 pl-6 rounded-lg max-w-[280px] w-full">
      {/* Row 1: Location and Temperature */}
      <div className="flex flex-col items-center w-full mb-4">
        <div className="flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-gray-600" />
          <h2 className="text-2xl md:text-3xl font-bold font-livvic text-center">
            {weather.location}
          </h2>
        </div>
        <p className="text-2xl md:text-3xl font-normal mt-2 text-center">
          {Math.round(current.temperature)}°C
        </p>
      </div>

      {/* Row 2: Icon and Description */}
      <div className="flex items-center justify-center space-x-2 w-full">
        {iconSrc && (
          <img
            src={iconSrc}
            alt={current.description}
            width={32}
            height={32}
            className="w-8 h-8 md:w-10 md:h-10"
            loading="lazy"
            decoding="async"
          />
        )}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 capitalize">
          {current.description.trim()}
        </p>
      </div>
    </div>
  );
};

export default WeatherDisplay;
