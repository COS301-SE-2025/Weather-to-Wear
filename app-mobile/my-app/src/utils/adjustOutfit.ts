// src/utils/adjustOutfit.ts
import type { ClosetItemDTO } from '../services/closetApiTypes';
import type { DaySelectionDTO } from '../services/daySelectionApi';

export type AdjustmentReason =
  | { kind: 'rain_on' }
  | { kind: 'cooling'; steps: number }
  | { kind: 'warming'; steps: number };

export function computeAdjustmentNeed(saved: {
  avgTemp: number; willRain: boolean;
}, current: {
  avgTemp: number; willRain: boolean;
}): AdjustmentReason[] {
  const reasons: AdjustmentReason[] = [];
  const delta = Math.round(current.avgTemp - saved.avgTemp);
  const steps = Math.abs(Math.floor(delta / 10)); // per 10°C step

  if (!saved.willRain && current.willRain) reasons.push({ kind: 'rain_on' });
  if (steps > 0) {
    if (delta < 0) reasons.push({ kind: 'cooling', steps });
    else if (delta > 0) reasons.push({ kind: 'warming', steps });
  }
  return reasons;
}

const NEUTRALS = ['#000000', '#FFFFFF', '#808080', '#2F3E46', '#1F2937', '#E5E7EB', '#F5F5DC', '#0A2540', '#1F2A44']; // black/white/grey/navy/beige plus safe hexes

export function pickNeutralFirst<T extends { colorHex?: string | null; dominantColors?: string[]; }>(items: T[]): T | null {
  if (!items?.length) return null;
  const isNeutral = (hex?: string) =>
    hex && NEUTRALS.some(n => (hex || '').toLowerCase().startsWith(n.toLowerCase().slice(0, 4))); // loose match
  const withColor = items.map(it => ({
    it,
    score: isNeutral(it.colorHex || (it.dominantColors?.[0] as string | undefined)) ? 0 : 1
  }));
  withColor.sort((a, b) => a.score - b.score);
  return withColor[0]?.it ?? null;
}
