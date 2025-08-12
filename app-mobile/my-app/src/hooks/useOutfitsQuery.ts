// src/hooks/useOutfitsQuery.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchRecommendedOutfits, RecommendedOutfit } from '../services/outfitApi';
import type { WeatherSummary } from './useWeatherQuery';

function summaryKey(summary: WeatherSummary) {
  return JSON.stringify({
    a: Math.round(summary.avgTemp),
    i: Math.round(summary.minTemp),
    x: Math.round(summary.maxTemp),
    r: summary.willRain,
    m: summary.mainCondition,
  });
}

export function useOutfitsQuery(summary?: WeatherSummary, style?: string) {
  const enabled = Boolean(summary && style);
  const key = ['outfits', style || 'Casual', enabled ? summaryKey(summary!) : 'no-summary'] as const;

  return useQuery<RecommendedOutfit[]>({
    queryKey: key,
    enabled,
    queryFn: () => fetchRecommendedOutfits(summary!, style!),
    // v5 replacement for keepPreviousData
    placeholderData: keepPreviousData,
  });
}
