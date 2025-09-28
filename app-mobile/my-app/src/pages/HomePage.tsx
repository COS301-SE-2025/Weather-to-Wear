import { useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from 'react';
import axios from 'axios';
import { Plus, RefreshCw } from 'lucide-react';
import Footer from '../components/Footer';
import HourlyForecast from '../components/HourlyForecast';
import StarRating from '../components/StarRating';
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';
import { motion } from 'framer-motion';
import { getDaySelection, upsertDaySelection, deleteDaySelection, type DaySelectionDTO } from '../services/daySelectionApi';
import { fetchAllItems } from '../services/closetApi';

import {
  fetchRecommendedOutfits,
  RecommendedOutfit,
  SaveOutfitPayload,
  createOutfit,
  updateOutfit,
} from '../services/outfitApi';

import {
  fetchAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type EventDto,
} from '../services/eventsApi';

import { useWeatherQuery, type WeatherData, type WeatherSummary } from '../hooks/useWeatherQuery';
import { useOutfitsQuery } from '../hooks/useOutfitsQuery';
import { queryClient } from '../queryClient';
import { useQuery } from '@tanstack/react-query';
import { groupByDay, summarizeDay, type HourlyForecast as H } from '../utils/weather';
import { formatMonthDay } from '../utils/date';

function getOutfitKey(outfit: RecommendedOutfit): string {
  return outfit.outfitItems.map(i => i.closetItemId).sort().join('-');
}

function getOutfitKeyFromDaySel(sel: DaySelectionDTO | null): string | null {
  if (!sel?.items?.length) return null;
  return sel.items.map(i => i.closetItemId).sort().join('-');
}

function toYYYYMMDD(isoOrDate: string | Date) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toISOString().slice(0, 10);
}

function buildWeatherSnapshot(s?: WeatherSummary | null) {
  if (!s) return null;
  return {
    avgTemp: Number(s.avgTemp ?? 0),
    minTemp: Number(s.minTemp ?? s.avgTemp ?? 0),
    maxTemp: Number(s.maxTemp ?? s.avgTemp ?? 0),
    willRain: Boolean(s.willRain),
    mainCondition: String(s.mainCondition || ''),
  };
}

function eventImageFor(style?: string) {
  const slug = (style || 'other').toLowerCase();
  return `${slug}.jpg`;
}

function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeAmPm(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

    function useAutoplayScrolling(
      ref: React.RefObject<HTMLDivElement | null>,
      opts: {
        pxPerSec?: number;
        pauseMsAfterInteract?: number;
        respectReducedMotion?: boolean;
      } = {}
    ): { pause: (ms?: number) => void } {
      const isCoarse =
        typeof window !== "undefined" &&
        typeof matchMedia === "function" &&
        matchMedia("(pointer: coarse)").matches;

      const {
        pxPerSec = isCoarse ? 30 : 60,
        pauseMsAfterInteract = isCoarse ? 1200 : 1600,
        respectReducedMotion = false,
      } = opts;

      const pauseUntilRef = useRef(0);
      const rafRef = useRef<number | null>(null);
      const intervalRef = useRef<number | null>(null);
      const halfRef = useRef(0);

      const pause = useCallback((ms?: number) => {
        const dur = typeof ms === "number" ? ms : pauseMsAfterInteract;
        pauseUntilRef.current = Date.now() + Math.max(0, dur);
      }, [pauseMsAfterInteract]);

      useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const updateHalf = () => { halfRef.current = el.scrollWidth / 2; };
        updateHalf();
        const ro = new ResizeObserver(updateHalf);
        ro.observe(el);

        const reduce =
          typeof matchMedia === "function" &&
          matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (respectReducedMotion && reduce && !isCoarse) {
          return () => ro.disconnect();
        }

        const bumpPause = () => pause();

        el.addEventListener("pointerdown", bumpPause, { passive: true });
        el.addEventListener("wheel", bumpPause, { passive: true });
        el.addEventListener("mouseenter", bumpPause, { passive: true });
        el.addEventListener("focusin", bumpPause, { passive: true });
        el.addEventListener("touchstart", bumpPause, { passive: true });

        let last = performance.now();
        const stepFrame = (dtMs: number) => {
          if (Date.now() < pauseUntilRef.current) return;
          const step = (pxPerSec * dtMs) / 1000;
          const half = halfRef.current || 0;

          let next = el.scrollLeft + step;
          if (half > 0 && next >= half) next -= half;

          const prev = el.style.scrollBehavior;
          el.style.scrollBehavior = "auto";
          el.scrollLeft = next;
          el.style.scrollBehavior = prev;
        };

        const startRaf = () => {
          const tick = (now: number) => {
            rafRef.current = requestAnimationFrame(tick);
            const dt = now - last;
            last = now;
            stepFrame(dt);
          };
          last = performance.now();
          rafRef.current = requestAnimationFrame(tick);
        };

        const startInterval = () => {
          last = performance.now();
          intervalRef.current = window.setInterval(() => {
            const now = performance.now();
            const dt = now - last;
            last = now;
            stepFrame(dt);
          }, 16);
        };

        if (isCoarse) startInterval(); else startRaf();

        return () => {
          ro.disconnect();
          el.removeEventListener("pointerdown", bumpPause);
          el.removeEventListener("wheel", bumpPause);
          el.removeEventListener("mouseenter", bumpPause);
          el.removeEventListener("focusin", bumpPause);
          el.removeEventListener("touchstart", bumpPause);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
        };
      }, [ref, pxPerSec, respectReducedMotion, isCoarse, pause]);

      return { pause };
    }

async function geocodeCity(query: string, count = 6): Promise<Array<{ label: string; city: string }>> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data?.results || []) as Array<any>;
  return results.map(r => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    city: r.name as string,
  }));
}

async function validateAndStandardizeCity(raw: string): Promise<string | null> {
  const q = raw.trim();
  if (!q) return null;
  const matches = await geocodeCity(q, 1);
  return matches[0]?.city ?? null; 
}

function toLocalDatetimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WI_BASE = 'https://basmilius.github.io/weather-icons/production/fill/all';

type Style = 'Casual' | 'Formal' | 'Athletic' | 'Party' | 'Business' | 'Outdoor';

type Event = {
  id: string;
  name: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  style?: Style;
  weather?: string;
  type: 'event' | 'trip';
  isTrip?: boolean;
};

function toEvent(dto: EventDto): Event {
  const trip =
    !!(dto as any)?.isTrip ||
    String((dto as any)?.type || '').toLowerCase() === 'trip' ||
    /(^|\s)trip(\s|$)/i.test(String(dto?.name || ''));

  return {
    id: String(dto.id),
    name: dto.name ?? (trip ? 'Trip' : 'Untitled'),
    location: dto.location ?? '',
    dateFrom: dto.dateFrom,
    dateTo: dto.dateTo,
    style: ((dto as any).style ?? 'Casual') as Style,
    weather: dto.weather ?? undefined,
    type: trip ? 'trip' : 'event',
    isTrip: trip,
  };
}

function parseHourTS(s: string) {
  return new Date(s.includes('T') ? s : s.replace(' ', 'T'));
}

// --- Weather icon mapping ---
function iconFor(conditionRaw: string | undefined) {
  const c = (conditionRaw || '').toLowerCase();
  if (!c) return '🌤️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('snow') || c.includes('sleet')) return '❄️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('wind')) return '🌬️';
  return '☀️';
}

const TypingSlogan = () => {
  const slogan = 'Style Made\nSimple.';
  const tealWord = 'Simple.';
  const newlineIndex = slogan.indexOf('\n');

  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    document.body.classList.add('home-fullbleed');
    return () => {
      document.body.classList.remove('home-fullbleed');
    };
  }, []);

  useEffect(() => {
    const handleTyping = () => {
      if (!isDeleting && index < slogan.length) {
        setDisplayText(slogan.slice(0, index + 1));
        setIndex(index + 1);
      } else if (!isDeleting && index === slogan.length) {
        setTimeout(() => setIsDeleting(true), 30000);
      } else if (isDeleting && index > 0) {
        setDisplayText(slogan.slice(0, index - 1));
        setIndex(index - 1);
      } else if (isDeleting && index === 0) {
        setIsDeleting(false);
      }
    };
    const speed = isDeleting ? 60 : 120;
    const t = setTimeout(handleTyping, speed);
    return () => clearTimeout(t);
  }, [index, isDeleting, slogan]);

  const firstLine = displayText.slice(
    0,
    Math.min(displayText.length, newlineIndex === -1 ? displayText.length : newlineIndex)
  );
  const secondTyped = displayText.length > newlineIndex ? displayText.slice(newlineIndex + 1) : '';
  const tealPart = tealWord.slice(0, Math.min(secondTyped.length, tealWord.length));

  return (
    <h2
      className="
        text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 font-bodoni tracking-wide
        text-center lg:text-left
        whitespace-normal lg:whitespace-nowrap leading-tight overflow-hidden
        min-h-[7rem] lg:min-h-[9rem]
        lg:self-start lg:mr-auto lg:w-auto
      "
    >
      <span>{firstLine}</span>
      {displayText.length > newlineIndex && (
        <>
          <br />
          <span className="text-[#3F978F]">{tealPart}</span>
        </>
      )}
      <span className="inline-block w-[0.6ch] align-baseline animate-pulse">|</span>
    </h2>
  );
};

// ---------------- Temp range bar (single definition) ----------------
const THEME = {
  coldHue: 185, 
  hotHue: 18,   
  sat: 58,
  light: 38,
};

type AdjReason =
  | { kind: 'rain_on'; steps: 1 }
  | { kind: 'warming'; steps: number }
  | { kind: 'cooling'; steps: number };

type ClosetItemDTO = {
  id: string;
  layerCategory?: string;
  waterproof?: boolean;
  colorHex?: string;
  dominantColors?: string[];
};

