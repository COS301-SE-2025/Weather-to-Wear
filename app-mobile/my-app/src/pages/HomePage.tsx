// src/pages/HomePage.tsx
import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { Plus, RefreshCw } from 'lucide-react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import StarRating from '../components/StarRating';
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';
import { motion } from 'framer-motion';

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

// ---------- Utilities ----------
function getOutfitKey(outfit: RecommendedOutfit): string {
  return outfit.outfitItems.map(i => i.closetItemId).sort().join('-');
}

// put this near the top of HomePage.tsx (or in a utils file)
const WI_BASE = 'https://basmilius.github.io/weather-icons/production/fill/all';

function normalizeIcon(raw?: string) {
  if (!raw) return '';
  const s = raw.trim();

  // already correct
  if (s.startsWith('https://') || s.startsWith('http://')) return s;

  // common typos / schemeless forms
  if (s.startsWith('https//')) return 'https://' + s.slice('https//'.length);
  if (s.startsWith('http//')) return 'http://' + s.slice('http//'.length);
  if (s.startsWith('//')) return 'https:' + s;

  // basmilius filename only (e.g. "partly-cloudy-day")
  if (!s.includes('/')) return `${WI_BASE}/${s}.svg`;

  // path without scheme (e.g. "basmilius.github.io/weather-icons/…")
  return `https://${s.replace(/^\/+/, '')}`;
}

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

// Normalize API → UI
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

function toLocalDatetimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  // clear/sunny fallback
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
  coldHue: 185, // teal-ish, near #3F978F
  hotHue: 18,   // warm rust/orange
  sat: 58,
  light: 38,
};

function TempRangeBar({
  min, max, weekMin, weekMax,
}: { min: number; max: number; weekMin: number; weekMax: number }) {
  const span = Math.max(1, weekMax - weekMin);
  const left = ((min - weekMin) / span) * 100;
  const width = Math.max(4, ((max - min) / span) * 100);

  const tempColor = (t: number) => {
    const lo = Math.min(weekMin, weekMax);
    const hi = Math.max(weekMin, weekMax);
    const clamped = Math.max(lo, Math.min(hi, t));
    const r = hi === lo ? 0.5 : (clamped - lo) / (hi - lo);
    const hue = THEME.coldHue + (THEME.hotHue - THEME.coldHue) * r;
    return `hsl(${Math.round(hue)}, ${THEME.sat}%, ${THEME.light}%)`;
  };

  const c1 = tempColor(min);
  const c2 = tempColor(max);

  return (
    <div className="relative w-40 sm:w-48 md:w-56 h-0.5">
      <div
        className="absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full opacity-90"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          background: `linear-gradient(to right, ${c1}, ${c2})`,
        }}
      />
    </div>
  );
}

