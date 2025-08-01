// src/pages/HomePage.tsx

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import { useWeather } from '../hooks/useWeather';
import { useNavigate } from 'react-router-dom';
import { fetchAllEvents, createEvent, updateEvent, deleteEvent } from '../services/eventsApi';
import { fetchRecommendedOutfits, createOutfit, RecommendedOutfit } from '../services/outfitApi';
import StarRating from '../components/StarRating';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Item = {
  id: number;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  tab?: 'items' | 'outfits';
};

type Event = {
  id: string;
  name: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  style?: string;
  weather?: string;
};

const TypingSlogan = () => {
  const slogan = 'Style Made Simple.';
  const tealWord = 'Simple.'; // 7 chars with dot
  const tealStart = slogan.indexOf(tealWord);
  const tealEnd = tealStart + tealWord.length;

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
    const timer = setTimeout(handleTyping, speed);

    return () => clearTimeout(timer);
  }, [index, isDeleting]);

  const beforeTeal = displayText.slice(0, Math.min(tealStart, displayText.length));
  let tealVisibleLength = 0;
  if (displayText.length > tealStart) {
    tealVisibleLength = Math.min(displayText.length - tealStart, tealWord.length);
  }
  const tealPart = tealWord.slice(0, tealVisibleLength);

  return (
    <h2 className="text-5xl lg:text-6xl font-bold mb-6 font-bodoni tracking-wide text-left w-full">
      {beforeTeal}
      <span className="text-[#3F978F]">{tealPart}</span>
      <span className="animate-pulse">|</span>
    </h2>
  );
};