function computeAdjustmentNeed(
  saved: { avgTemp: number; willRain: boolean },
  current: { avgTemp: number; willRain: boolean }
): AdjReason[] {
  const out: AdjReason[] = [];
  if (!saved.willRain && current.willRain) {
    out.push({ kind: 'rain_on', steps: 1 });
  }
  const delta = current.avgTemp - saved.avgTemp;
  const STEP = 10;
  const steps = Math.floor(Math.abs(delta) / STEP);
  if (steps > 0) {
    out.push({ kind: delta >= 0 ? 'warming' : 'cooling', steps });
  }
  return out;
}

// ---- Closet pick helpers ----
const NEUTRAL_COLORS = new Set(['black', 'white', 'grey', 'gray', 'navy', 'beige']);

type ClosetBasic = {
  id: string;
  layerCategory: string;
  waterproof?: boolean;
  colorHex?: string | null;
  dominantColors?: string[];
};

function pickNeutralFirst<T extends ClosetBasic>(candidates: T[]): T | undefined {
  if (!candidates?.length) return undefined;
  const neutrals = candidates.filter(c =>
    (c.dominantColors || []).some(dc => NEUTRAL_COLORS.has((dc || '').toLowerCase()))
  );
  return neutrals[0] || candidates[0];
}

export default function HomePage() {
  const submittingRef = useRef(false);

  const [city, setCity] = useState<string>(() => localStorage.getItem('selectedCity') || '');
  const [cityInput, setCityInput] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('Casual');

  const [citySuggest, setCitySuggest] = useState<Array<{ label: string; city: string }>>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!suggestionsBoxRef.current) return;
      if (!suggestionsBoxRef.current.contains(e.target as Node)) {
        setCitySuggest([]);
        setCityError(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = cityInput.trim();
    setCityError(null);
    if (!q || q.length < 2) {
      setCitySuggest([]);
      return;
    }
    let cancelled = false;
    setCityLoading(true);
    const t = setTimeout(async () => {
      try {
        const opts = await geocodeCity(q, 6);
        if (!cancelled) setCitySuggest(opts);
      } finally {
        if (!cancelled) setCityLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cityInput]);

  async function commitCity(nextCity: string) {
    setCity(nextCity);
    localStorage.setItem('selectedCity', nextCity);
    setCityInput('');
    setCitySuggest([]);
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['outfits'] });
    queryClient.invalidateQueries({ queryKey: ['weather-week'] });
  }


  const [username, setUsername] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    style: 'CASUAL',
  });

  const [locSuggest, setLocSuggest] = useState<Array<{ label: string; city: string }>>([]);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  async function geocodeCity(query: string, count = 5): Promise<Array<{ label: string; city: string }>> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=${count}&language=en&format=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const results = (data?.results || []) as Array<any>;
      return results.map(r => ({
        label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        city: r.name as string,
      }));
    } catch {
      return [];
    }
  }

  async function validateAndStandardizeLocation(raw: string): Promise<string | null> {
    const q = raw.trim();
    if (!q) return null;
    const matches = await geocodeCity(q, 1);
    return matches[0]?.city ?? null; 
  }

  useEffect(() => {
    const q = newEvent.location.trim();
    setLocError(null);
    if (!q || q.length < 2) {
      setLocSuggest([]);
      return;
    }
    let cancelled = false;
    setLocLoading(true);
    const t = setTimeout(async () => {
      const opts = await geocodeCity(q, 6);
      if (!cancelled) setLocSuggest(opts);
      setLocLoading(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [newEvent.location]);

  const [toast, setToast] = useState<{ msg: string } | null>(null);
  function showToast(msg: string) {
    setToast({ msg });
    setTimeout(() => setToast(null), 2200);
  }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [outfitIdMap, setOutfitIdMap] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editEventData, setEditEventData] = useState({
    id: '',
    name: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    style: '',
  });

  // ---- City autocomplete/validation from Events ----
  const [locSuggestE, setLocSuggestE] = useState<Array<{ label: string; city: string }>>([]);
  const [locErrorE, setLocErrorE] = useState<string | null>(null);
  const [locLoadingE, setLocLoadingE] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    const q = editEventData.location.trim();
    setLocErrorE(null);
    if (!q || q.length < 2) {
      setLocSuggestE([]);
      return;
    }
    let cancelled = false;
    setLocLoadingE(true);
    const t = setTimeout(async () => {
      const opts = await geocodeCity(q, 6);
      if (!cancelled) setLocSuggestE(opts);
      setLocLoadingE(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isEditing, editEventData.location]);

  useEffect(() => {
    if (!selectedEvent) return;
    setEditEventData({
      id: selectedEvent.id,
      name: selectedEvent.name,
      location: selectedEvent.location,
      dateFrom: toLocalDatetimeInputValue(selectedEvent.dateFrom),
      dateTo: toLocalDatetimeInputValue(selectedEvent.dateTo),
      style: selectedEvent.style || 'Casual',
    });
  }, [selectedEvent]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null); 

  // ---------- Weather (React Query) ----------
  const weatherQuery = useWeatherQuery(city);
  const weather: WeatherData | null = weatherQuery.data ?? null;
  const loadingWeather = weatherQuery.isLoading || weatherQuery.isFetching;

  const locationLabel = (city?.trim() || weather?.location || '').trim();
  const [daySel, setDaySel] = useState<DaySelectionDTO | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<null | { reason: string; suggestions: string[] }>(null);


  useEffect(() => {
    if (!city && weather?.location) {
      setCity(weather.location);
      localStorage.setItem('selectedCity', weather.location);
    }
  }, [city, weather?.location]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedDate) { setDaySel(null); return; }
      try {
        const sel = await getDaySelection(selectedDate);
        if (!cancelled) setDaySel(sel ?? null);
      } catch (e) {
        console.error('load day selection failed', e);
        if (!cancelled) setDaySel(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate, locationLabel]);

  const [closetIndex, setClosetIndex] = useState<
    Record<string, { imageUrl?: string; category?: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetchAllItems();
        const rows = Array.isArray(resp.data) ? resp.data : [];
        const index: Record<string, { imageUrl?: string; category?: string }> = {};
        for (const row of rows) {
          const id = String(row.id);

          index[id] = {
            imageUrl: (row as any).imageUrl || (row as any).image_url || '',
            category: (row as any).category || '',
          };
        }
        if (!cancelled) setClosetIndex(index);
      } catch (e) {
        console.error('closet index load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedOutfitFromDaySel: RecommendedOutfit | null = useMemo(() => {
    if (!daySel?.items?.length) return null;
    return {
      id: daySel.outfitId || 'local-selected',
      outfitItems: daySel.items.map((it) => ({
        closetItemId: it.closetItemId,
        imageUrl: closetIndex[it.closetItemId]?.imageUrl || '',
        layerCategory: it.layerCategory,
        category: '',
        colorHex: '',
        style: selectedStyle,
      })),
      overallStyle: selectedStyle,
      score: 0,
      warmthRating: 0,
      waterproof: false,
      userRating: (daySel as any).userRating ?? 0,
      weatherSummary: {
        avgTemp: daySel.weatherAvg ?? 0,
        minTemp: daySel.weatherMin ?? daySel.weatherAvg ?? 0,
        maxTemp: daySel.weatherMax ?? daySel.weatherAvg ?? 0,
        willRain: !!daySel.willRain,
        mainCondition: daySel.mainCondition ?? '',
      },
    } as RecommendedOutfit;
  }, [daySel, selectedStyle]);

  const weekQuery = useQuery({
    queryKey: ['weather-week', locationLabel || 'pending'],
    enabled: Boolean(locationLabel),
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/weather/week`, {
          params: { location: locationLabel, t: Date.now() },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        return data as { forecast: H[]; location: string; summary: any; source: string };
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return {
            forecast: [],
            location: locationLabel,
            summary: { avgTemp: 0, minTemp: 0, maxTemp: 0, willRain: false, mainCondition: 'unknown' },
            source: 'openMeteo',
          };
        }
        console.error('week error', err?.response?.status, err?.response?.data);
        throw err;
      }
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const week = weekQuery.data;
  const weekByDay = useMemo(() => (week?.forecast?.length ? groupByDay(week!.forecast) : {}), [week]);
  const dayKeys = useMemo(() => Object.keys(weekByDay).sort(), [weekByDay]);

  useEffect(() => {
    if (!selectedDate && dayKeys.length) setSelectedDate(dayKeys[0]);
  }, [dayKeys, selectedDate]);

  const selectedDayHoursRaw: H[] = useMemo(() => {
    if (!selectedDate || !weekByDay[selectedDate]) return [];
    const hours = weekByDay[selectedDate];
    const todayKey = new Date().toISOString().slice(0, 10);

    if (selectedDate === todayKey) {
      const now = new Date();
      return hours.filter(h => parseHourTS(h.time) >= now);
    }
    return hours;
  }, [selectedDate, weekByDay]);

  const selectedDayHoursForDisplay: H[] = useMemo(() => {
    if (!selectedDate) return [];
    const todayKey = new Date().toISOString().slice(0, 10);

    if (selectedDate === todayKey) {
      return selectedDayHoursRaw.slice(0, 8);
    }
    const fromFiveAM = selectedDayHoursRaw.filter(h => parseHourTS(h.time).getHours() >= 5);
    return fromFiveAM.slice(0, 8);
  }, [selectedDate, selectedDayHoursRaw]);

  const selectedDaySummary = useMemo(
    () => (selectedDayHoursRaw.length ? summarizeDay(selectedDayHoursRaw) : null),
    [selectedDayHoursRaw]
  );

  const [adjustProposal, setAdjustProposal] = useState<null | {
    before: DaySelectionDTO['items'];
    after: DaySelectionDTO['items'];
    message: string;
  }>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function applyAdjustment(after: DaySelectionDTO['items'], message: string) {
    if (!selectedDate) return;
    try {
      const created = await createOutfit({
        outfitItems: after.map((i, idx) => ({
          closetItemId: i.closetItemId,
          layerCategory: i.layerCategory,
          sortOrder: idx,
        })),
        warmthRating: 0,
        waterproof: false,
        overallStyle: selectedStyle,
        weatherSummary: JSON.stringify({
          temperature: (selectedDaySummary || weather?.summary)?.avgTemp ?? 0,
          condition: (selectedDaySummary || weather?.summary)?.mainCondition ?? '',
        }),
        userRating: (() => {
          const key = daySel ? daySel.items.map(i => i.closetItemId).sort().join('-') : '';
          return ratings[key] ?? null;
        })(),
      });

      const newSnap = buildWeatherSnapshot(selectedDaySummary || weather?.summary)!;
      await upsertDaySelection({
        date: selectedDate,
        location: (locationLabel || undefined),
        style: selectedStyle,
        items: after,
        weather: newSnap,
        outfitId: created.id,
      });

      const fresh = await getDaySelection(selectedDate);
      setDaySel(fresh);
      showToast(message || 'Updated your selected outfit based on the latest forecast.');
    } catch (e) {
      console.error(e);
      showToast('Could not auto-adjust the outfit.');
    }
  }

  useEffect(() => {
    (async () => {
      if (!daySel || !selectedDate) return;
      const current = buildWeatherSnapshot(selectedDaySummary || weather?.summary || null);
      if (!current) return;

      const saved = {
        avgTemp: daySel.weatherAvg ?? 0,
        willRain: !!daySel.willRain,
      };

      const reasons = computeAdjustmentNeed(
        { avgTemp: saved.avgTemp, willRain: saved.willRain },
        { avgTemp: current.avgTemp, willRain: current.willRain }
      );
      if (reasons.length === 0) return;

      const closetResp = await fetchAllItems();
      const raw: ClosetItemDTO[] = (closetResp.data || []) as ClosetItemDTO[];
      const closet = raw
        .filter((c): c is ClosetItemDTO & { layerCategory: string } => !!c.layerCategory)
        .map(c => ({
          id: String(c.id),
          layerCategory: c.layerCategory!,
          waterproof: !!c.waterproof,
          colorHex: c.colorHex ?? undefined,
          dominantColors: c.dominantColors ?? [],
        }));

      let after = [...daySel.items];
      let messages: string[] = [];

      if (reasons.some(r => r.kind === 'rain_on')) {
        const hasWaterproofOuter = after.some(sel => {
          if (sel.layerCategory !== 'outerwear') return false;
          const closetMatch = closet.find(c => c.id === sel.closetItemId);
          return closetMatch?.waterproof === true;
        });
        if (!hasWaterproofOuter) {
          const candidates = closet.filter(c => c.layerCategory === 'outerwear' && c.waterproof === true);
          const pick = pickNeutralFirst(candidates);
          if (pick) {
            after = after.concat([{
              closetItemId: pick.id,
              layerCategory: 'outerwear',
              sortOrder: after.length,
            }]);
            messages.push('Added waterproof jacket due to rain forecast.');
          } else {
            showToast('Rain expected, but no waterproof outerwear found in your closet.');
          }
        }
      }

      for (const r of reasons) {
        if (r.kind === 'cooling') {
          for (let step = 0; step < r.steps; step++) {
            const mid = pickNeutralFirst(closet.filter(c => c.layerCategory === 'mid_top'));
            const out = pickNeutralFirst(closet.filter(c => c.layerCategory === 'outerwear'));
            const candidate = mid || out;
            if (candidate) {
              const already = after.some(i => i.closetItemId === candidate.id);
              if (already && mid && out && candidate.id === mid.id) {
                if (!after.some(i => i.closetItemId === out.id)) {
                  after = after.concat([{ closetItemId: out.id, layerCategory: 'outerwear', sortOrder: after.length }]);
                  messages.push('Added outer layer due to cooling.');
                  continue;
                }
              }
              if (!already) {
                after = after.concat([{
                  closetItemId: candidate.id,
                  layerCategory: candidate.layerCategory,
                  sortOrder: after.length,
                }]);
                messages.push('Added layer due to cooling.');
              }
            } else {
              showToast('Cooling detected, but no suitable extra layer found.');
              break;
            }
          }
        }
        if (r.kind === 'warming') {
          for (let step = 0; step < r.steps; step++) {
            const hasMid = after.find(i => i.layerCategory === 'mid_top');
            const hasOut = after.find(i => i.layerCategory === 'outerwear');
            if (!hasMid && !hasOut) {
              showToast('Warming detected, but no layers to remove.');
              break;
            }
            let removeId = hasMid?.closetItemId || hasOut?.closetItemId;
            if (hasMid && hasOut) {
              removeId = Math.random() < 0.5 ? hasMid.closetItemId : hasOut.closetItemId;
            }
            after = after.filter(i => i.closetItemId !== removeId);
            after = after.map((i, idx) => ({ ...i, sortOrder: idx }));
            messages.push('Removed a layer due to warming.');
          }
        }
      }

      const changed = JSON.stringify(after.map(i => i.closetItemId).sort()) !==
        JSON.stringify(daySel.items.map(i => i.closetItemId).sort());
      if (changed) {
        await applyAdjustment(after, messages.join(' '));
      }
    })();
  }, [city, selectedDate, weekQuery.data, daySel, selectedDaySummary, weather?.summary]);

  useEffect(() => {
    if (!daySel) { setWeatherAlert(null); return; }
    const current = buildWeatherSnapshot(selectedDaySummary || weather?.summary || null);
    if (!current) return;

    const then = {
      avgTemp: daySel.weatherAvg ?? 0,
      minTemp: daySel.weatherMin ?? daySel.weatherAvg ?? 0,
      maxTemp: daySel.weatherMax ?? daySel.weatherAvg ?? 0,
      willRain: !!daySel.willRain,
      mainCondition: daySel.mainCondition ?? '',
    };

    const reasons: string[] = [];
    const suggestions = new Set<string>();
    const TEMP_DELTA = 3;

    const rainChanged = then.willRain !== current.willRain;
    const tempChanged = Math.abs(then.avgTemp - current.avgTemp) >= TEMP_DELTA;
    const condChanged =
      (then.mainCondition || '').toLowerCase() !== (current.mainCondition || '').toLowerCase();

    if (rainChanged) {
      if (current.willRain) {
        reasons.push('Rain is now expected.');
        suggestions.add('Add a waterproof jacket');
        suggestions.add('Consider water-resistant shoes');
        suggestions.add('Pack an umbrella');
      } else {
        reasons.push('Rain is no longer expected.');
        suggestions.add('You can remove waterproof layers');
      }
    }

    if (tempChanged) {
      const diff = Math.round(Math.abs(current.avgTemp - then.avgTemp));
      const warmer = current.avgTemp > then.avgTemp;
      reasons.push(`Temperature changed by ~${diff}°C.`);
      if (warmer) {
        suggestions.add('Remove an outer layer');
        suggestions.add('Swap heavy jacket for a lighter one');
      } else {
        suggestions.add('Add a warm mid-layer');
        suggestions.add('Consider gloves/hat if it’s chilly');
      }
    }

    if (condChanged && !rainChanged) {
      reasons.push(`Conditions changed: ${then.mainCondition || '—'} → ${current.mainCondition || '—'}.`);
    }

    setWeatherAlert(reasons.length ? { reason: reasons.join(' '), suggestions: Array.from(suggestions).slice(0, 4) } : null);
  }, [daySel, selectedDaySummary, weather?.summary]);

  const summaryForOutfits = selectedDaySummary || weather?.summary || null;
  const outfitsQuery = useOutfitsQuery(summaryForOutfits as any, selectedStyle);

  const outfits: RecommendedOutfit[] = outfitsQuery.data ?? [];
  const loadingOutfits = outfitsQuery.isLoading || outfitsQuery.isFetching;

  const chosenKey = useMemo(() => getOutfitKeyFromDaySel(daySel), [daySel]);

  const outfitsOrdered: RecommendedOutfit[] = useMemo(() => {
    if (!outfits?.length || !chosenKey) return outfits;
    const idx = outfits.findIndex(o => getOutfitKey(o) === chosenKey);
    if (idx < 0) return outfits;
    return [outfits[idx], ...outfits.slice(0, idx), ...outfits.slice(idx + 1)];
  }, [outfits, chosenKey]);

  useEffect(() => {
    if (outfitsOrdered.length && chosenKey) {
      setCurrentIndex(0);
    }
  }, [outfitsOrdered.length, chosenKey]);

  const error =
    (weatherQuery.isError && 'Failed to fetch weather data.') ||
    (outfitsQuery.isError && 'Could not load outfit recommendations.') ||
    null;

  // ---------- City enter/refresh handlers ----------
  const handleEnterCity = async () => {
    const next = cityInput.trim();
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!next) {
      submittingRef.current = false;
      return;
    }

    let finalCity = next;
    const topMatch = citySuggest[0]?.city?.toLowerCase();
    if (!(topMatch && topMatch === next.toLowerCase())) {
      const standardized = await validateAndStandardizeCity(next);
      if (!standardized) {
        setCityError('Please select a real city (use the suggestions).');
        submittingRef.current = false;
        return;
      }
      finalCity = standardized;
    }

    if (finalCity === city) {
      submittingRef.current = false;
      return;
    }

    await commitCity(finalCity);

    queueMicrotask(() => { submittingRef.current = false; });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['outfits'] });
    queryClient.invalidateQueries({ queryKey: ['weather-week'] });
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.style || !newEvent.dateFrom || !newEvent.dateTo) {
      alert('Please fill in name, style, and both dates.');
      return;
    }
    try {
      const created = await createEvent({
        name: newEvent.name,
        location: newEvent.location,
        style: newEvent.style,
        dateFrom: new Date(newEvent.dateFrom).toISOString(),
        dateTo: new Date(newEvent.dateTo).toISOString(),
        isTrip: false,
      });

      setEvents(evt => [...evt, toEvent(created)]);
      setNewEvent({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' });
      setShowModal(false);
      showToast('Successfully added a new event!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create event';
      alert(msg);
    }
  };

  async function ensureOutfitSavedFor(outfit: RecommendedOutfit) {
    const key = getOutfitKey(outfit);
    if (outfitIdMap[key]) return outfitIdMap[key];

    const payload: SaveOutfitPayload = {
      outfitItems: outfit.outfitItems.map((i, idx) => ({
        closetItemId: i.closetItemId,
        layerCategory: i.layerCategory,
        sortOrder: idx,
      })),
      warmthRating: outfit.warmthRating,
      waterproof: outfit.waterproof,
      overallStyle: outfit.overallStyle,
      weatherSummary: JSON.stringify({
        temperature: outfit.weatherSummary.avgTemp,
        condition: outfit.weatherSummary.mainCondition,
      }),

      userRating: ratings[key] ?? null, 

    };

    const created = await createOutfit(payload);
    setOutfitIdMap(prev => ({ ...prev, [key]: created.id }));
    return created.id;
  }

  // ---------- Boot-up effects ----------
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUsername(JSON.parse(stored).name);
      } catch {
        /* noop */
      }
    }
  }, []);

  useEffect(() => {
    fetchAllEvents()
      .then(fetched => setEvents(fetched.map(toEvent)))
      .catch(err => console.error('Error loading events on mount:', err));
  }, []);

  const prevIndex = outfitsOrdered.length
    ? (currentIndex - 1 + outfitsOrdered.length) % outfitsOrdered.length
    : 0;
  const nextIndex = outfitsOrdered.length
    ? (currentIndex + 1) % outfitsOrdered.length
    : 0;

  const slideTo = (dir: -1 | 1) =>
    setCurrentIndex(i => {
      const n = outfitsOrdered.length;
      return n ? (i + dir + n) % n : 0;
    });

  // ---------- Event modal: outfit recommendation with caching ----------
  const selectedEventTodaySummary: WeatherSummary | undefined = useMemo(() => {
    if (!selectedEvent?.weather) return undefined;
    try {
      const days: { date: string; summary: any }[] = JSON.parse(selectedEvent.weather) || [];
      return days[0]?.summary
        ? {
          avgTemp: days[0].summary.avgTemp,
          minTemp: days[0].summary.minTemp,
          maxTemp: days[0].summary.maxTemp,
          willRain: days[0].summary.willRain,
          mainCondition: days[0].summary.mainCondition,
        }
        : undefined;
    } catch {
      return undefined;
    }
  }, [selectedEvent]);

  const eventOutfitQuery = useQuery({
    queryKey: [
      'event-outfit',
      selectedEvent?.id || 'no-event',
      selectedEvent?.style || 'Casual',
      selectedEventTodaySummary
        ? JSON.stringify({
          a: Math.round(selectedEventTodaySummary.avgTemp),
          i: Math.round(selectedEventTodaySummary.minTemp),
          x: Math.round(selectedEventTodaySummary.maxTemp),
          r: selectedEventTodaySummary.willRain,
          m: selectedEventTodaySummary.mainCondition,
        })
        : 'no-summary',
    ],
    enabled: Boolean(selectedEvent?.id && selectedEvent?.style && selectedEventTodaySummary),
    queryFn: async () => {
      const recs = await fetchRecommendedOutfits(
        selectedEventTodaySummary!,
        selectedEvent!.style!,
        selectedEvent!.id,
      );
      return recs[0] ?? null;
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const detailOutfit = eventOutfitQuery.data ?? null;
  const detailLoading = eventOutfitQuery.isLoading || eventOutfitQuery.isFetching;
  const detailError = eventOutfitQuery.isError ? 'Could not load outfit recommendation.' : null;

  useEffect(() => {
    const isWithin3Days = (d: Date) => {
      const now = new Date();
      const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 3 && diffDays >= -1;
    };

    const tick = async () => {
      for (const ev of events) {
        if (ev.type === 'trip') continue;
        if (!isWithin3Days(new Date(ev.dateFrom))) continue;
        if (!ev.weather) continue;
        try {
          const days: { date: string; summary: any }[] = JSON.parse(ev.weather);
          for (const { summary } of days) {
            if (!summary) continue;
            await fetchRecommendedOutfits(
              {
                avgTemp: summary.avgTemp,
                minTemp: summary.minTemp,
                maxTemp: summary.maxTemp,
                willRain: summary.willRain,
                mainCondition: summary.mainCondition,
              },
              ev.style!,
              ev.id
            );
          }
        } catch {
        }
      }
    };

    tick();
    const id = setInterval(tick, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [events]);

  // ---- From Events: rebuild event weather & prewarm recs after create/edit ----
  async function rebuildEventWeatherAndRecs(ev: Event) {
    try {
      const { data } = await axios.get(`${API_BASE}/api/weather/week`, {
        params: { location: ev.location, t: Date.now() },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const hours: H[] = (data?.forecast || []) as H[];
      const byDay = groupByDay(hours);

      const days: Array<{ date: string; summary: ReturnType<typeof summarizeDay> | null }> = [];
      const start = new Date(ev.dateFrom);
      const end = new Date(ev.dateTo);
      const seen = new Set<string>();

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (seen.has(key)) continue;
        seen.add(key);
        const dayHours = byDay[key] || [];
        days.push({ date: key, summary: dayHours.length ? summarizeDay(dayHours) : null });
      }

      for (const item of days) {
        if (item.summary) {
          await fetchRecommendedOutfits(
            {
              avgTemp: item.summary.avgTemp,
              minTemp: item.summary.minTemp,
              maxTemp: item.summary.maxTemp,
              willRain: item.summary.willRain,
              mainCondition: item.summary.mainCondition,
            },
            ev.style || 'Casual',
            ev.id
          );
        }
      }

      const withWeather: Event = {
        ...ev,
        weather: JSON.stringify(
          days.map(d => ({
            date: d.date,
            summary: d.summary && {
              avgTemp: d.summary.avgTemp,
              minTemp: d.summary.minTemp,
              maxTemp: d.summary.maxTemp,
              willRain: d.summary.willRain,
              mainCondition: d.summary.mainCondition,
            },
          }))
        ),
      };

      setEvents(list => list.map(e => (e.id === withWeather.id ? withWeather : e)));
      setSelectedEvent(withWeather);
      queryClient.invalidateQueries({ queryKey: ['event-outfit'] });
    } catch (e) {
      console.error('Failed to rebuild weather/recs after edit', e);
      queryClient.invalidateQueries({ queryKey: ['event-outfit'] });
    }
  }

  // ---------- Rating save ----------
  const handleSaveRating = async (rating: number) => {
    const outfit = outfitsOrdered[currentIndex];
    if (!outfit) return;

    const key = getOutfitKey(outfit);
    setSaving(true);
    try {
      if (outfitIdMap[key]) {
        await updateOutfit(outfitIdMap[key], { userRating: rating });
      } else {
        const payload: SaveOutfitPayload = {
          outfitItems: outfit.outfitItems.map((i, idx) => ({
            closetItemId: i.closetItemId,
            layerCategory: i.layerCategory,
            sortOrder: idx,
          })),
          warmthRating: outfit.warmthRating,
          waterproof: outfit.waterproof,
          overallStyle: outfit.overallStyle,
          weatherSummary: JSON.stringify({
            temperature: outfit.weatherSummary.avgTemp,
            condition: outfit.weatherSummary.mainCondition,
          }),
          userRating: rating,
        };
        const created = await createOutfit(payload);
        setOutfitIdMap(prev => ({ ...prev, [key]: created.id }));
      }
      setRatings(prev => ({ ...prev, [key]: rating }));
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save your rating.');
    } finally {
      setSaving(false);
    }
  };

  const { weekMin, weekMax } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const d of Object.keys(weekByDay)) {
      const s = summarizeDay(weekByDay[d]);
      mn = Math.min(mn, s.minTemp);
      mx = Math.max(mx, s.maxTemp);
    }
    if (!isFinite(mn) || !isFinite(mx)) return { weekMin: 0, weekMax: 1 };
    return { weekMin: Math.floor(mn), weekMax: Math.ceil(mx) };
  }, [weekByDay]);

  useEffect(() => {
    if (!dayKeys.length) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    setSelectedDate(dayKeys.includes(todayKey) ? todayKey : dayKeys[0]);
  }, [dayKeys]);

  function OutfitImagesCard({
    outfit,
    controls,
  }: {
    outfit: RecommendedOutfit;
    controls?: ReactNode;
  }) {
    return (
      <div className="relative bg-white dark:bg-gray-800 border rounded-xl shadow-md p-2 sm:p-2.5">
        <div className="space-y-1">
          {/* headwear / accessory */}
          <div
            className={`flex justify-center space-x-1 transition-all ${outfit.outfitItems.some(
              (i) => i.layerCategory === 'headwear' || i.layerCategory === 'accessory'
            )
              ? 'h-auto'
              : 'h-0 overflow-hidden'
              }`}
          >
            {outfit.outfitItems
              .filter((i) => i.layerCategory === 'headwear' || i.layerCategory === 'accessory')
              .map((item) => (
                <img
                  key={item.closetItemId}
                  src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                  alt={item.category}
                  className="
  w-8 h-8 max-[380px]:w-6 max-[380px]:h-6
  sm:w-20 sm:h-20
  md:w-24 md:h-24
  lg:w-28 lg:h-28
  xl:w-32 xl:h-32
  object-contain rounded-lg
"
                />
              ))}
          </div>

          {/* tops */}
          <div className="flex justify-center space-x-1">
            {outfit.outfitItems
              .filter((i) => ['base_top', 'mid_top', 'outerwear'].includes(i.layerCategory))
              .map((item) => (
                <img
                  key={item.closetItemId}
                  src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                  alt={item.category}
                  className="
  w-16 h-16 max-[380px]:w-12 max-[380px]:h-12
  sm:w-20 sm:h-20
  md:w-24 md:h-24
  lg:w-28 lg:h-28
  xl:w-32 xl:h-32
  object-contain rounded-lg
"
                />
              ))}
          </div>

          {/* bottoms */}
          <div className="flex justify-center space-x-1">
            {outfit.outfitItems
              .filter((i) => i.layerCategory === 'base_bottom')
              .map((item) => (
                <img
                  key={item.closetItemId}
                  src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                  alt={item.category}
                  className="
  w-16 h-16 max-[380px]:w-12 max-[380px]:h-12
  sm:w-20 sm:h-20
  md:w-24 md:h-24
  lg:w-28 lg:h-28
  xl:w-32 xl:h-32
  object-contain rounded-lg
"
                />
              ))}
          </div>

          {/* footwear */}
          <div className="flex justify-center space-x-1">
            {outfit.outfitItems
              .filter((i) => i.layerCategory === 'footwear')
              .map((item) => (
                <img
                  key={item.closetItemId}
                  src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                  alt={item.category}
                  className="
  w-14 h-14 max-[380px]:w-10 max-[380px]:h-10
  sm:w-18 sm:h-18
  md:w-20 md:h-20
  lg:w-22 lg:h-22
  xl:w-24 xl:h-24
  object-contain rounded-lg
"
                />
              ))}
          </div>
        </div>

        {/* Controls below the card so images aren’t covered */}
        {controls && (
          <div className="mt-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-lg px-3 py-2 shadow-sm">

              {controls}
            </div>
          </div>
        )}
      </div>
    );
  }

    // === REPLACE: marquee-feel + swipe + desktop arrows ===
  function EventsCarousel({
    items,
    onOpen,
  }: {
    items: Event[];
    onOpen: (ev: Event) => void;
  }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const isCoarse = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;

    const { pause: pauseAuto } = useAutoplayScrolling(trackRef, {
      pxPerSec: isCoarse ? 32 : 45,
      pauseMsAfterInteract: isCoarse ? 1200 : 1600,
      respectReducedMotion: false,
    });

    const stepByCard = (dir: -1 | 1) => {
      const el = trackRef.current;
      if (!el) return;
      const firstCard = el.querySelector<HTMLElement>('[data-ev-card]');
      const style = getComputedStyle(el);
      const gap =
        parseFloat(style.columnGap || style.gap || '0') ||
        parseFloat((style as any)['gridColumnGap'] || '0') ||
        24;
      const w = (firstCard?.offsetWidth || 260) + gap;
      el.scrollBy({ left: dir * w, behavior: 'smooth' });
      pauseAuto(1200); 
    };


    return (
      <div className="relative">
        {/* fade edges for nicer marquee illusion */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black via-black/60 to-transparent" />

        <div
          ref={trackRef}
          tabIndex={0}
          aria-label="Upcoming events carousel"
          className="
            events-track no-scrollbar
            flex gap-6 overflow-x-auto overscroll-contain scroll-smooth
            snap-none md:snap-x md:snap-proximity /* see #2 */
            pt-1 pb-2 touch-pan-x focus:outline-none
          "
        >
          {/* duplicate once to make the loop feel continuous when auto-scrolling */}
          {[...items, ...items].map((ev, i) => {
            const img = eventImageFor(ev.style);
            const key = `${ev.id}-${i < items.length ? 'a' : 'b'}-${i}`;
            return (
              <button
                key={key}
                onClick={() => onOpen(ev)}
                className="group text-left snap-start min-w-[240px] sm:min-w-[240px] lg:min-w-[280px] focus:outline-none focus:ring-2 focus:ring-white/50 rounded-2xl"
                data-ev-card
              >
                <div className="relative w-full overflow-hidden rounded-2xl shadow-md">
                  <img
                    src={img}
                    alt={ev.style || 'event'}
                    className="w-full h-36 sm:h-40 lg:h-44 object-cover transform transition duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="mt-3">
                  <div className="text-white text-xl sm:text-2xl font-semibold leading-snug truncate">
                    {ev.name?.charAt(0).toUpperCase() + ev.name?.slice(1)}
                  </div>
                  <div className="mt-1 text-gray-300 text-sm sm:text-base space-y-0.5">
                    <div className="capitalize">{ev.style || '—'}</div>
                    <div className="truncate">{ev.location || '—'}</div>
                    <div>{formatDateOnly(ev.dateFrom)}</div>
                    <div>{formatTimeAmPm(ev.dateFrom)}</div>
                  </div>
                </div>
              </button>
            );
          })}
          <div className="shrink-0 w-2" />
        </div>

        {/* desktop arrows (hidden on small screens) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
          <button
            type="button"
            onClick={() => stepByCard(-1)}
            className="pointer-events-auto ml-[-6px] hidden lg:grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Previous event"
            title="Previous"
          >
            <svg viewBox="0 0 10 10" className="w-4 h-4" fill="currentColor"><polygon points="7.5,1 2.5,5 7.5,9" /></svg>
          </button>
          <button
            type="button"
            onClick={() => stepByCard(1)}
            className="pointer-events-auto mr-[-6px] hidden lg:grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Next event"
            title="Next"
          >
            <svg viewBox="0 0 10 10" className="w-4 h-4" fill="currentColor"><polygon points="2.5,1 7.5,5 2.5,9" /></svg>
          </button>
        </div>
      </div>
    );
  }

  const heroDescription =
    selectedDaySummary?.mainCondition ||
    weather?.summary?.mainCondition ||
    (week?.summary?.mainCondition ?? '');

  const heroAvgTemp =
    typeof selectedDaySummary?.avgTemp === 'number'
      ? Math.round(selectedDaySummary.avgTemp)
      : typeof weather?.summary?.avgTemp === 'number'
        ? Math.round(weather.summary.avgTemp)
        : null;

  const todayIso = new Date().toISOString().slice(0, 10);

  const orderedDays = useMemo(() => {
    if (!dayKeys.length) return [];
    const i = Math.max(0, dayKeys.indexOf(todayIso));
    return [...dayKeys.slice(i), ...dayKeys.slice(0, i)];
  }, [dayKeys, todayIso]);

  const orderedIdx = Math.max(0, orderedDays.indexOf(selectedDate || todayIso));
  const nextDayIso = orderedDays[(orderedIdx + 1) % orderedDays.length];

  const hoursForHourlyComponent =
    selectedDate === todayIso
      ? [
        ...selectedDayHoursRaw,
        ...(weekByDay[nextDayIso] || []),
      ]
      : selectedDayHoursRaw;

  const daySummaries = useMemo(() => {
    const map: Record<string, ReturnType<typeof summarizeDay>> = {};
    for (const d of dayKeys) {
      map[d] = summarizeDay(weekByDay[d] || []);
    }
    return map;
  }, [dayKeys, weekByDay]);

  const shortDow = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: 'short' });

  const avgFor = (iso: string) =>
    daySummaries[iso] ? Math.round(daySummaries[iso].avgTemp) : null;

  const pickDay = (iso: string) => {
    setSelectedDate(iso);
    setCurrentIndex(0);
    queryClient.invalidateQueries({ queryKey: ['outfits'] });
  };

  const stepDay = (dir: -1 | 1) => {
    if (!orderedDays.length) return;
    const idx = Math.max(0, orderedDays.indexOf(selectedDate || orderedDays[0]));
    const next = orderedDays[(idx + (dir === 1 ? 1 : -1) + orderedDays.length) % orderedDays.length];
    pickDay(next);
  };

  const currentOutfit = outfitsOrdered[currentIndex];
  const isCurrentChosen =
    !!chosenKey && currentOutfit && getOutfitKey(currentOutfit) === chosenKey;

  return (
    <div
      className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0 ml-[calc(-50vw+50%)]"
      style={{ paddingTop: 0 }}
    >

      {/* ===================== HERO ===================== */}
      <header className="relative w-full overflow-hidden pb-16 sm:pb-20 mb-8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(/background.jpg)` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        <div className="relative z-10 w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6 lg:py-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
              <div className="text-white relative pb-12 sm:pb-0">
                <p className="text-[13px] sm:text-xs uppercase tracking-wide opacity-90 mb-2">
                  {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
                </p>

                <div className="hidden sm:inline-block backdrop-blur-2xl bg-white/10 rounded-2xl p-2 sm:p-2.5 -mb-2 mt-2">
                  <p className="text-[14px] sm:text-xs font-medium tracking-wide">Weather Forecast</p>
                </div>

                <h1 className="text-4xl sm:text-4xl md:text-6xl font-livvic font-semibold leading-snug mb-2 sm:mb-3">
                  {heroDescription || '—'}
                </h1>

                {orderedDays.length > 0 && (
                  <div className="sm:hidden absolute left-0 right-0 bottom-0 flex items-center gap-3 text-white">
                    <button
                      type="button"
                      onClick={() => stepDay(-1)}
                      aria-label="Previous day"
                      className="shrink-0 active:scale-95"
                    >
                      <svg viewBox="0 0 10 10" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                        <polygon points="7.5,1 2.5,5 7.5,9" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium">
                        {shortDow(selectedDate || orderedDays[0])}
                      </span>
                      <span className="text-base font-medium tabular-nums">
                        {(() => {
                          const d = selectedDate || orderedDays[0];
                          const t = avgFor(d);
                          return t !== null ? `${t}°C` : '—';
                        })()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => stepDay(1)}
                      aria-label="Next day"
                      className="shrink-0 active:scale-95"
                    >
                      <svg viewBox="0 0 10 10" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                        <polygon points="2.5,1 7.5,5 2.5,9" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="justify-self-end self-center">
                <div
                  className={[
                    "backdrop-blur-2xl bg-white/10 text-white rounded-2xl",
                    "p-3 sm:p-4",
                    "w-auto max-w-[85vw] xs:max-w-[70vw] sm:max-w-xs",
                    "flex flex-col items-end gap-1",
                    "text-right",
                  ].join(" ")}
                >
                  <div className="relative inline-block">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleEnterCity();
                      }}
                      className="w-full"
                    >
                      <div
                        className="
            relative
            w-full
            max-w-[90vw] sm:max-w-md
            backdrop-blur-2xl bg-white/10
            rounded-full
            pl-8 pr-3 py-1
            focus-within:ring-2 focus-within:ring-[#3F978F]
          "
                      >
                        {/* search icon */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>

                        <input
                          type="text"
                          placeholder=" Select City"
                          value={cityInput}
                          onChange={(e) => setCityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEnterCity();
                            }
                            if (e.key === 'Escape') setCitySuggest([]);
                          }}
                          autoComplete="off"
                          aria-autocomplete="list"
                          aria-expanded={citySuggest.length > 0}
                          aria-controls="city-suggest-listbox"
                          role="combobox"
                          className="
              w-full bg-transparent outline-none
              placeholder-white/70 text-white
              text-sm sm:text-base
            "
                          aria-label=" Select City"
                        />
                      </div>
                    </form>

                    {(cityLoading || citySuggest.length > 0 || cityError) && (
                      <div
                        ref={suggestionsBoxRef}
                        className="

            pointer-events-none
            absolute top-0 right-full mr-2
            w-[16rem] sm:w-[20rem]
            z-50
          "
                      >
                        {cityLoading && (
                          <div className="pointer-events-auto text-xs text-white/90 bg-white/10 rounded-md px-3 py-2 backdrop-blur">
                            Searching cities…
                          </div>
                        )}

                        {!!citySuggest.length && (
                          <ul
                            id="city-suggest-listbox"
                            role="listbox"
                            className="
                pointer-events-auto
                mt-1 max-h-56 overflow-auto rounded-md
                border border-white/20
                bg-white/95 dark:bg-gray-900/95
                text-gray-900 dark:text-gray-100 shadow-lg
              "
                          >
                            {citySuggest.map((opt, i) => (
                              <li key={i} role="option" aria-selected={false}>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  onClick={() => {
                                    commitCity(opt.city);
                                  }}
                                >
                                  {opt.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {cityError && (
                          <p className="pointer-events-auto mt-1 text-sm text-red-300 bg-red-900/30 border border-red-400/40 rounded-md px-3 py-1">
                            {cityError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>


                  <div className="flex items-start gap-1 w-full justify-end">
                    <svg className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 mt-[1px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.686 2 6 4.686 6 8c0 4.333 6 12 6 12s6-7.667 6-12c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                    </svg>
                    <span className="text-lg sm:text-sm font-medium whitespace-normal break-words leading-snug">
                      {locationLabel || 'Select a city'}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-5xl md:text-6xl font-semibold tabular-nums">
                    {heroAvgTemp !== null ? `${heroAvgTemp}°C` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {orderedDays.length > 0 && (
          <div className="pointer-events-auto hidden sm:block absolute bottom-3 sm:bottom-4 left-0 right-0">
            <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-7 gap-2">
                {orderedDays.slice(0, 7).map((iso) => {
                  const active = iso === (selectedDate || orderedDays[0]);
                  const avg = avgFor(iso);
                  return (
                    <button
                      key={iso}
                      onClick={() => pickDay(iso)}
                      className={[
                        "flex flex-col items-center justify-center rounded-xl",
                        " text-white",
                        "py-2 sm:py-3",
                        active ? "opacity-100 " : "opacity-60 hover:opacity-85",
                        "transition"
                      ].join(" ")}
                      aria-label={`Select ${shortDow(iso)}`}
                    >
                      <span className="text-lg font-medium leading-none">{shortDow(iso)}</span>
                      <span className="text-sm mt-1 tabular-nums">{avg !== null ? `${avg}°C` : '—'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===================== MAIN ===================== */}
      <main className="flex flex-col gap-10 px-0 w-full">
        <section className="
  grid gap-8 lg:gap-10 xl:gap-12
  place-items-center lg:place-items-start
  grid-cols-1 lg:grid-cols-3
  px-0 sm:px-6 lg:px-8
  md:-mb-16
">
          {/* LEFT: Slogan + Hourly Forecast */}
          <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col items-center lg:items-start justify-start w-full z-10">
            <div className="w-full max-w-sm sm:max-w-md mt-0 mb-8">
              {loadingWeather ? (
                <p className="text-center text-sm text-gray-500">Loading hours…</p>
              ) : error && !weather ? (
                <p className="text-red-500 text-center">{error}</p>
              ) : (
                <div className="text-center">
                  <HourlyForecast forecast={hoursForHourlyComponent} />
                </div>
              )}
            </div>

            <div className="hidden sm:block">
              <TypingSlogan />
            </div>
          </div>

          {/* MIDDLE: Outfit */}
          <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col items-center w-full md:-ml-16">
            <div className="w-full">
              <div className="bg-white">
                <div className="w-full mb-4">
                  <h3
                    className="
    md:ml-8
      text-center
      text-3xl sm:text-4xl lg:text-5xl
      font-livvic font-bold tracking-tight
      text-gray-900 dark:text-gray-100
    "
                  >
                    Outfit of the Day
                  </h3>
                </div>


                {loadingOutfits && <p className="text-center">Loading outfits…</p>}
                {error && !loadingOutfits && <p className="text-red-500 text-center">{error}</p>}
                {!loadingOutfits && outfits.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    Sorry, we couldn't generate an outfit in that style. Please add more items to your wardrobe.
                  </p>
                )}


                {/* Style Dropdown — centered, same width as carousel */}
                <div className="
    md:ml-8
      text-center
      
      font-livvic  tracking-tight
      text-gray-900 dark:text-gray-100 
      mb-4">

                  <label htmlFor="style-select" className="sr-only">Style</label>
                  <select
                    id="style-select"
                    value={selectedStyle}
                    onChange={e => {
                      setSelectedStyle(e.target.value);
                      queryClient.invalidateQueries({ queryKey: ['outfits'] });
                    }}
                    className="block w-full w-[min(40%,320px)] mx-auto p-2 bg-white dark:bg-gray-900 rounded-full border border-black dark:border-white focus:outline-none font-livvic"
                  >
                    <option value="Formal">Formal</option>
                    <option value="Casual">Casual</option>
                    <option value="Athletic">Athletic</option>
                    <option value="Party">Party</option>
                    <option value="Business">Business</option>
                    <option value="Outdoor">Outdoor</option>
                  </select>
                </div>


                <div className="
  md:ml-8 text-center font-livvic tracking-tight
  text-gray-900 dark:text-gray-100 mb-4"
                >
                  {!daySel ? (
                    <button
                      onClick={async () => {
                        if (isCurrentChosen) return;
                        if (!selectedDate) { showToast('Pick a day first'); return; }
                        const outfit = outfitsOrdered[currentIndex];
                        if (!outfit) { showToast('No outfit to save'); return; }

                        const snap = buildWeatherSnapshot(selectedDaySummary || weather?.summary || null);
                        if (!snap) { showToast('Weather not ready, try again'); return; }

                        try {
                          const savedOutfitId = await ensureOutfitSavedFor(outfit);
                          const created = await upsertDaySelection({
                            date: selectedDate,
                            location: locationLabel || undefined,
                            style: selectedStyle,
                            items: outfit.outfitItems.map((i, idx) => ({
                              closetItemId: i.closetItemId,
                              layerCategory: i.layerCategory,
                              sortOrder: idx,
                            })),
                            weather: snap,
                            outfitId: savedOutfitId,
                          });
                          setDaySel(created);
                          showToast('Saved outfit for the day!');
                          setCurrentIndex(0);
                        } catch (e) {
                          console.error(e);
                          showToast('Could not save. Try again.');
                        }
                      }}
                      disabled={isCurrentChosen}
                      className={[
                        "px-4 py-2 rounded-full border transition",
                        isCurrentChosen
                          ? "border-gray-300 text-gray-400 cursor-default"
                          : "border-[#3F978F] text-[#3F978F] hover:bg-[#3F978F]/10"
                      ].join(' ')}
                    >
                      Save for this Day
                    </button>
                  ) : (
                    <div className="inline-flex gap-3">
                      <button
                        onClick={async () => {
                          if (!selectedDate) return;
                          await deleteDaySelection(selectedDate);
                          setDaySel(null);
                          setCurrentIndex(0);
                          queryClient.invalidateQueries({ queryKey: ['outfits'] });
                          showToast('Unselected. Showing new recommendations.');
                        }}
                        className="px-4 py-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50"
                      >
                        Unselect
                      </button>
                    </div>

                  )}
                </div>


                {!loadingOutfits && outfits.length > 0 && (
                  daySel?.items?.length ? (
                    // ---------- SINGLE-OUTFIT VIEW ----------
                    <div className="w-full flex flex-col items-center">
                      <div className="max-w-[60vw] sm:max-w-lg md:max-w-xl lg:max-w-xl md:ml-16 w-full">
                        <OutfitImagesCard
                          outfit={selectedOutfitFromDaySel!}
                          controls={
                            <div className="flex flex-col items-center gap-2 sm:gap-3">
                              <StarRating
                                disabled={saving}
                                onSelect={async (rating) => {
                                  try {
                                    const key = getOutfitKey(selectedOutfitFromDaySel!);
                                    setSaving(true);
                                    let targetId = daySel!.outfitId || outfitIdMap[key];

                                    const meta = selectedOutfitFromDaySel || outfitsOrdered[currentIndex];

                                    if (!targetId) {

                                      const created = await createOutfit({
                                        outfitItems: daySel!.items.map((i, idx) => ({
                                          closetItemId: i.closetItemId,
                                          layerCategory: i.layerCategory,
                                          sortOrder: idx,
                                        })),
                                        warmthRating: meta?.warmthRating,            
                                        waterproof: !!meta?.waterproof,              
                                        overallStyle: meta?.overallStyle ?? selectedStyle, 
                                        weatherSummary: JSON.stringify(
                                          meta?.weatherSummary ?? {
                                            temperature: selectedOutfitFromDaySel!.weatherSummary.avgTemp,
                                            condition: selectedOutfitFromDaySel!.weatherSummary.mainCondition,
                                          }
                                        ),
                                        userRating: rating ?? null,                  
                                      });
                                      targetId = created.id;
                                      setOutfitIdMap(prev => ({ ...prev, [key]: targetId! }));

                                      await upsertDaySelection({
                                        date: selectedDate!,
                                        location: locationLabel || undefined,
                                        style: selectedStyle,
                                        items: daySel!.items,
                                        weather: buildWeatherSnapshot(selectedDaySummary || weather?.summary)!,
                                        outfitId: targetId,
                                      });
                                      const fresh = await getDaySelection(selectedDate!);
                                      setDaySel(fresh);
                                    } else {
                                      await updateOutfit(targetId, { userRating: rating ?? null });
                                    }

                                    setRatings(prev => ({ ...prev, [key]: rating ?? null }));
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                value={(() => {
                                  const key = selectedOutfitFromDaySel ? getOutfitKey(selectedOutfitFromDaySel) : '';
                                  return ratings[key] ?? (typeof selectedOutfitFromDaySel?.userRating === 'number'
                                    ? selectedOutfitFromDaySel.userRating
                                    : undefined);
                                })()}
                              />


                              {/* <button
                                onClick={async () => {
                                  if (!selectedDate) return;
                                  await deleteDaySelection(selectedDate);
                                  setDaySel(null);
                                  setCurrentIndex(0);
                                  queryClient.invalidateQueries({ queryKey: ['outfits'] });
                                  showToast('Unselected. Showing new recommendations.');
                                }}
                                className="px-4 py-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50"
                              >
                                Unselect
                              </button> */}
                            </div>
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    // ---------- CAROUSEL ----------
                    <>
                      <div className="w-full flex flex-col items-center">
                        <div
                          className="
          relative mb-2 w-full
          max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl md:ml-0 md:mr-8
          mx-0 sm:mx-auto
          
          
          overflow-visible

          max-w-[60vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl md:ml-16 w-full
          
        "

                        >
                          {/* Reserve height so absolute stage can sit on top */}
                          <div className="
          invisible
          w-[min(92%,360px)] sm:w-[min(92%,420px)] md:w-[min(92%,520px)] lg:w-[min(92%,600px)] xl:w-[min(92%,680px)]
          mx-auto
        ">
                            <OutfitImagesCard outfit={outfitsOrdered[currentIndex]} />
                          </div>


                          {/* stage (full area), with a centered rail */}
                          <div className="mr-44 md:mr-52 absolute inset-0 flex justify-center">
                            <div className="
            relative
            w-[min(92%,360px)] sm:w-[min(92%,420px)] md:w-[min(92%,520px)] lg:w-[min(92%,600px)] xl:w-[min(92%,680px)]
          ">
                              {/* LEFT (prev) */}
                              {outfits.length > 1 && (
                                <motion.button
                                  type="button"
                                  onClick={() => slideTo(-1)}
                                  className="absolute left-1/2 -translate-x-1/2 top-0 w-full"
                                  initial={false}
                                  animate={{ x: '-60%', y: -10, scale: 0.82, opacity: 0.6, zIndex: 1 }}
                                  whileHover={{ scale: 0.84, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                >
                                  <OutfitImagesCard outfit={outfitsOrdered[prevIndex]} />
                                </motion.button>
                              )}

                              {/* RIGHT (next) */}
                              {outfits.length > 1 && (
                                <motion.button
                                  type="button"
                                  onClick={() => slideTo(1)}
                                  className="absolute left-1/2 -translate-x-1/2 top-0 w-full"
                                  initial={false}
                                  animate={{ x: '60%', y: -10, scale: 0.82, opacity: 0.6, zIndex: 1 }}
                                  whileHover={{ scale: 0.84, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                >
                                  <OutfitImagesCard outfit={outfitsOrdered[nextIndex]} />
                                </motion.button>
                              )}

                              {/* CENTER (current) */}
                              <motion.div
                                className="absolute left-1/2 -translate-x-1/2 top-0 w-full cursor-grab active:cursor-grabbing"
                                initial={false}
                                animate={{ x: 0, y: 0, scale: 1, opacity: 1, zIndex: 3 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={(_, info) => {
                                  const goRight = info.offset.x < -70 || info.velocity.x < -300;
                                  const goLeft = info.offset.x > 70 || info.velocity.x > 300;
                                  if (goRight) slideTo(1);
                                  else if (goLeft) slideTo(-1);
                                }}
                              >

                                <OutfitImagesCard
                                  outfit={outfitsOrdered[currentIndex]}
                                  controls={
                                    <div className="flex flex-col items-center gap-2 sm:gap-3">
                                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                                        <div className="scale-125 sm:scale-100 transform origin-center">
                                          <StarRating
                                            disabled={saving}
                                            onSelect={handleSaveRating}
                                            value={currentOutfit ? (ratings[getOutfitKey(currentOutfit)] || 0) : 0}
                                          />
                                        </div>

                                        <button
                                          onClick={handleRefresh}
                                          className="p-2 rounded-full text-[#3F978F] hover:text-[#2f716b] -translate-y-1"
                                          aria-label="Refresh recommendations"
                                          title="Refresh recommendations"
                                        >
                                          <RefreshCw className="w-6 h-6 align-middle" />
                                        </button>

                                      </div>

                                      {/* <button
                                        onClick={async () => {
                                          if (isCurrentChosen) return;
                                          if (!selectedDate) { showToast('Pick a day first'); return; }
                                          const outfit = outfitsOrdered[currentIndex];
                                          if (!outfit) { showToast('No outfit to save'); return; }

                                          const snap = buildWeatherSnapshot(selectedDaySummary || weather?.summary || null);
                                          if (!snap) { showToast('Weather not ready, try again'); return; }

                                          try {
                                            const savedOutfitId = await ensureOutfitSavedFor(outfit);
                                            const created = await upsertDaySelection({
                                              date: selectedDate,
                                              location: locationLabel || undefined,
                                              style: selectedStyle,
                                              items: outfit.outfitItems.map((i, idx) => ({
                                                closetItemId: i.closetItemId,
                                                layerCategory: i.layerCategory,
                                                sortOrder: idx,
                                              })),
                                              weather: snap,
                                              outfitId: savedOutfitId,
                                            });
                                            setDaySel(created);
                                            showToast('Saved outfit for the day!');
                                            setCurrentIndex(0);
                                          } catch (e) {
                                            console.error(e);
                                            showToast('Could not save. Try again.');
                                          }
                                        }}
                                        disabled={isCurrentChosen}
                                        className={[
                                          "px-4 py-2 rounded-full border transition",
                                          isCurrentChosen
                                            ? "border-gray-300 text-gray-400 cursor-default"
                                            : "border-[#3F978F] text-[#3F978F] hover:bg-[#3F978F]/10"
                                        ].join(' ')}
                                      >
                                        {isCurrentChosen
                                          ? 'Chosen'
                                          : daySel
                                            ? 'Update Selection'
                                            : 'Save for this Day'}
                                      </button> */}

                                    </div>
                                  }
                                />
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:ml-32 text-center text-sm mb-2 mt-32 w-full
        w-[min(92%,360px)] sm:w-[min(92%,420px)] md:w-[min(92%,560px)] lg:w-[min(92%,680px)] xl:w-[min(92%,760px)]
        mx-auto">
                        {outfitsOrdered.length ? `${currentIndex + 1} / ${outfitsOrdered.length}` : '0 / 0'}
                      </div>
                    </>
                  )
                )}

              </div>
            </div>
          </div>
        </section>

        {/* Events Section (Improved UI kept) */}
        <section className="w-full sm:mt-12 px-0  bg-black">
          <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-3 items-center mb-6">
              <div />
              <h2 className="justify-self-center text-center text-white text-3xl sm:text-4xl font-livvic font-semibold tracking-tight">
                Upcoming Events
              </h2>
              <button
                onClick={() => setShowModal(true)}
                className="justify-self-end inline-flex items-center justify-center rounded-full border border-[#FFFFFF]/60 text-[#FFFFFF] px-3 py-2 hover:bg-[#FFFFFF]/10 transition"
                aria-label="Add Event"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {events.filter(e => e.type !== 'trip').length > 0 ? (
              <EventsCarousel
                items={events
                  .filter(e => e.type !== 'trip')
                  .slice()
                  .sort((a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime())}
                onOpen={(ev) => { setSelectedEvent(ev); setShowDetailModal(true); }}
              />
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 mb-4">No upcoming events</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 rounded-full border border-[#3F978F] text-[#3F978F] hover:bg-[#3F978F]/10 transition"
                >
                  Add Your First Event
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer banner (full-bleed) */}
      <div className="relative w-full h-48 mt-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(/header.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Create New Event Modal (Improved UI + Events logic) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowModal(false)}>
              ×
            </button>
            <h2 className="text-2xl mb-4 font-livvic">Create new event</h2>
            <div className="space-y-3 flex-grow">
              <input
                className="w-full p-2 border rounded"
                placeholder="Event name"
                value={newEvent.name}
                onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
              />
              <input
                className="w-full p-2 border rounded"
                placeholder="Location"
                value={newEvent.location}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
              />
              {/* Events logic: suggestions + validation */}
              {locLoading && (
                <div className="text-xs text-gray-500 mt-1">Searching cities…</div>
              )}
              {locSuggest.length > 0 && (
                <ul className="mt-1 border rounded-md max-h-40 overflow-auto bg-white dark:bg-gray-800">
                  {locSuggest.map((opt, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setNewEvent(prev => ({ ...prev, location: opt.city })); 
                          setLocSuggest([]);
                          setLocError(null);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {locError && (
                <p className="text-sm text-red-500 mt-1">{locError}</p>
              )}

              <input
                type="datetime-local"
                className="w-full p-2 border rounded"
                value={newEvent.dateFrom}
                onChange={e => setNewEvent({ ...newEvent, dateFrom: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full p-2 border rounded"
                value={newEvent.dateTo}
                onChange={e => setNewEvent({ ...newEvent, dateTo: e.target.value })}
              />
              <select
                className="w-full p-2 border rounded"
                value={newEvent.style}
                onChange={e => setNewEvent({ ...newEvent, style: e.target.value as Style })}
              >
                <option value="">Select style</option>
                <option value="Formal">Formal</option>
                <option value="Casual">Casual</option>
                <option value="Athletic">Athletic</option>
                <option value="Party">Party</option>
                <option value="Business">Business</option>
                <option value="Outdoor">Outdoor</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button className="px-4 py-2 rounded-full border border-black" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                onClick={async () => {
                  if (!newEvent.name || !newEvent.style || !newEvent.dateFrom || !newEvent.dateTo) {
                    alert('Please fill in name, style, and both dates.');
                    return;
                  }

                  setLocError(null);
                  const standardized = await validateAndStandardizeLocation(newEvent.location);
                  if (!standardized) {
                    setLocError('Please select a real city (use the suggestions).');
                    return;
                  }

                  try {
                    const created = await createEvent({
                      name: newEvent.name,
                      location: standardized,
                      style: newEvent.style,
                      dateFrom: new Date(newEvent.dateFrom).toISOString(),
                      dateTo: new Date(newEvent.dateTo).toISOString(),
                    });

                    if (created.weather) {
                      let days: { date: string; summary: WeatherSummary }[] = [];
                      try {
                        days = JSON.parse(created.weather);
                      } catch {
                        days = [];
                      }
                      for (const { summary } of days) {
                        try {
                          await fetchRecommendedOutfits(summary, created.style, created.id);
                        } catch {
                          /* ignore */
                        }
                      }
                    }

                    setEvents(evt => [...evt, toEvent(created)]);
                    setNewEvent({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' });
                    setShowModal(false);
                    showToast('Successfully added a new event!');
                  } catch (err: any) {
                    const msg = err.response?.data?.message || 'Failed to create event';
                    alert(msg);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70]">
          <div className="bg-black text-white text-sm px-4 py-2 rounded-full shadow">
            {toast.msg}
          </div>
        </div>
      )}

      {/* Detail / Edit Event Modal (Improved UI + Events logic) */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg relative flex flex-col">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowDetailModal(false)}>
              ×
            </button>
            <h2 className="text-2xl mb-4 font-livvic">
              {selectedEvent.name.charAt(0).toUpperCase() + selectedEvent.name.slice(1).toLowerCase()}
            </h2>

            {isEditing ? (
              <div className="space-y-3 flex-grow">
                <input
                  className="w-full p-2 border rounded"
                  value={editEventData.name}
                  onChange={e => setEditEventData(d => ({ ...d, name: e.target.value }))}
                />
                <input
                  className="w-full p-2 border rounded"
                  value={editEventData.location}
                  onChange={e => setEditEventData(d => ({ ...d, location: e.target.value }))}
                />
                {/* Events logic: edit suggestions + validation */}
                {locLoadingE && (
                  <div className="text-xs text-gray-500 mt-1">Searching cities…</div>
                )}
                {locSuggestE.length > 0 && (
                  <ul className="mt-1 border rounded-md max-h-40 overflow-auto bg-white dark:bg-gray-800">
                    {locSuggestE.map((opt, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setEditEventData(d => ({ ...d, location: opt.city }));
                            setLocSuggestE([]);
                            setLocErrorE(null);
                          }}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {locErrorE && (
                  <p className="text-sm text-red-500 mt-1">{locErrorE}</p>
                )}

                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={editEventData.dateFrom}
                  onChange={e => setEditEventData(d => ({ ...d, dateFrom: e.target.value }))}
                />
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={editEventData.dateTo}
                  onChange={e => setEditEventData(d => ({ ...d, dateTo: e.target.value }))}
                />
                <select
                  className="w-full p-2 border rounded"
                  value={editEventData.style}
                  onChange={e => setEditEventData(d => ({ ...d, style: e.target.value }))}
                >
                  <option value="">Select style</option>
                  <option value="Formal">Formal</option>
                  <option value="Casual">Casual</option>
                  <option value="Athletic">Athletic</option>
                  <option value="Party">Party</option>
                  <option value="Business">Business</option>
                  <option value="Outdoor">Outdoor</option>
                </select>
              </div>
            ) : (
              <div className="flex-grow">
                {(() => {
                  const from = new Date(selectedEvent.dateFrom);
                  const to = new Date(selectedEvent.dateTo);
                  const sameDay = from.toDateString() === to.toDateString();
                  return (
                    <p className="text-sm mb-1">
                      <strong>When:</strong>{' '}
                      {sameDay ? (
                        <>
                          {from.toLocaleDateString()} {from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {to.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : (
                        <>
                          {from.toLocaleString()} – {to.toLocaleString()}
                        </>
                      )}
                    </p>
                  );
                })()}
                <p className="text-sm mb-4">
                  <strong>Where:</strong> {selectedEvent.location}
                </p>

                {weatherAlert && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-5 w-full max-w-md">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold">Weather Update</h3>
                        <button
                          onClick={() => setWeatherAlert(null)}
                          className="text-2xl leading-none"
                          aria-label="Close"
                        >×</button>
                      </div>
                      <p className="mt-2 text-sm">{weatherAlert.reason}</p>
                      {!!weatherAlert.suggestions.length && (
                        <ul className="mt-3 list-disc list-inside text-sm space-y-1">
                          {weatherAlert.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      )}
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => setWeatherAlert(null)}
                          className="px-4 py-2 rounded-full border border-black dark:border-white"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => {
                            setWeatherAlert(null);
                          }}
                          className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                        >
                          Adjust Outfit
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedEvent.weather &&
                  (() => {
                    let sums: { date: string; summary: any }[] = [];
                    try {
                      sums = JSON.parse(selectedEvent.weather);
                    } catch {
                      sums = [];
                    }
                    if (!sums.length) return null;

                    return (
                      <div className="text-sm mb-4 space-y-1">
                        {sums.map(({ date, summary }) => {
                          const label = formatMonthDay(date);
                          return summary ? (
                            <div key={date}>
                              <span className="font-medium">{label}:</span> {summary.mainCondition} — {Math.round(summary.avgTemp)}°C
                            </div>
                          ) : (
                            <div key={date}>
                              <span className="font-medium">{label}:</span>{' '}
                              <span className="text-red-400">No data</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                <div className="mt-4">
                  <h3 className="font-medium mb-2">Recommended Outfit</h3>
                  {detailLoading && <p>Loading outfit…</p>}
                  {detailError && <p className="text-red-500">{detailError}</p>}
                  {detailOutfit && (
                    <>
                      <div className="flex flex-wrap justify-center space-x-2 mb-4">
                        {detailOutfit.outfitItems.map(item => (
                          <img
                            key={item.closetItemId}
                            src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                            alt={item.layerCategory}
                            className="w-20 h-20 object-contain rounded"
                          />
                        ))}
                      </div>
                      <div className="scale-75 origin-top-left">
                        <StarRating disabled={false} onSelect={() => { }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end space-x-2">
              {isEditing ? (
                <>
                  <button onClick={async () => {
                    try {
                      setLocErrorE(null);
                      const standardized = await validateAndStandardizeLocation(editEventData.location);
                      if (!standardized) {
                        setLocErrorE('Please select a real city (use the suggestions).');
                        return;
                      }

                      const payload = {
                        id: editEventData.id || selectedEvent!.id,
                        name: editEventData.name || selectedEvent!.name,
                        location: standardized, 
                        dateFrom: new Date(
                          editEventData.dateFrom || toLocalDatetimeInputValue(selectedEvent!.dateFrom)
                        ).toISOString(),
                        dateTo: new Date(
                          editEventData.dateTo || toLocalDatetimeInputValue(selectedEvent!.dateTo)
                        ).toISOString(),
                        style: (editEventData.style || selectedEvent!.style || 'Casual') as Style,
                        isTrip: Boolean(selectedEvent?.isTrip ?? (selectedEvent?.type === 'trip')),
                      };

                      const updatedDto = await updateEvent(payload as any);
                      let updated = toEvent(updatedDto);

                      updated = { ...updated, location: payload.location };

                      setEvents(list => list.map(e => (e.id === updated.id ? updated : e)));
                      setSelectedEvent(updated);

                      await rebuildEventWeatherAndRecs(updated);

                      setIsEditing(false);
                      queryClient.invalidateQueries({ queryKey: ['event-outfit'] });
                      showToast('Successfully edited event!');

                    } catch (err: any) {
                      console.error('update failed', err?.response?.data || err);
                      const msg =
                        err?.response?.data?.message ||
                        (err?.message ? `Failed to update: ${err.message}` : 'Failed to update event');
                      alert(msg);
                    }
                  }}
                    className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (!selectedEvent) return;
                      setEditEventData({
                        id: selectedEvent.id,
                        name: selectedEvent.name,
                        location: selectedEvent.location,
                        dateFrom: toLocalDatetimeInputValue(selectedEvent.dateFrom),
                        dateTo: toLocalDatetimeInputValue(selectedEvent.dateTo),
                        style: selectedEvent.style || 'Casual',
                      });
                      setIsEditing(true);
                    }}
                    className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      if (!selectedEvent) return;
                      setPendingDeleteId(selectedEvent.id);
                      setConfirmDeleteOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-red-500 text-white"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          {confirmDeleteOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-5 w-full max-w-sm relative">
                <h3 className="text-lg font-semibold">Delete this event?</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Are you sure you want to delete this event?
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDeleteOpen(false)}
                    className="px-4 py-2 rounded-full border border-black dark:border-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!pendingDeleteId) return;
                      await deleteEvent(pendingDeleteId);
                      setEvents(evts => evts.filter(e => e.id !== pendingDeleteId));
                      setConfirmDeleteOpen(false);
                      setShowDetailModal(false);
                      showToast('Event successfully deleted.');
                    }}
                    className="px-4 py-2 rounded-full bg-red-500 text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      <Footer />
    </div>
  );
}