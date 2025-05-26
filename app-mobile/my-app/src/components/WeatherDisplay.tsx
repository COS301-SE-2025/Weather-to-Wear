import React from 'react';
import { useWeather } from '../hooks/useWeather';
import { MapPin } from 'lucide-react';
import { LocateFixed } from 'lucide-react';

const WeatherDisplay = () => {
  const { weather, loading, error } = useWeather();

  if (loading)
    return (
      <div className="flex justify-center items-center h-48 text-gray-600">
        Loading weather...
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-48 text-red-600 font-semibold">
        Error: {error}
      </div>
    );

  if (!weather || !weather.forecast.length) return null;

  const current = weather.forecast[0]; // First forecast entry = current

  return (
    <div className="flex flex-col items-start bg-white p-4 px-8 pl-6 rounded-lg max-w-[280px] w-full">
      {/* Row 1: Location and Temperature */}
<div className="flex flex-col items-center w-full mb-4"> {/* Added items-center */}
  <div className="flex items-center">
    <MapPin className="w-6 h-6 mr-2 text-gray-600" /> {/* Increased size */}
    <h2 className="text-2xl md:text-3xl font-bold font-livvic text-center"> {/* Added text-center */}
      {weather.location}
    </h2>
  </div>
  <p className="text-2xl md:text-3xl font-normal mt-2 text-center"> {/* Centered and increased spacing */}
    {Math.round(current.temperature)}°C
  </p>
</div>

      {/* Row 2: Icon and Description */}
      <div className="flex items-center justify-center space-x-2 w-full">
        {current.icon && (
          <img
            src={`https:${current.icon}`}
            alt={current.description}
            width={32}
            height={32}
            className="w-8 h-8 md:w-10 md:h-10"
          />
        )}
        <p className="text-lg md:text-xl text-gray-600 capitalize">
          {current.description.trim()}
        </p>
      </div>
    </div>
  );
};

export default WeatherDisplay;
