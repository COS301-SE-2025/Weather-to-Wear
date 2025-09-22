// src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from 'react';
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
          params: { location: locationLabel },
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

  const selectedDayHours: H[] = useMemo(() => {
    if (!selectedDate || !weekByDay[selectedDate]) return [];
    const hours = weekByDay[selectedDate];
    const todayKey = new Date().toISOString().slice(0, 10);

    if (selectedDate === todayKey) {
      const now = new Date();
      return hours.filter(h => {
        const t = parseHourTS(h.time);
        return t >= now;
      });
    }
    return hours;
  }, [selectedDate, weekByDay]);

  const selectedDaySummary = useMemo(
    () => (selectedDayHours.length ? summarizeDay(selectedDayHours) : null),
    [selectedDayHours]
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
    setCity(next);
    localStorage.setItem('selectedCity', next);
    setCityInput('');
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['outfits'] });
    queryClient.invalidateQueries({ queryKey: ['weather-week'] });
    setSelectedDate(null);
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

  function OutfitImagesCard({ outfit }: { outfit: RecommendedOutfit }) {
    return (
      <div className="bg-white dark:bg-gray-800 border rounded-xl shadow-md p-1.5">
        <div className="space-y-1">
          {/* headwear / accessory */}
          <div
            className={`flex justify-center space-x-1 transition-all ${outfit.outfitItems.some(i => i.layerCategory === 'headwear' || i.layerCategory === 'accessory')
              ? 'h-auto'
              : 'h-0 overflow-hidden'
              }`}
          >
            {outfit.outfitItems
              .filter(i => i.layerCategory === 'headwear' || i.layerCategory === 'accessory')
              .map(item => (
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
              .filter(i => ['base_top', 'mid_top', 'outerwear'].includes(i.layerCategory))
              .map(item => (
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
              .filter(i => i.layerCategory === 'base_bottom')
              .map(item => (
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
              .filter(i => i.layerCategory === 'footwear')
              .map(item => (
                <img
                  key={item.closetItemId}
                  src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                  alt={item.category}
                  className="w-12 h-12 max-[380px]:w-10 max-[380px]:h-10 sm:w-16 sm:h-16 md:w-18 md:h-18 object-contain rounded-lg"
                />
              ))}
          </div>
        </div>
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

  return (
    <div
      className="flex flex-col min-h-screen w-full bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden pt-0"
      style={{ paddingTop: 0 }}
    >
      {/* ===================== HERO (reworked) ===================== */}
      <header className="relative w-full overflow-hidden pb-8 mb-8">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(/background.jpg)` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6 lg:py-8">
            {/* two columns at ALL sizes so left/right are side-by-side on mobile too */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 items-center">
              {/* LEFT: welcome + tag + description */}
              <div className="text-white">
                <p className="text-[11px] sm:text-xs uppercase tracking-wide opacity-90 mb-2">
                  {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
                </p>

                <div className="backdrop-blur-2xl bg-white/10 rounded-2xl p-2 sm:p-2.5 inline-block mb-2">
                  <p className="text-[11px] sm:text-xs font-medium tracking-wide">
                    Weather Forecast
                  </p>
                </div>

                {/* bigger on mobile now */}
                <h1 className="text-2xl sm:text-4xl md:text-4xl font-livvic font-semibold leading-snug">
                  {heroDescription || '—'}
                </h1>
              </div>

              {/* RIGHT: responsive glass card; wraps location; dynamic height; aligned right */}
              <div className="justify-self-end self-center">
                <div
                  className={[
                    "backdrop-blur-2xl bg-white/10 text-white rounded-2xl",
                    "p-3 sm:p-4",
                    // constrain width a bit so it sits neatly beside the left block on small screens
                    "w-auto max-w-[85vw] xs:max-w-[70vw] sm:max-w-xs",
                    "flex flex-col items-end gap-1",
                    "text-right",
                  ].join(" ")}
                >
                  {/* Location (wraps) */}
                  <div className="flex items-start gap-1 w-full justify-end">
                    {/* Pin */}
                    <svg
                      className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 mt-[1px]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C8.686 2 6 4.686 6 8c0 4.333 6 12 6 12s6-7.667 6-12c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-medium whitespace-normal break-words leading-snug">
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
      </header>

      {/* ===================== MAIN ===================== */}
      <main className="flex flex-col gap-10 px-0 w-full ">
        <section
          className="
            grid gap-8 lg:gap-10 xl:gap-12
            place-items-center lg:place-items-start
            grid-cols-1
            lg:[grid-template-columns:minmax(240px,320px)_minmax(0,1fr)_minmax(240px,320px)]
            px-4 sm:px-6 lg:px-8
          "
        >
          {/* LEFT: Slogan + Weather Summary (order 2 mobile, 1 desktop) */}
          <div className="order-2 lg:order-1 flex flex-col items-center lg:items-start justify-start w-full">
            <TypingSlogan />

            {/* Weather Summary (click to change selected day → drives outfits) */}
            {/* Weather Summary (click to change selected day → drives outfits) */}
            <div className="w-full max-w-md mt-2">
              {weekQuery.isLoading ? (
                <p className="text-center text-sm text-gray-500">Loading week…</p>
              ) : !week || !week.forecast?.length ? (
                <p className="text-center text-xs text-gray-500">Can’t fetch the full week right now.</p>
              ) : (
                <div className="flex justify-center">
                  <ul className="space-y-1 w-full max-w-xs">
                    {dayKeys.map((d) => {
                      const s = summarizeDay(weekByDay[d]);
                      const isActive = d === selectedDate;

                      // 👇 Use your icon helper based on the day's main condition
                      const emoji = iconFor(s?.mainCondition);

                      return (
                        <li key={d}>
                          <button
                            onClick={() => {
                              setSelectedDate(d);
                              setCurrentIndex(0);
                              queryClient.invalidateQueries({ queryKey: ['outfits'] });
                            }}
                            className={`w-full grid grid-cols-[3.5rem_1.5rem_1fr] items-center gap-3 p-2 rounded-md transition-opacity
                  ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'}`}
                            aria-label={`Select ${new Date(d).toLocaleDateString(undefined, { weekday: 'long' })}`}
                          >
                            {/* Day */}
                            <span className="text-left font-medium">
                              {new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}
                            </span>

                            {/* Icon via iconFor (emoji) */}
                            <span className="flex items-center justify-center text-lg" aria-hidden="true">
                              {emoji}
                            </span>
                            <span className="sr-only">
                              {s?.mainCondition || 'weather'}
                            </span>

                            {/* Thin linear min→max temperature bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] sm:text-xs tabular-nums text-black dark:text-white">
                                {Math.round(s.minTemp)}°
                              </span>

                              <TempRangeBar
                                min={Math.round(s.minTemp)}
                                max={Math.round(s.maxTemp)}
                                weekMin={weekMin}
                                weekMax={weekMax}
                              />

                              <span className="text-[11px] sm:text-xs tabular-nums text-black dark:text-white">
                                {Math.round(s.maxTemp)}°
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

          </div>

          {/* MIDDLE: Outfit (order 1 mobile, 2 desktop) */}
          <div className="order-1 lg:order-2 flex flex-col items-center w-full">
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
                    <div className="relative mb-2 w-full max-w-sm sm:max-w-md mx-auto lg:overflow-hidden">
                      {/* height guard */}
                      <div className="invisible">
                        <OutfitImagesCard outfit={outfits[currentIndex]} />
                      </div>

                      {/* stage */}
                      <div className="absolute inset-0">
                        {/* LEFT (prev) */}
                        {outfits.length > 1 && (
                          <motion.button
                            type="button"
                            onClick={() => slideTo(-1)}
                            className="absolute left-1/2 -translate-x-1/2 top-0 w-full"
                            style={{ width: 'min(90%, 300px)' }}
                            initial={false}
                            animate={{ x: '-82%', scale: 0.85, opacity: 0.5, zIndex: 2 }}
                            whileHover={{ scale: 0.87, opacity: 0.6 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                          >
                            <OutfitImagesCard outfit={outfits[prevIndex]} />
                          </motion.button>
                        )}

                        {/* RIGHT (next) */}
                        {outfits.length > 1 && (
                          <motion.button
                            type="button"
                            onClick={() => slideTo(1)}
                            className="absolute left-1/2 -translate-x-1/2 top-0 w-full"
                            style={{ width: 'min(90%, 300px)' }}
                            initial={false}
                            animate={{ x: '82%', scale: 0.85, opacity: 0.5, zIndex: 2 }}
                            whileHover={{ scale: 0.87, opacity: 0.6 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                          >
                            <OutfitImagesCard outfit={outfits[nextIndex]} />
                          </motion.button>
                        )}

                        {/* CENTER (current) */}
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2 top-0 w-full cursor-grab active:cursor-grabbing"
                          style={{ width: 'min(92%, 320px)', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.12))' }}
                          initial={false}
                          animate={{ x: 0, scale: 1, opacity: 1, zIndex: 3 }}
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
                          <OutfitImagesCard outfit={outfits[currentIndex]} />
                        </motion.div>
                      </div>
                    </div>

                    <div className="text-center text-sm mb-2">
                      {currentIndex + 1} / {outfits.length}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {/* <StarRating ... />  */}
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-500">
                      Swipe the front card, or tap the side cards
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Search + Hourly forecast (order 3) */}
          <div className="order-3 flex flex-col w-full items-center lg:items-end">
            <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 lg:w-full lg:ml-auto">
              <div className="relative flex-1 mb-4">
                <input
                  type="text"
                  placeholder="Select City"
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEnterCity();
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-[#3F978F] dark:border-gray-600 dark:focus:ring-teal-500"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {loadingWeather ? (
                <p className="text-center">Loading weather…</p>
              ) : error && !weather ? (
                <p className="text-red-500 text-center">{error}</p>
              ) : weather ? (
                <div className="text-center">
                  {/* Removed duplicate summary; header is the summary now */}
                  <HourlyForecast forecast={selectedDayHours.length ? selectedDayHours : weather.forecast} />
                </div>
              ) : (
                <p className="text-center">No weather data available.</p>
              )}
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
                  try {
                    const created = await createEvent({
                      name: newEvent.name,
                      location: newEvent.location,
                      style: newEvent.style,
                      dateFrom: new Date(newEvent.dateFrom).toISOString(),
                      dateTo: new Date(newEvent.dateTo).toISOString(),
                    });

                    // Pre-warm event outfit recs for each day if weather exists
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
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-full border border-black">
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const updatedDto = await updateEvent({
                          id: editEventData.id,
                          name: editEventData.name,
                          location: editEventData.location,
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
