// components/WeatherIcon.tsx
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

// Minimal white line icon mapped from a weather description.
// Uses currentColor, so it will be white inside your white text areas.
export function WeatherIcon({
  description,
  size = 24,
  className = '',
}: {
  description?: string;
  size?: number;
  className?: string;
}) {
  const c = (description || '').toLowerCase();
  const commonProps = { size, stroke: 2, className: `shrink-0 ${className}` };

  if (c.includes('thunder') || c.includes('storm')) return <IconCloudStorm {...commonProps} />;
  if (c.includes('snow') || c.includes('sleet')) return <IconSnowflake {...commonProps} />;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return <IconCloudRain {...commonProps} />;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return <IconMist {...commonProps} />;
  if (c.includes('wind')) return <IconWind {...commonProps} />;
  if (c.includes('cloud') || c.includes('overcast')) return <IconCloud {...commonProps} />;
  return <IconSun {...commonProps} />; // default: sunny/clear
}

export default WeatherIcon;
