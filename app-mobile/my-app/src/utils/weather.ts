// src/utils/weather.ts
export type HourlyForecast = {
  time: string;
  temperature: number;
  description: string;
  icon?: string;
  // optional extras which backend provides
  precipitationMm?: number;
  precipitationProbability?: number; // 0..100
};

export function groupByDay(forecast: HourlyForecast[]): Record<string, HourlyForecast[]> {
  const out: Record<string, HourlyForecast[]> = {};
  for (const h of forecast) {
    const day = h.time.slice(0, 10); // "YYYY-MM-DD"
    (out[day] ||= []).push(h);
  }
  for (const d of Object.keys(out)) {
    out[d].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }
  return out;
}

// Optional: roll up per-day summary for cards
export function summarizeDay(hours: HourlyForecast[]) {
  if (!hours.length) return { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: 'unknown' };
  const temps = hours.map(h => h.temperature);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const condCounts = hours.reduce<Record<string, number>>((acc, h) => {
    const k = h.description.toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const mainCondition = Object.keys(condCounts).reduce((a, b) => (condCounts[a] > condCounts[b] ? a : b));
  const willRain =
    hours.some(h => /rain|shower|drizzle/i.test(h.description)) ||
    hours.some(h => (h.precipitationProbability ?? 0) >= 50 || (h.precipitationMm ?? 0) > 0.2);
  return { avgTemp, minTemp, maxTemp, willRain, mainCondition };
}
