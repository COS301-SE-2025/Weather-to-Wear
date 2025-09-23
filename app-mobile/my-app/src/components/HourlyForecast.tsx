// components/HourlyForecast.tsx
import React from 'react';
import {
  IconSun,
  IconCloud,
  IconCloudRain,
  IconCloudStorm,
  IconSnowflake,
  IconWind,
  IconMist,
} from '@tabler/icons-react';

function toDateFromAPITime(s: string) {
  const isoish = s.includes('T') ? s : s.replace(' ', 'T');
  const dt = new Date(isoish);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Map description → simple Tabler icon
function IconFor({ description }: { description?: string }) {
  const c = (description || '').toLowerCase();
  const commonProps = { size: 24, stroke: 2, className: 'shrink-0' };

  if (c.includes('thunder') || c.includes('storm')) return <IconCloudStorm {...commonProps} />;
  if (c.includes('snow') || c.includes('sleet')) return <IconSnowflake {...commonProps} />;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return <IconCloudRain {...commonProps} />;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return <IconMist {...commonProps} />;
  if (c.includes('wind')) return <IconWind {...commonProps} />;
  if (c.includes('cloud') || c.includes('overcast')) return <IconCloud {...commonProps} />;
  return <IconSun {...commonProps} />; // default: sunny/clear
}

type Hour = { time: string; temperature: number; description: string };

const HourlyForecast: React.FC<{ forecast: Hour[] }> = ({ forecast }) => {
  // pick the next 8 future hours (spills into tomorrow if provided)
  const now = Date.now();
  const FUTURE_GRACE_MS = 5 * 60 * 1000; // include "current" hour within ±5min

  const future = forecast
    .map(h => ({ ...h, dt: toDateFromAPITime(h.time) }))
    .filter(h => h.dt) // drop invalid dates
    .filter(h => (h.dt as Date).getTime() >= now - FUTURE_GRACE_MS)
    .sort((a, b) => (a.dt as Date).getTime() - (b.dt as Date).getTime())
    .slice(0, 8);

  // fallback: if we somehow don't have enough future data, show what we can
  const upcoming = future.length > 0 ? future : forecast.slice(0, 8).map(h => ({ ...h, dt: toDateFromAPITime(h.time) }));

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* blurred background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-xl scale-110"
        style={{ backgroundImage: `url(/landing.jpg)` }} // your bg file
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative z-10 text-white divide-y divide-white/10">
        {upcoming.map((hour, idx) => {
          const dt = hour.dt as Date | null;
          const timePart = dt
            ? dt.toLocaleTimeString([], { hour: 'numeric', hour12: true })
            : hour.time;

          return (
            <div key={idx} className="flex items-center justify-between px-4 py-3">
              {/* left: icon + time + description */}
              <div className="flex items-center gap-3 text-left">
                <IconFor description={hour.description} />
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{timePart}</div>
                  <div className="text-xs text-white/80">{hour.description}</div>
                </div>
              </div>

              {/* right: temp (bigger) */}
              <div className="text-2xl font-bold tabular-nums">
                {Math.round(hour.temperature)}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HourlyForecast;