// ---------- HomePage ----------
export default function HomePage() {
  const submittingRef = useRef(false);

  // Persist user-selected city
  const [city, setCity] = useState<string>(() => localStorage.getItem('selectedCity') || '');
  const [cityInput, setCityInput] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('Casual');

  // Other UI state
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


  // --- Location validation state (city autocomplete) ---
  const [locSuggest, setLocSuggest] = useState<Array<{ label: string; city: string }>>([]);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Free geocoder: Open-Meteo
  async function geocodeCity(query: string, count = 5): Promise<Array<{ label: string; city: string }>> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data?.results || []) as Array<any>;
  return results.map(r => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '), // what we SHOW
    city: r.name as string,                                          // what we SAVE
  }));
}

  // Debounced suggestions while user types
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

  // Validate final input and standardize "City, Region, Country"
  async function validateAndStandardizeLocation(raw: string): Promise<string | null> {
    const q = raw.trim();
    if (!q) return null;
    const matches = await geocodeCity(q, 1);
    return matches[0]?.city ?? null; // <-- return only the city
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

  const [selectedDate, setSelectedDate] = useState<string | null>(null); // "YYYY-MM-DD"

  // ---------- Weather (React Query) ----------
  const weatherQuery = useWeatherQuery(city);
  const weather: WeatherData | null = weatherQuery.data ?? null;
  const loadingWeather = weatherQuery.isLoading || weatherQuery.isFetching;

  const locationLabel = (city?.trim() || weather?.location || '').trim();

  // seed location if server returns one
  useEffect(() => {
    if (!city && weather?.location) {
      setCity(weather.location);
      localStorage.setItem('selectedCity', weather.location);
    }
  }, [city, weather?.location]);

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

  // default selected date = first available day
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

  // strictly 8 items:
  // - today: next 8 from "now"
  // - other days: start at 05:00
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


  // Outfits (React Query)
  const summaryForOutfits = selectedDaySummary || weather?.summary || null;
  const outfitsQuery = useOutfitsQuery(summaryForOutfits as any, selectedStyle);
  const outfits: RecommendedOutfit[] = outfitsQuery.data ?? ([] as RecommendedOutfit[]);
  const loadingOutfits = outfitsQuery.isLoading || outfitsQuery.isFetching;

  const error =
    (weatherQuery.isError && 'Failed to fetch weather data.') ||
    (outfitsQuery.isError && 'Could not load outfit recommendations.') ||
    null;

  // ---------- City enter/refresh handlers ----------
  const handleEnterCity = () => {
    const next = cityInput.trim();
    if (submittingRef.current) return;       // guard: ignore re-entrancy
    submittingRef.current = true;
    // ignore no-op searches
    if (!next || next === city) {
      submittingRef.current = false;
      return;
    }
    setCity(next);
    localStorage.setItem('selectedCity', next);
    setCityInput('');
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['outfits'] });
    queryClient.invalidateQueries({ queryKey: ['weather-week'] });
    setSelectedDate(null);
    // release the guard on next tick (after state flush)
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create event';
      alert(msg);
    }
  };

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

  const prevIndex = outfits.length ? (currentIndex - 1 + outfits.length) % outfits.length : 0;
  const nextIndex = outfits.length ? (currentIndex + 1) % outfits.length : 0;

  const slideTo = (dir: -1 | 1) =>
    setCurrentIndex(i => (i + dir + outfits.length) % outfits.length);

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

  // pre-warm recommendations for near events
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
          // ignore bad JSON
        }
      }
    };

    tick();
    const id = setInterval(tick, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [events]);

  // ---------- Rating save ----------
  const handleSaveRating = async (rating: number) => {
    const outfit = outfits[currentIndex];
    if (!outfit) return;

    const key = getOutfitKey(outfit);
    setSaving(true);
    try {
      if (outfitIdMap[key]) {
        await updateOutfit(outfitIdMap[key], { userRating: rating });
      } else {
        const payload: SaveOutfitPayload = {
          outfitItems: outfit.outfitItems.map(i => ({
            closetItemId: i.closetItemId,
            layerCategory: i.layerCategory,
            sortOrder: 0,
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

  // global bounds for scaling the thin min→max bar
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

  // ensure "today" is selected by default
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
                  className="w-14 h-14 max-[380px]:w-12 max-[380px]:h-12 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain rounded-lg"
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
                  className="w-14 h-14 max-[380px]:w-12 max-[380px]:h-12 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain rounded-lg"
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
                  className="w-14 h-14 max-[380px]:w-12 max-[380px]:h-12 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain rounded-lg"
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
                  className="w-12 h-12 max-[380px]:w-10 max-[380px]:h-10 sm:w-16 sm:h-16 md:w-18 md:h-18 object-contain rounded-lg"
                />
              ))}
          </div>
        </div>

        {/* Controls below the card so images aren’t covered */}
        {controls && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-lg px-3 py-2 shadow-sm">
              {controls}
            </div>
          </div>
        )}
      </div>
    );
  }


  // ------------------------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------------------------
  // hero data: description + location + avg temp
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

  // ----- HERO week UI helpers -----
  // rotate dayKeys so the list starts at "today"
  const todayIso = new Date().toISOString().slice(0, 10);
  const orderedDays = useMemo(() => {
    if (!dayKeys.length) return [];
    const i = Math.max(0, dayKeys.indexOf(todayIso));
    return [...dayKeys.slice(i), ...dayKeys.slice(0, i)];
  }, [dayKeys, todayIso]);

  // quick lookup of summaries for each day
  const daySummaries = useMemo(() => {
    const map: Record<string, ReturnType<typeof summarizeDay>> = {};
    for (const d of dayKeys) {
      map[d] = summarizeDay(weekByDay[d] || []);
    }
    return map;
  }, [dayKeys, weekByDay]);

  // formatter helpers
  const shortDow = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: 'short' }); // Mon, Tue…

  const avgFor = (iso: string) =>
    daySummaries[iso] ? Math.round(daySummaries[iso].avgTemp) : null;

  // change selectedDate and refetch outfits
  const pickDay = (iso: string) => {
    setSelectedDate(iso);
    setCurrentIndex(0);
    queryClient.invalidateQueries({ queryKey: ['outfits'] });
  };

  // mobile arrows
  const stepDay = (dir: -1 | 1) => {
    if (!orderedDays.length) return;
    const idx = Math.max(0, orderedDays.indexOf(selectedDate || orderedDays[0]));
    const next = orderedDays[(idx + (dir === 1 ? 1 : -1) + orderedDays.length) % orderedDays.length];
    pickDay(next);
  };


  return (
    <div
      className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0 ml-[calc(-50vw+50%)]"
      style={{ paddingTop: 0 }}
    >

      {/* ===================== HERO (reworked with week controls) ===================== */}

      <header className="relative w-full overflow-hidden pb-16 sm:pb-20 mb-8">

        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(/background.jpg)` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6 lg:py-8">
            {/* two columns at all sizes so left/right sit side by side on mobile too */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
              {/* LEFT: welcome + tag + description (mobile switcher pinned at bottom) */}
              <div className="text-white relative pb-12 sm:pb-0">
                {/* Top content */}
                <p className="text-[13px] sm:text-xs uppercase tracking-wide opacity-90 mb-2">
                  {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
                </p>

                <div className="hidden sm:inline-block backdrop-blur-2xl bg-white/10 rounded-2xl p-2 sm:p-2.5 -mb-2 mt-2">
                  <p className="text-[14px] sm:text-xs font-medium tracking-wide">Weather Forecast</p>
                </div>

                {/* Your weather description; can grow/shrink freely */}
                <h1 className="text-4xl sm:text-4xl md:text-6xl font-livvic font-semibold leading-snug mb-2 sm:mb-3">
                  {heroDescription || '—'}
                </h1>

                {/* MOBILE day switcher — pinned to bottom of this block */}
                {orderedDays.length > 0 && (
                  <div className="sm:hidden absolute left-0 right-0 bottom-0 flex items-center gap-3 text-white">
                    {/* left triangle (solid white) */}
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

                    {/* weekday + temp (same size, no background) */}
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

                    {/* right triangle (solid white) */}
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


              {/* RIGHT: location + temp card */}
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
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEnterCity();
                    }}
                    className="w-full"
                  >
                    <div className="
              relative
              w-full
              max-w-[90vw] sm:max-w-md
              backdrop-blur-2xl bg-white/10
              
              rounded-full
              pl-8 pr-3 py-1
              focus-within:ring-2 focus-within:ring-[#3F978F]
            ">
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
                            e.stopPropagation(); // avoid bubbling to any parent handlers
                            handleEnterCity();
                          }
                        }}
                        autoComplete="off"
                        className="
                  w-full bg-transparent outline-none
                  placeholder-white/70 text-white
                  text-sm sm:text-base
                "
                        aria-label=" Select City"
                      />


                    </div>
                  </form>

                  {/* Location (wraps) */}
                  <div className="flex items-start gap-1 w-full justify-end">
                    <svg className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 mt-[1px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.686 2 6 4.686 6 8c0 4.333 6 12 6 12s6-7.667 6-12c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                    </svg>
                    <span className="text-lg sm:text-sm font-medium whitespace-normal break-words leading-snug">
                      {locationLabel || 'Select a city'}
                    </span>
                  </div>

                  {/* Temperature */}
                  <div className="text-3xl sm:text-5xl md:text-6xl font-semibold tabular-nums">
                    {heroAvgTemp !== null ? `${heroAvgTemp}°C` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP week bar pinned to bottom of hero */}
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
      <main className="flex flex-col gap-10 px-0 w-full ">
        <section
          className="
    grid gap-8 lg:gap-10 xl:gap-12
    place-items-center lg:place-items-start
    grid-cols-1 lg:grid-cols-3
    px-4 sm:px-6 lg:px-8
  "
        >

          {/* LEFT: Slogan + Hourly Forecast */}
          <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col items-center lg:items-start justify-start w-full">
            <TypingSlogan />

            {/* Hourly forecast (8 hours) under the slogan */}
            <div className="w-full max-w-sm sm:max-w-md mt-2">
              {loadingWeather ? (
                <p className="text-center text-sm text-gray-500">Loading hours…</p>
              ) : error && !weather ? (
                <p className="text-red-500 text-center">{error}</p>
              ) : (
                <div className="text-center">
                  <HourlyForecast
                    forecast={
                      selectedDayHoursForDisplay.length
                        ? selectedDayHoursForDisplay
                        : weather?.forecast?.slice(0, 8) || []
                    }
                  />
                </div>
              )}
            </div>
          </div>


          {/* MIDDLE: Outfit (order 1 mobile, 2 desktop) */}
          <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col items-center lg:items-start w-full">
            <div className="w-full max-w-none">
              <div className="bg-white">

                {loadingOutfits && <p className="text-center">Loading outfits…</p>}
                {error && !loadingOutfits && <p className="text-red-500 text-center">{error}</p>}
                {!loadingOutfits && outfits.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    Sorry, we couldn't generate an outfit in that style. Please add more items to your wardrobe.
                  </p>
                )}

                {/* Style Dropdown */}
                <div className="mb-4 w-full text-center">
                  <label htmlFor="style-select" className="block text-sm font-medium mb-1 font-livvic text-black dark:text-gray-100" />
                  <select
                    id="style-select"
                    value={selectedStyle}
                    onChange={e => {
                      setSelectedStyle(e.target.value);
                      queryClient.invalidateQueries({ queryKey: ['outfits'] });
                    }}
                    className="block w-full max-w-xs mx-auto p-2 bg-white dark:bg-gray-900 rounded-full border border-black dark:border-white focus:outline-none font-livvic"
                  >
                    <option value="Formal">Formal</option>
                    <option value="Casual">Casual</option>
                    <option value="Athletic">Athletic</option>
                    <option value="Party">Party</option>
                    <option value="Business">Business</option>
                    <option value="Outdoor">Outdoor</option>
                  </select>
                </div>

                {!loadingOutfits && outfits.length > 0 && (
                  <>
                    <div className="relative mb-2 w-full max-w-sm sm:max-w-md mx-auto lg:mx-auto lg:self-center overflow-visible">
                      {/* height guard */}
                      <div className="invisible">
                        <OutfitImagesCard outfit={outfits[currentIndex]} />
                      </div>

                      {/* stage */}
                      <div className="absolute inset-0">
                        {/* LEFT (prev) — tighter, more hidden, slightly higher */}
                        {outfits.length > 1 && (
                          <motion.button
                            type="button"
                            onClick={() => slideTo(-1)}
                            className="absolute left-1/2 -translate-x-1/2 top-0 w-full"
                            style={{ width: 'min(88%, 300px)' }}
                            initial={false}
                            animate={{ x: '-60%', y: -10, scale: 0.82, opacity: 0.35, zIndex: 1 }}
                            whileHover={{ scale: 0.84, opacity: 0.45 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                          >
                            <OutfitImagesCard outfit={outfits[prevIndex]} />
                          </motion.button>
                        )}

                        {/* RIGHT (next) — tighter, more hidden, slightly higher */}
                        {outfits.length > 1 && (
                          <motion.button
                            type="button"
                            onClick={() => slideTo(1)}
                            className="absolute left-1/2 -translate-x-1/2 top-0 w-full"
                            style={{ width: 'min(88%, 300px)' }}
                            initial={false}
                            animate={{ x: '60%', y: -10, scale: 0.82, opacity: 0.35, zIndex: 1 }}
                            whileHover={{ scale: 0.84, opacity: 0.45 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                          >
                            <OutfitImagesCard outfit={outfits[nextIndex]} />
                          </motion.button>
                        )}

                        {/* CENTER (current) — only this card has stars + refresh inside the card */}
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2 top-0 w-full cursor-grab active:cursor-grabbing"
                          style={{ width: 'min(92%, 320px)', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.12))' }}
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
                            outfit={outfits[currentIndex]}
                            controls={
                              <>
                                <StarRating
                                  disabled={saving}
                                  onSelect={handleSaveRating}
                                  value={ratings[getOutfitKey(outfits[currentIndex])] || 0}
                                />
                                <button
                                  onClick={handleRefresh}
                                  className="p-2 bg-[#3F978F] text-white rounded-full hover:bg-[#304946] transition"
                                  aria-label="Refresh recommendations"
                                  title="Refresh recommendations"
                                >
                                  <RefreshCw className="w-5 h-5" />
                                </button>
                              </>
                            }
                          />
                        </motion.div>
                      </div>

                    </div>

                    <div className="text-center text-sm mb-2">
                      {currentIndex + 1} / {outfits.length}
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-500">
                      Swipe the front card, or tap the side cards
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>



        </section>

        {/* Events Section */}
        <section className="w-full mt-6 px-0">
          <div className="w-full px-0">
            <div className="flex items-center justify-center mb-4 space-x-4">
              <h2 className="text-4xl font-livvic font-medium">Upcoming Events</h2>
              <button
                onClick={() => setShowModal(true)}
                className="p-2 rounded-full bg-[#3F978F] text-white hover:bg-[#347e77] transition"
                aria-label="Add Event"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {events.filter(e => e.type !== 'trip').length > 0 ? (
              <div className="flex flex-wrap justify-center gap-6 overflow-x-auto py-2">
                {events
                  .filter(e => e.type !== 'trip')
                  .map(ev => (
                    <div
                      key={ev.id}
                      className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44
                                 bg-white dark:bg-gray-700 rounded-full shadow-md border
                                 flex flex-col items-center justify-center text-center p-2
                                 transition-transform hover:scale-105"
                      onClick={() => {
                        setSelectedEvent(ev);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="font-semibold truncate">
                        {ev.name.charAt(0).toUpperCase() + ev.name.slice(1).toLowerCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(ev.dateFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        &nbsp;–&nbsp;
                        {new Date(ev.dateTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="mt-1 text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                        {ev.style}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No upcoming events</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#3F978F] text-white px-4 py-2 rounded-lg hover:bg-[#347e77] transition"
                >
                  Add Your First Event
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer banner (full-bleed) */}
      <div className="relative w-full h-48 mt-8">
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

      {/* Create New Event Modal */}
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
              {/* Suggestions + validation for Location */}
              {locLoading && (
                <div className="text-xs text-gray-500 mt-1">Searching cities…</div>
              )}

              {locSuggest.length > 0 && (
              <ul className="mt-1 border rounded-md max-h-40 overflow-auto bg-white dark:bg-gray-800">
                {locSuggest.map((opt: { label: string; city: string }, i: number) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setNewEvent(prev => ({ ...prev, location: opt.city })); // <-- save only the city
                          setLocSuggest([]);
                          setLocError(null);
                        }}
                      >
                        {opt.label} {/* <-- show "City, Region, Country" */}
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

                  // ✅ Validate & standardize location BEFORE saving
                  setLocError(null);
                  const standardized = await validateAndStandardizeLocation(newEvent.location);
                  if (!standardized) {
                    setLocError('Please select a real city (use the suggestions).');
                    return;
                  }

                  try {
                    const created = await createEvent({
                      name: newEvent.name,
                      location: standardized, // use canonical "City, Region, Country"
                      style: newEvent.style,
                      dateFrom: new Date(newEvent.dateFrom).toISOString(),
                      dateTo: new Date(newEvent.dateTo).toISOString(),
                    });

                    // Pre-warm recommendations if weather exists
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

      {/* Detail / Edit Event Modal */}
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
                {/* Edit: Suggestions + validation for Location */}
                {locLoadingE && (
                  <div className="text-xs text-gray-500 mt-1">Searching cities…</div>
                )}

                {locSuggestE.length > 0 && (
                  <ul className="mt-1 border rounded-md max-h-40 overflow-auto bg-white dark:bg-gray-800">
                    {locSuggestE.map((opt: { label: string; city: string }, i: number) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setEditEventData(d => ({ ...d, location: opt.city })); // save only the city
                            setLocSuggestE([]);
                            setLocErrorE(null);
                          }}
                        >
                          {opt.label} {/* show City, Region, Country */}
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
                        // Validate the location (just like in Create)
                        setLocErrorE(null);
                        const standardized = await validateAndStandardizeLocation(editEventData.location);
                        if (!standardized) {
                          setLocErrorE('Please select a real city (use the suggestions).');
                          return;
                        }

                        const updatedDto = await updateEvent({
                          id: editEventData.id,
                          name: editEventData.name,
                          location: standardized, // send only the city
                          dateFrom: new Date(editEventData.dateFrom).toISOString(),
                          dateTo: new Date(editEventData.dateTo).toISOString(),
                          style: editEventData.style as Style,
                          isTrip: selectedEvent?.isTrip ?? selectedEvent?.type === 'trip',
                        });

                        const updated = toEvent(updatedDto);
                        setEvents(evts => evts.map(e => (e.id === updated.id ? updated : e)));
                        setSelectedEvent(updated);
                        setIsEditing(false);
                      } catch (err) {
                        console.error('update failed', err);
                        alert('Failed to update event');
                      }
                    }}

                    className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-full bg-[#3F978F] text-white">
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this event?')) return;
                      await deleteEvent(selectedEvent.id);
                      setEvents(evts => evts.filter(e => e.id !== selectedEvent.id));
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-red-500 text-white"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}