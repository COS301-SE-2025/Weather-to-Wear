import React from 'react';
import { useWeather } from '../hooks/useWeather';

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
  if (!weather) return null;

  return (
    <div className="flex flex-col items-start bg-white p-4 px-8 pl-6 rounded-lg max-w-[280px] w-full">
      {/* Row 1: location and temperature */}
      <div className="flex items-center space-x-4 w-full mb-4">
        <h2 className="text-2xl md:text-3xl font-bold">{weather.location}</h2>
        <p className="text-2xl md:text-3xl font-normal">{weather.temperature}°C</p>
      </div>

      {/* Row 2: icon and description */}
<div className="flex items-center justify-center space-x-2 w-full">
        {weather.icon && (
          <img
            src={`https:${weather.icon}`}
            alt={weather.description}
            width={32}
            height={32}
            className="w-8 h-8 md:w-10 md:h-10"
          />
        )}
        <p className="text-lg md:text-xl text-gray-600 capitalize">{weather.description}</p>
      </div>
    </div>
  );
};

export default WeatherDisplay;
