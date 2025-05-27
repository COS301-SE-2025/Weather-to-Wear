// src/pages/HomePage.tsx

import { useState, useEffect } from 'react';
import { Sun, CloudSun } from 'lucide-react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import { useWeather } from '../hooks/useWeather';
import { fetchAllItems } from '../services/closetApi';
import { useNavigate } from 'react-router-dom';

type Item = {
  id: number;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  tab?: 'items' | 'outfits';
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
              className={`w-10 h-10 transition-transform duration-200 ease-in-out ${
                starValue <= (hover || rating)
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

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
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
          <h1
            className="text-2xl font-light text-white text-center"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            {username ? `WELCOME BACK ${username.toUpperCase()}` : 'WELCOME BACK'}
          </h1>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      {/* Main Sections */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 gap-8 mt-24 md:mt-28 z-10">
        {/* Weather Section */}
        <div className="w-full lg:w-1/3 flex flex-col items-center mb-8">
          <div className="w-full max-w-[280px]">
            <div className="h-[5rem] w-full flex items-end">
              <TypingSlogan />
            </div>
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

        {/* Outfit Section */}
        <div className="w-full lg:w-1/3 flex flex-col items-center lg:-mt-28">
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
                    className={`bg-white-200 dark:bg-gray-800 rounded-3xl overflow-hidden flex items-center justify-center ${
                      item.category === 'SHOES'
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

        {/* Events Section */}
        <div className="w-full lg:w-1/3 flex justify-center mt-0 lg:-mt-20">
          <div className="relative w-full max-w-[280px]">
            {/* Teal shadow arch */}
            <div
              className="absolute rounded-tl-full rounded-tr-full h-full pointer-events-none bg-[#3F978F]"
              style={{
                left: '5%',
                right: '-5%',
                bottom: '0',
                zIndex: 0,
                position: 'absolute',
              }}
            ></div>

            {/* Main arch */}
            <div
              className="absolute inset-0 rounded-tl-full rounded-tr-full h-full pointer-events-none bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600"
              style={{
                top: '-4%',
                left: '0',
                zIndex: 10,
                position: 'absolute',
              }}
            ></div>

            {/* Content */}
            <div className="relative z-10 pt-10 pb-6 px-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-regular text-center mb-6 md:mb-8 dark:text-gray-100">
                Upcoming Events
              </h2>
              <div className="space-y-2 md:space-y-3">
                {[
                  { date: '21 May', label: '21st birthday' },
                  { date: '3 June', label: 'Random Day' },
                  { date: '4 November', label: "Diya's Birthday" },
                  { date: '30 December', label: "Kyle's Birthday" },
                ].map((event, idx) => (
                  <div key={idx}>
                    {idx !== 0 && <hr className="border-black dark:border-gray-600" />}
                    <div className="flex justify-between text-base md:text-lg py-1 md:py-2">
                      <span className="font-semibold text-black dark:text-gray-100">
                        {event.date}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {event.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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

      <Footer />
    </div>
  );
}
