// src/pages/HomePage.tsx

import { useState, useEffect } from 'react';
import { Sun, CloudSun, Plus } from 'lucide-react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import { useWeather } from '../hooks/useWeather';
import { fetchAllItems } from '../services/closetApi';
import { useNavigate } from 'react-router-dom';
import { fetchAllEvents, createEvent } from '../services/eventsApi';

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
  date: string;
  location: string;
  style?: string;
};

const StarRating = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <div className="w-full grid grid-cols-5 gap-1 mt-4 mb-8 px-2">
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={index}
            type="button"
            className="flex justify-center items-center"
            onClick={() => setRating(starValue)}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-10 h-10 transition-transform duration-200 ease-in-out ${starValue <= (hover || rating)
                ? 'text-[#3F978F] fill-[#3F978F]'
                : 'text-none fill-black'
                } ${starValue <= hover ? 'transform scale-110' : ''}`}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
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
  const [items, setItems] = useState<Item[]>([]);
  const { weather, setCity } = useWeather();
  const [username, setUsername] = useState<string | null>(null);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);

  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUsername(parsedUser.name);
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
      }
    }

    const fetchOutfitItems = async () => {
      try {
        const res = await fetchAllItems();

        const shirt = res.data.find((item: Item) => item.category === 'SHIRT');
        const pants = res.data.find((item: Item) => item.category === 'PANTS');
        const shoes = res.data.find((item: Item) => item.category === 'SHOES');

        const selectedItems = [shirt, pants, shoes].filter(Boolean);
        const missing = [];
        if (!shirt) missing.push('SHIRT');
        if (!pants) missing.push('PANTS');
        if (!shoes) missing.push('SHOES');

        setMissingCategories(missing);

        setItems(
          selectedItems.map((item) => ({
            id: item.id,
            name: item.name || item.category,
            image: `http://localhost:5001${item.imageUrl}`,
            favorite: false,
            category: item.category,
          }))
        );
      } catch (error) {
        console.error('Error fetching outfit items:', error);
      }
    };

    fetchOutfitItems();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await fetchAllEvents();
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([
        ]);
      }
    };

    fetchEvents();
  }, []);


  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    style: 'CASUAL',
  });


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
            {/* Reuse existing Outfit code */}
            <div className="w-full max-w-[350px]">
              <div className="flex justify-center">
                <div className="inline-block py-1 px-3 border-2 border-black dark:border-gray-600">
                  <h1 className="text-xl text-black dark:text-gray-100 text-center">
                    OUTFIT OF THE DAY
                  </h1>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white-200 dark:bg-gray-800 rounded-3xl overflow-hidden flex items-center justify-center ${item.category === 'SHOES'
                        ? 'aspect-[3/3] max-h-[60px]'
                        : item.category === 'SHIRT'
                          ? 'aspect-[3/4] max-h-[160px]'
                          : 'aspect-[3/4] max-h-[200px]'
                        }`}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-outfit.jpg';
                          e.currentTarget.alt = 'Outfit placeholder';
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <img
                    src="/placeholder-outfit.jpg"
                    alt="Outfit placeholder"
                    className="w-full h-full object-cover"
                  />
                )}

                {missingCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => (window.location.href = '/add')}
                    className="bg-[#3F978F] text-white py-2 px-4 rounded-xl border border-black hover:bg-[#347e77] transition"
                  >
                    No {category.toLowerCase()} found — add more to wardrobe
                  </button>
                ))}
              </div>

              <StarRating />
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

        {/* Events Section - Full Width */}
        <div className="w-full mt-12">
          <div className="max-w-4xl mx-auto relative scroll-mt-20 snap-start">



            <div className="relative z-10 pt-10 pb-6 px-4bg-transparent dark:bg-transparent pt-10 pb-6 px-4
">

              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold dark:text-gray-100 text-center">
                    Upcoming Events
                  </h2>
                  <button
                    onClick={() => setShowModal(true)}
                    className="ml-2 p-2 rounded-full border border-black dark:border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    aria-label="Add Event"
                  >
                    <Plus className="w-5 h-5 text-black dark:text-white" />
                  </button>
                </div>

              </div>


              {events.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-6 overflow-x-auto px-2 py-4 scroll-smooth snap-x snap-mandatory">

                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="snap-center flex flex-col items-center justify-center bg-white dark:bg-gray-700 rounded-full w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 shadow-md border border-black dark:border-gray-500 transition-transform duration-300 hover:scale-110"
                    >

                      <span className="text-sm font-bold text-black dark:text-white text-center px-2 truncate">
                        {event.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {new Date(event.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">{event.date}</span>
                      <span
                        className={`text-[10px] mt-1 px-2 py-1 rounded-full ${event.style === 'Formal'
                          ? 'bg-blue-100 text-blue-800'
                          : event.style === 'Business'
                            ? 'bg-gray-100 text-gray-800'
                            : event.style === 'Athletic'
                              ? 'bg-yellow-100 text-yellow-800'
                              : event.style === 'Party'
                                ? 'bg-pink-100 text-pink-800'
                                : event.style === 'Outdoor'
                                  ? 'bg-green-200 text-green-900'
                                  : 'bg-green-100 text-green-800'
                          }`}
                      >
                        {event.style}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No upcoming events</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-2 bg-[#3F978F] text-white py-1 px-3 rounded-lg text-sm hover:bg-[#347e77] transition"
                  >
                    Add Your First Event
                  </button>
                </div>
              )}





            </div>
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
      {showModal && (
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
                  } catch (err) {
                    console.error('Error creating event:', err);
                    alert('Failed to create event');
                  }
                }}

              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}



      <Footer />
    </div>
  );
}