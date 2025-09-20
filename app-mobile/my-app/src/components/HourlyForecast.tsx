// components/HourlyForecast.tsx
import React from 'react';
import { formatShortMonthDay } from '../utils/date';

function toDateFromAPITime(s: string) {
  const isoish = s.includes('T') ? s : s.replace(' ', 'T');
  const dt = new Date(isoish);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const HourlyForecast: React.FC<{ forecast: { time:string; temperature:number; description:string }[] }> = ({ forecast }) => {
  const upcoming = forecast.slice(1, 5);

  return (
    <div className="divide-y divide-black dark:divide-gray-600">
      {upcoming.map((hour, idx) => {
        const dt = toDateFromAPITime(hour.time);
        const datePart = dt ? formatShortMonthDay(dt) : hour.time;
        const timePart = dt ? dt.toLocaleTimeString([], { hour: 'numeric', hour12: true }) : '';

        return (
          <div key={idx} className="flex justify-between text-base md:text-lg py-2 text-black dark:text-gray-100">
            <span>
              <span>{datePart}</span>
              {dt && <span className="inline-block ml-4 md:ml-6">{timePart}</span>}
            </span>
            <span className="flex gap-1 md:gap-2">
              <span className="font-medium">{Math.round(hour.temperature)}°</span>
              <span className="text-gray-600 dark:text-gray-400">{hour.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default HourlyForecast;
