// components/HourlyForecast.tsx
import React from 'react';

interface ForecastItem {
  time: string;
  temperature: number;
  description: string;
}

interface Props {
  forecast: ForecastItem[];
}

const HourlyForecast: React.FC<Props> = ({ forecast }) => {
  const upcoming = forecast.slice(1, 5);

  return (
    <div className="divide-y divide-black dark:divide-gray-600">
      {upcoming.map((hour, idx) => (
        <div
          key={idx}
          className="flex justify-between text-base md:text-lg py-2 text-black dark:text-gray-100"
        >
          <span>{hour.time}</span>
          <span className="flex gap-1 md:gap-2">
            <span className="font-medium">{Math.round(hour.temperature)}°</span>
            <span className="text-gray-600 dark:text-gray-400">
              {hour.description}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default HourlyForecast;