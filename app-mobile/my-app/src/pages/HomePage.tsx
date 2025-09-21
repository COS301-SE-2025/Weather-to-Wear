// src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import StarRating from '../components/StarRating';
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';

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

  const tomorrowKey = useMemo(() => (dayKeys.length > 1 ? dayKeys[1] : null), [dayKeys]);
  const tomorrowHours: H[] = useMemo(
    () => (tomorrowKey ? weekByDay[tomorrowKey] : []),
    [tomorrowKey, weekByDay]
  );
  const tomorrowSummary = useMemo(
    () => (tomorrowHours.length ? summarizeDay(tomorrowHours) : null),
    [tomorrowHours]
  );

  // Get a single recommended outfit for tomorrow (first option only)
  const tomorrowOutfitsQuery = useOutfitsQuery(tomorrowSummary as any, selectedStyle);
  const tomorrowsFirst = (tomorrowOutfitsQuery.data && tomorrowOutfitsQuery.data[0]) || null;

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
    // refresh queries
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

  // ---------- Render ----------
  return (
    <div
      className="flex flex-col min-h-screen w-full bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0"
      style={{ paddingTop: 0 }}
    >
      {/* Hero — full-bleed, no gap on mobile, no visual cut-off */}
      <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 mb-6 mt-0 !mt-0">
        <div
          className="absolute inset-0 bg-cover bg-top md:bg-center"
          style={{ backgroundImage: `url(/background.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <div className="px-6 py-2 border-2 border-white">
            <h1 className="text-2xl font-bodoni font-light text-center text-white">
              {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Sections (full-width on desktop; gentle padding on mobile/tablet) */}
      <main className="flex flex-col gap-12 px-4 sm:px-6 md:px-8 lg:px-6 xl:px-4 2xl:px-4 w-full">
        <section
          className="
            grid gap-8 lg:gap-10 xl:gap-12
            place-items-center lg:place-items-start
            grid-cols-1
            lg:[grid-template-columns:minmax(240px,320px)_minmax(0,1fr)_minmax(240px,320px)]
          "
        >
          {/* Slogan + Tomorrow mini-card */}
          <div className="flex flex-col items-center lg:items-start justify-center lg:justify-start lg:sticky lg:top-8 w-full">
            <TypingSlogan />

            {/* Desktop-only "Tomorrow's Outfit" mini card */}
            <div className="hidden lg:block w-full max-w-[280px] mt-4">
              <div className="flex justify-center mb-2">
                <h3 className="text-sm font-semibold border px-2 py-0.5 rounded-full">Tomorrow’s Outfit</h3>
              </div>

              {tomorrowOutfitsQuery.isLoading ? (
                <p className="text-xs text-gray-500 text-center">Loading…</p>
              ) : !tomorrowsFirst ? (
                <p className="text-xs text-gray-500 text-center">No suggestion yet.</p>
              ) : (
                <div className="space-y-1">
                  {/* headwear/accessory (tiny) */}
                  <div
                    className={`${
                      tomorrowsFirst.outfitItems.some(i => i.layerCategory === 'headwear' || i.layerCategory === 'accessory')
                        ? 'flex'
                        : 'hidden'
                    } justify-center space-x-1`}
                  >
                    {tomorrowsFirst.outfitItems
                      .filter(i => i.layerCategory === 'headwear' || i.layerCategory === 'accessory')
                      .map(item => (
                        <img
                          key={item.closetItemId}
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                          alt={item.category}
                          className="w-12 h-12 object-contain rounded"
                        />
                      ))}
                  </div>
                  {/* tops (tiny) */}
                  <div className="flex justify-center space-x-1">
                    {tomorrowsFirst.outfitItems
                      .filter(i => ['base_top', 'mid_top', 'outerwear'].includes(i.layerCategory))
                      .map(item => (
                        <img
                          key={item.closetItemId}
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                          alt={item.category}
                          className="w-12 h-12 object-contain rounded"
                        />
                      ))}
                  </div>
                  {/* bottoms (tiny) */}
                  <div className="flex justify-center space-x-1">
                    {tomorrowsFirst.outfitItems
                      .filter(i => i.layerCategory === 'base_bottom')
                      .map(item => (
                        <img
                          key={item.closetItemId}
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                          alt={item.category}
                          className="w-12 h-12 object-contain rounded"
                        />
                      ))}
                  </div>
                  {/* footwear (tiny) */}
                  <div className="flex justify-center space-x-1">
                    {tomorrowsFirst.outfitItems
                      .filter(i => i.layerCategory === 'footwear')
                      .map(item => (
                        <img
                          key={item.closetItemId}
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                          alt={item.category}
                          className="w-10 h-10 object-contain rounded"
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Outfit Section */}
          <div className="flex flex-col items-center w-full">
            <div className="w-full max-w-[1100px] mx-auto">
              <div className="bg-white">
                {/* WEEK STRIP — prevent first button clipping on small phones */}
                <div className="mb-3">
                  {weekQuery.isLoading ? (
                    <div className="text-center text-sm text-gray-500">Loading week…</div>
                  ) : !week || !week.forecast?.length ? (
                    <div className="text-center text-xs text-gray-500">Can’t fetch the full week right now.</div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto py-1 pl-4 pr-4 no-scrollbar justify-start sm:justify-center">
                      {dayKeys.map((d, idx) => {
                        const label = new Date(d).toLocaleDateString(undefined, { weekday: 'short' });
                        const isActive = d === selectedDate;
                        return (
                          <button
                            key={d}
                            onClick={() => {
                              setSelectedDate(d);
                              setCurrentIndex(0);
                            }}
                            className={`shrink-0 first:ml-1 last:mr-1 flex items-center gap-2 px-3 py-2 rounded-full border text-sm whitespace-nowrap transition
                              ${
                                isActive
                                  ? 'bg-[#3F978F] text-white border-[#3F978F]'
                                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                              }`}
                            aria-label={`Select ${label}${idx === 0 ? ' (first day)' : ''}`}
                          >
                            <span className="font-medium">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {loadingOutfits && <p>Loading outfits…</p>}
                {error && !loadingOutfits && <p className="text-red-500">{error}</p>}
                {!loadingOutfits && outfits.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    Sorry, we couldn't generate an outfit in that style. Please add more items to your wardrobe.
                  </p>
                )}

                {/* Style Dropdown */}
                <div className="mb-4 w-full text-center">
                  <label
                    htmlFor="style-select"
                    className="block text-sm font-medium mb-1 font-livvic text-black dark:text-gray-100"
                  />
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
                    {/* Carousel (padding so arrows never clip; centered on mobile) */}
                    <div className="relative mb-2 overflow-visible">
                      {/* Left arrow */}
                      <button
                        onClick={() => setCurrentIndex(i => (i - 1 + outfits.length) % outfits.length)}
                        className="absolute inset-y-0 left-0 flex items-center z-10 p-3 focus:outline-none"
                        aria-label="Previous outfit"
                        title="Previous"
                      >
                        <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                      </button>

                      {/* Right arrow */}
                      <button
                        onClick={() => setCurrentIndex(i => (i + 1) % outfits.length)}
                        className="absolute inset-y-0 right-0 flex items-center z-10 p-3 focus:outline-none"
                        aria-label="Next outfit"
                        title="Next"
                      >
                        <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                      </button>

                      {/* Pad sides so images never hit the edges/under arrows */}
                      <div className="space-y-2 px-10 sm:px-12 md:px-16 max-[380px]:px-7">
                        {/* headwear/accessory */}
                        <div
                          className={`flex justify-center space-x-2 transition-all ${
                            outfits[currentIndex].outfitItems.some(
                              i => i.layerCategory === 'headwear' || i.layerCategory === 'accessory'
                            )
                              ? 'h-auto'
                              : 'h-0 overflow-hidden'
                          }`}
                        >
                          {outfits[currentIndex].outfitItems
                            .filter(i => i.layerCategory === 'headwear' || i.layerCategory === 'accessory')
                            .map(item => (
                              <img
                                key={item.closetItemId}
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                                alt={item.category}
                                className="w-20 h-20 max-[380px]:w-16 max-[380px]:h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain rounded-2xl"
                              />
                            ))}
                        </div>

                        {/* tops */}
                        <div className="flex justify-center space-x-2">
                          {outfits[currentIndex].outfitItems
                            .filter(i => ['base_top', 'mid_top', 'outerwear'].includes(i.layerCategory))
                            .map(item => (
                              <img
                                key={item.closetItemId}
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                                alt={item.category}
                                className="w-20 h-20 max-[380px]:w-16 max-[380px]:h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain rounded-2xl"
                              />
                            ))}
                        </div>

                        {/* bottoms */}
                        <div className="flex justify-center space-x-2">
                          {outfits[currentIndex].outfitItems
                            .filter(i => i.layerCategory === 'base_bottom')
                            .map(item => (
                              <img
                                key={item.closetItemId}
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                                alt={item.category}
                                className="w-20 h-20 max-[380px]:w-16 max-[380px]:h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain rounded-2xl"
                              />
                            ))}
                        </div>

                        {/* footwear */}
                        <div className="flex justify-center space-x-2">
                          {outfits[currentIndex].outfitItems
                            .filter(i => i.layerCategory === 'footwear')
                            .map(item => (
                              <img
                                key={item.closetItemId}
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : absolutize(item.imageUrl, API_BASE)}
                                alt={item.category}
                                className="w-16 h-16 max-[380px]:w-14 max-[380px]:h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain rounded-2xl"
                              />
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* index below images */}
                    <div className="text-center text-sm mb-2">
                      {currentIndex + 1} / {outfits.length}
                    </div>

                    <div className="flex items-center justify-center gap-2">
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
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Weather Section (centered on mobile, right-aligned on desktop) */}
          <div className="flex flex-col w-full items-center lg:items-end">
            <div className="w-full max-w-[340px] mx-auto lg:max-w-none lg:w-full lg:ml-auto">
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
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
              </div>

              {loadingWeather ? (
                <p>Loading weather…</p>
              ) : error && !weather ? (
                <p className="text-red-500">{error}</p>
              ) : weather ? (
                <>
                  {/* Center the "weather section" card on mobile */}
                  <div className="mx-auto">
                    <WeatherDisplay weather={weather} setCity={setCity} />
                  </div>
                  <HourlyForecast forecast={selectedDayHours.length ? selectedDayHours : weather.forecast} />
                </>
              ) : (
                <p>No weather data available.</p>
              )}
            </div>
          </div>
        </section>

        {/* Events Section (full width on desktop) */}
        <section className="w-full mt-6 px-0">
          <div className="w-full px-4 sm:px-6 md:px-8">
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
                        <StarRating disabled={false} onSelect={() => {}} />
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
