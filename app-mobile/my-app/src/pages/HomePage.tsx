// src/pages/HomePage.tsx

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import { useWeather } from '../hooks/useWeather';
import { useNavigate } from 'react-router-dom';
import { fetchAllEvents, createEvent, } from '../services/eventsApi';
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
    fetchRecommendedOutfits({ avgTemp, minTemp, maxTemp, willRain, mainCondition })
      .then((recs) => {
        setOutfits(recs);
        setOutfitError(null);
      })
      .catch((err) => {
        console.error('Outfit fetch failed', err);
        setOutfitError('Could not load outfit recommendations.');
      })
      .finally(() => {
        setLoadingOutfits(false);
      });
  }, [weather]);


  useEffect(() => {
    fetchAllEvents()
      .then(fetched => {
        setEvents(fetched);
      })
      .catch(err => {
        console.error('Error loading events on mount:', err);
      });
  }, []);

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
        className="w-screen relative flex items-center justify-center h-64 mb-6 z-0"
        style={{
          backgroundImage: `url(/background.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          marginLeft: 'calc(-50vw + 50%)',
        }}
      >
        <div className="px-6 py-2 border-2 border-white z-10">
          <h1 className="text-2xl font-light text-white text-center">
            {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
          </h1>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      {/* Main Sections */}
      {/* Top Content: Typing Slogan + Outfit + Weather */}
      <div className="flex flex-col gap-12 px-4 md:px-8">
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

              {!loadingOutfits && outfits.length > 0 && (
                <>
                  {/* ← Prev / Next + counter → */}
                  <div className="flex justify-between items-center mb-2 w-full">
                    <button
                      onClick={() =>
                        setCurrentIndex(i => (i - 1 + outfits.length) % outfits.length)
                      }
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      ‹ Prev
                    </button>
                    <span className="text-sm">
                      {currentIndex + 1} / {outfits.length}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentIndex(i => (i + 1) % outfits.length)
                      }
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Next ›
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
        <div className="w-full mt-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="relative mb-4">
              {/* Centered title */}
              <h2 className="text-3xl font-bold text-center">
                Upcoming Events
              </h2>
              {/* Add button in the top-right */}
              <button
                onClick={() => setShowModal(true)}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 rounded-full border hover:bg-gray-100"
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
              flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36
              bg-white dark:bg-gray-700 rounded-full shadow-md border 
              flex flex-col items-center justify-center text-center p-2
              transition-transform hover:scale-105
            "
                  >
                    <div className="font-semibold truncate">{ev.name}</div>
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

      {/* Modal: Create New Event */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-lg border border-black relative">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Create New Event</h2>

              <div className="space-y-3">
                <input
                  className="w-full p-2 border rounded"
                  placeholder="Event Name"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                />
                <input
                  className="w-full p-2 border rounded"
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={newEvent.dateFrom}
                  onChange={(e) => setNewEvent({ ...newEvent, dateFrom: e.target.value })}
                />
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded"
                  value={newEvent.dateTo}
                  onChange={(e) => setNewEvent({ ...newEvent, dateTo: e.target.value })}
                />

                <select
                  className="w-full p-2 border rounded"
                  value={newEvent.style}
                  onChange={(e) => setNewEvent({ ...newEvent, style: e.target.value })}
                >
                  <option value="">Select a style</option>
                  <option value="Formal">Formal</option>
                  <option value="Casual">Casual</option>
                  <option value="Athletic">Athletic</option>
                  <option value="Party">Party</option>
                  <option value="Business">Business</option>
                  <option value="Outdoor">Outdoor</option>
                </select>

              </div>

              <div className="flex justify-end mt-4 gap-2">
                <button
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-[#3F978F] text-white px-4 py-2 rounded hover:bg-[#347e77]"
                  onClick={async () => {
                    if (!newEvent.name || !newEvent.style || !newEvent.dateFrom || !newEvent.dateTo) {
                      alert('Please fill in the event name, style, and both dates.');
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

                      setEvents([...events, created]);
                      setNewEvent({
                        name: '',
                        location: '',
                        dateFrom: '',
                        dateTo: '',
                        style: '',
                      });
                      setShowModal(false);

                      if (created.weather) {
                        let summaries: { date: string, summary: any }[] = [];
                        try {
                          summaries = JSON.parse(created.weather);
                        } catch { summaries = []; }
                        // For each day in the event, request recommendations
                        for (const { date, summary } of summaries) {
                          try {
                            const outfits = await fetchRecommendedOutfits(summary, created.style, created.id);
                            console.log(`Outfits for ${date}:`, outfits); // ! For now until images 
                          } catch (err) {
                            console.error(`Error fetching outfits for ${date}`, err);
                          }
                        }
                      }

                    } catch (err: any) {
                      let msg = 'Failed to create event';
                      if (err.response && err.response.data && err.response.data.message) {
                        msg = err.response.data.message;
                      }
                      console.error('Error creating event:', err);
                      alert(msg);
                    }
                  }}

                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }



      <Footer />
    </div >
  );
}