export default function HomePage() {

  const { weather, setCity } = useWeather();
  // user
  const [username, setUsername] = useState<string | null>(null);

  // events
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', location: '', dateFrom: '', dateTo: '', style: 'CASUAL' });

  // outfits
  const [outfits, setOutfits] = useState<RecommendedOutfit[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [outfitError, setOutfitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOutfit, setDetailOutfit] = useState<RecommendedOutfit | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Style dropdown state
  const [selectedStyle, setSelectedStyle] = useState<string>('Casual');

  const [isEditing, setIsEditing] = useState(false);
  const [editEventData, setEditEventData] = useState({
    id: '',
    name: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    style: ''
  });


  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUsername(JSON.parse(stored).name);
      } catch { }
    }
  }, []);

  useEffect(() => {
    if (!weather) return;

    const { avgTemp, minTemp, maxTemp, willRain, mainCondition } = weather.summary;
    setLoadingOutfits(true);

    fetchRecommendedOutfits(
      { avgTemp, minTemp, maxTemp, willRain, mainCondition },
      selectedStyle
    )
      .then(recs => {
        setOutfits(recs);
        setOutfitError(null);
      })
      .catch(err => {
        console.error('Outfit fetch failed', err);
        setOutfitError('Could not load outfit recommendations.');
      })
      .finally(() => setLoadingOutfits(false));
  }, [weather, selectedStyle]);



  useEffect(() => {
    fetchAllEvents()
      .then(fetched => {
        setEvents(fetched);
      })
      .catch(err => {
        console.error('Error loading events on mount:', err);
      });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    // parse the stored weather array, take the first day
    let days: { date: string; summary: any }[] = [];
    try {
      days = selectedEvent.weather ? JSON.parse(selectedEvent.weather) : [];
    } catch { days = []; }
    const today = days[0]?.summary;
    if (!today) return;

    setDetailLoading(true);
    fetchRecommendedOutfits(
      {
        avgTemp: today.avgTemp,
        minTemp: today.minTemp,
        maxTemp: today.maxTemp,
        willRain: today.willRain,
        mainCondition: today.mainCondition,
      },
      selectedEvent.style!,
      selectedEvent.id
    )
      .then(recs => {
        setDetailOutfit(recs[0] ?? null);
        setDetailError(null);
      })
      .catch(() => {
        setDetailError('Could not load outfit recommendation.');
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return;
    setIsEditing(false);
    setEditEventData({
      id: selectedEvent.id,
      name: selectedEvent.name,
      location: selectedEvent.location,
      dateFrom: selectedEvent.dateFrom.slice(0, 16),
      dateTo: selectedEvent.dateTo.slice(0, 16),
      style: selectedEvent.style || ''
    });
  }, [selectedEvent]);



  //handle rating logic (save outfit to closet when a user rates it)
  const handleSaveRating = async (rating: number) => {
    const outfit = outfits[currentIndex];
    if (!outfit) return;

    const payload = {
      outfitItems: outfit.outfitItems.map((i) => ({
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

    setSaving(true);
    try {
      await createOutfit(payload);
      // advance to the next outfit
      setCurrentIndex((i) => Math.min(i + 1, outfits.length - 1));
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save your rating.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out">

      {/* Hero Background */}
      <div
        className="w-screen relative flex items-center justify-center h-64 mb-6 -mt-8 z-0 bg-fixed"
        style={{
          backgroundImage: `url(/background.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
          marginLeft: 'calc(-50vw + 50%)',
          width: '100vw',
          marginTop: '-4rem'
        }}
      >
        <div className="px-6 py-2 border-2 border-white z-10">
          <h1 className="text-2xl font-bodoni font-light text-center text-white">
            {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
          </h1>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      {/* Main Sections */}
      {/* Top Content: Typing Slogan + Outfit + Weather */}
      <div className="flex flex-col gap-12 px-4 md:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 justify-between">

          {/* Typing Slogan */}
          <div className="flex-1 flex flex-col items-start justify-center">
            <TypingSlogan />
          </div>

          {/* Outfit Section */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[350px]">
              <div className="flex justify-center mb-4">
                <h1 className="text-xl border-2 border-black px-3 py-1">
                  OUTFIT OF THE DAY
                </h1>
              </div>

              {loadingOutfits && <p>Loading outfits…</p>}
              {outfitError && <p className="text-red-500">{outfitError}</p>}

              {!loadingOutfits && outfits.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Sorry, we couldn’t generate an outfit in that style. Please add more items to your wardrobe.
                </p>
              )}

              {/* Style Dropdown */}
              <div className="mb-4 w-full text-center">
                <label
                  htmlFor="style-select"
                  className="block text-sm font-medium mb-1 font-livvic text-black dark:text-gray-100"
                >
                  Choose Style:
                </label>
                <select
                  id="style-select"
                  value={selectedStyle}
                  onChange={e => setSelectedStyle(e.target.value)}
                  className="w-full max-w-xs mx-auto p-2 bg-white dark:bg-gray-900 rounded-full border border-black dark:border-white focus:outline-none font-livvic"
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
                  {/* ← Prev / Next + counter → */}
                  <div className="flex justify-between items-center mb-2 w-full">
                    <button
                      onClick={() => setCurrentIndex(i => (i - 1 + outfits.length) % outfits.length)}
                      className="p-2 bg-[#3F978F] rounded-full hover:bg-[#304946] transition"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-sm">{currentIndex + 1} / {outfits.length}</span>
                    <button
                      onClick={() => setCurrentIndex(i => (i + 1) % outfits.length)}
                      className="p-2 bg-[#3F978F] rounded-full hover:bg-[#304946] transition"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </div>


                  <div className="mb-4 space-y-2">
                    {/* Row 1: headwear + accessory (collapsed if none) */}
                    <div
                      className={`flex justify-center space-x-2 transition-all ${outfits[currentIndex].outfitItems.some(
                        i =>
                          i.layerCategory === 'headwear' ||
                          i.layerCategory === 'accessory'
                      )
                        ? 'h-auto'
                        : 'h-0 overflow-hidden'
                        }`}
                    >
                      {outfits[currentIndex].outfitItems
                        .filter(
                          i =>
                            i.layerCategory === 'headwear' ||
                            i.layerCategory === 'accessory'
                        )
                        .map(item => (
                          <img
                            key={item.closetItemId}
                            src={
                              item.imageUrl.startsWith('http')
                                ? item.imageUrl
                                : `http://localhost:5001${item.imageUrl}`
                            }
                            alt={item.category}
                            className="w-32 h-32 object-contain rounded-2xl"
                          />
                        ))}
                    </div>
                    {/* Row 2: base_top, mid_top, outerwear */}
                    <div className="flex justify-center space-x-2">
                      {outfits[currentIndex].outfitItems
                        .filter(
                          i =>
                            i.layerCategory === 'base_top' ||
                            i.layerCategory === 'mid_top' ||
                            i.layerCategory === 'outerwear'
                        )
                        .map(item => (
                          <img
                            key={item.closetItemId}
                            src={
                              item.imageUrl.startsWith('http')
                                ? item.imageUrl
                                : `http://localhost:5001${item.imageUrl}`
                            }
                            alt={item.category}
                            className="w-32 h-32 object-contain rounded-2xl"
                          />
                        ))}
                    </div>

                    {/* Row 3: base_bottom */}
                    <div className="flex justify-center space-x-2">
                      {outfits[currentIndex].outfitItems
                        .filter(i => i.layerCategory === 'base_bottom')
                        .map(item => (
                          <img
                            key={item.closetItemId}
                            src={
                              item.imageUrl.startsWith('http')
                                ? item.imageUrl
                                : `http://localhost:5001${item.imageUrl}`
                            }
                            alt={item.category}
                            className="w-32 h-32 object-contain rounded-2xl"
                          />
                        ))}
                    </div>

                    {/* Row 4: footwear */}
                    <div className="flex justify-center space-x-2">
                      {outfits[currentIndex].outfitItems
                        .filter(i => i.layerCategory === 'footwear')
                        .map(item => (
                          <img
                            key={item.closetItemId}
                            src={
                              item.imageUrl.startsWith('http')
                                ? item.imageUrl
                                : `http://localhost:5001${item.imageUrl}`
                            }
                            alt={item.category}
                            className="w-28 h-28 object-contain rounded-2xl"
                          />
                        ))}
                    </div>
                  </div>



                  <StarRating disabled={saving} onSelect={handleSaveRating} />
                </>
              )}
            </div>
          </div>


          {/* Weather Section */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[280px]">
              <div className="flex flex-col gap-4">
                {weather && (
                  <>
                    <WeatherDisplay weather={weather} setCity={setCity} />
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Select City"
                        className="w-full pl-10 pr-4 py-2 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-[#3F978F] dark:border-gray-600 dark:focus:ring-teal-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setCity((e.target as HTMLInputElement).value.trim());
                          }
                        }}
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400"
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

                    <HourlyForecast forecast={weather.forecast} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* — Events Section — */}
        <div className="w-full mt-6">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center mb-4 space-x-4">
              <h2 className="text-4xl font-livvic font-medium">
                Upcoming Events
              </h2>
              <button
                onClick={() => setShowModal(true)}
                className="p-2 rounded-full bg-[#3F978F] text-white hover:bg-[#347e77] transition"
                aria-label="Add Event"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {events.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-6 overflow-x-auto py-2">
                {events.map(ev => (
                  <div
                    key={ev.id}
                    className="
                      flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44
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
                    <div className="
              mt-1 text-[10px] px-2 py-1 rounded-full
              bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200
            ">
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
        </div>



      </div>


      {/* Bottom Banner */}
      <div
        className="w-screen relative flex items-center justify-center h-48"
        style={{
          backgroundImage: `url(/header.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          marginTop: '2rem',
          marginLeft: 'calc(-50vw + 50%)',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>


      {/* Create New Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg relative flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Close “×” */}
            <button
              className="absolute top-4 right-4 text-xl"
              onClick={() => setShowModal(false)}
            >
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
                onChange={e => setNewEvent({ ...newEvent, style: e.target.value })}
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
              <button
                className="px-4 py-2 rounded-full border border-black"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                onClick={async () => {
                  // Validate
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


                    if (created.weather) {
                      let days: { date: string; summary: any }[] = [];
                      try { days = JSON.parse(created.weather); } catch { days = []; }
                      for (const { date, summary } of days) {
                        try {
                          await fetchRecommendedOutfits(summary, created.style, created.id);
                        } catch (err) {
                          console.error(`Failed to fetch outfits for ${date}`, err);
                        }
                      }
                    }
                    // update state
                    setEvents(evt => [...evt, created]);
                    // reset form
                    setNewEvent({ name: '', location: '', dateFrom: '', dateTo: '', style: 'CASUAL' });
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
            {/* Close “×” */}
            <button
              className="absolute top-4 right-4 text-xl"
              onClick={() => setShowDetailModal(false)}
            >
              ×
            </button>

            {/* Title in sentence case, Livvic font */}
            <h2 className="text-2xl mb-4 font-livvic">
              {selectedEvent.name.charAt(0).toUpperCase() +
                selectedEvent.name.slice(1).toLowerCase()}
            </h2>

            {/* Body */}
            {isEditing ? (
              // EDIT MODE
              <div className="space-y-3 flex-grow">
                <input
                  className="w-full p-2 border rounded"
                  value={editEventData.name}
                  onChange={e =>
                    setEditEventData(d => ({ ...d, name: e.target.value }))
                  }
                />
                <input
                  className="w-full p-2 border rounded"
                  value={editEventData.location}
                  onChange={e =>
                    setEditEventData(d => ({ ...d, location: e.target.value }))
                  }
                />
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={editEventData.dateFrom}
                  onChange={e =>
                    setEditEventData(d => ({ ...d, dateFrom: e.target.value }))
                  }
                />
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={editEventData.dateTo}
                  onChange={e =>
                    setEditEventData(d => ({ ...d, dateTo: e.target.value }))
                  }
                />
                <select
                  className="w-full p-2 border rounded"
                  value={editEventData.style}
                  onChange={e =>
                    setEditEventData(d => ({ ...d, style: e.target.value }))
                  }
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
              // READ-ONLY VIEW
              <div className="flex-grow">
                {(() => {
                  const from = new Date(selectedEvent.dateFrom)
                  const to = new Date(selectedEvent.dateTo)
                  const sameDay = from.toDateString() === to.toDateString()

                  return (
                    <p className="text-sm mb-1">
                      <strong>When:</strong>{' '}
                      {sameDay ? (
                        <>
                          {from.toLocaleDateString()} {' '}
                          {from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {to.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : (
                        <>
                          {from.toLocaleString()} – {to.toLocaleString()}
                        </>
                      )}
                    </p>
                  )
                })()}

                <p className="text-sm mb-4">
                  <strong>Where:</strong> {selectedEvent.location}
                </p>

                {/* Weather summary */}
                {selectedEvent.weather && (() => {
                  let sums: { date: string; summary: any }[] = [];
                  try {
                    sums = JSON.parse(selectedEvent.weather);
                  } catch {
                    sums = [];
                  }
                  if (!sums.length) return null;
                  return (
                    <div className="text-sm mb-4 space-y-1">
                      {sums.map(({ date, summary }) =>
                        summary ? (
                          <div key={date}>
                            <span className="font-medium">{date}:</span>{' '}
                            {summary.mainCondition} — {Math.round(summary.avgTemp)}°C
                          </div>
                        ) : (
                          <div key={date}>
                            <span className="font-medium">{date}:</span>{' '}
                            <span className="text-red-400">No data</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })()}

                {/* Recommended Outfit */}
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
                            src={
                              item.imageUrl.startsWith('http')
                                ? item.imageUrl
                                : `http://localhost:5001${item.imageUrl}`
                            }
                            alt={item.layerCategory}
                            className="w-20 h-20 object-contain rounded"
                          />
                        ))}
                      </div>
                      {/* Smaller stars */}
                      <div className="scale-75 origin-top-left">
                        <StarRating disabled={false} onSelect={() => { }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-4 flex flex-wrap justify-end space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-full border border-black"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const updated = await updateEvent({
                        id: editEventData.id,
                        name: editEventData.name,
                        location: editEventData.location,
                        dateFrom: new Date(editEventData.dateFrom).toISOString(),
                        dateTo: new Date(editEventData.dateTo).toISOString(),
                        style: editEventData.style,
                      });
                      setEvents(evts =>
                        evts.map(e => (e.id === updated.id ? updated : e))
                      );
                      setSelectedEvent(updated);

                      setIsEditing(false);
                    }}
                    className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this event?')) return;
                      await deleteEvent(selectedEvent.id);
                      setEvents(evts =>
                        evts.filter(e => e.id !== selectedEvent.id)
                      );
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
    </div >
  );
}