import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CloudSun, Shirt, Calendar, Users } from "lucide-react";
import Footer from "../components/Footer";

// TypingSlogan Component
const TypingSlogan = () => {
  const words = ['Style', 'Your', 'Everyday.'];
  const tealWord = 'Everyday.';
  const tealIndex = words.indexOf(tealWord);

  const [displayText, setDisplayText] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleTyping = () => {
      const currentWord = words[wordIndex];
      const fullTextSoFar = displayText.join(' ').trim();

      if (!isDeleting && index < currentWord.length) {
        const updatedDisplayText = [...displayText];
        updatedDisplayText[wordIndex] = currentWord.slice(0, index + 1);
        setDisplayText(updatedDisplayText);
        setIndex(index + 1);
      } else if (!isDeleting && index === currentWord.length) {
        if (wordIndex < words.length - 1) {
          setWordIndex(wordIndex + 1);
          setIndex(0);
          setDisplayText([...displayText, '']);
        } else {
          setTimeout(() => setIsDeleting(true), 30000);
        }
      } else if (isDeleting && index > 0) {
        const updatedDisplayText = [...displayText];
        updatedDisplayText[wordIndex] = currentWord.slice(0, index - 1);
        setDisplayText(updatedDisplayText);
        setIndex(index - 1);
      } else if (isDeleting && index === 0) {
        if (wordIndex > 0) {
          setWordIndex(wordIndex - 1);
          setIndex(words[wordIndex - 1].length);
        } else {
          setIsDeleting(false);
          setIndex(0);
          setWordIndex(0);
          setDisplayText([]);
        }
      }
    };

    const speed = isDeleting ? 60 : 20;
    const timer = setTimeout(handleTyping, speed);

    return () => clearTimeout(timer);
  }, [index, wordIndex, isDeleting, displayText, words]);

  return (
    <h2
      className="text-5xl sm:text-6xl font-bodoni font-light text-white mb-6 tracking-wide text-left w-full"
      style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.97)" }}
      aria-live="polite"
    >
      {displayText.map((word, i) => (
        <span key={i} className={i === tealIndex ? 'text-[#3F978F]' : ''}>
          {word || <br />}
          {i < displayText.length - 1 && <br />}
        </span>
      ))}
      <span className="animate-pulse">|</span>
    </h2>
  );
};

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Top Banner with Logo and Buttons */}
      <div className="bg-black dark:bg-gray-800 text-white py-2 px-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="Weather2Wear logo"
              className="h-10 w-auto"
              loading="lazy"
            />
            <h1 className="text-2xl md:text-4xl font-sephir font-semibold tracking-tight">
              WeatherToWear
            </h1>
          </div>
          {/* Sign Up and Log In Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/signup"
              role="button"
              className="px-3 py-1 rounded-full border border-white text-white hover:bg-white hover:text-black focus:ring-2 focus:ring-teal-500 transition-all font-livvic text-sm"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              role="button"
              className="px-3 py-1 rounded-full border border-white text-white hover:bg-white hover:text-black focus:ring-2 focus:ring-teal-500 transition-all font-livvic text-sm"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div
        className="w-screen overflow-x-hidden relative flex items-center min-h-[30rem] mb-6 bg-black"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <div className="pl-10 pr-8 py-4 z-10 ml-0 w-full">
          <TypingSlogan />
          <p className="text-lg text-white mb-6 max-w-2xl">
            Your personal weather-based clothing assistant.
          </p>
        </div>
        <div
          className="absolute top-0 right-0 h-full w-1/2 bg-teal-800"
          style={{
            clipPath: 'circle(50% at 100% 0)',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
        </div>

      </div>

      {/* What is Weather to Wear */}
      <section className="bg-gray-200 dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            What is Weather To Wear
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Weather to Wear is your ultimate companion for dressing smartly based on real-time weather, your personal wardrobe, and upcoming events. Join our style community and never worry about what to wear again!
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
          Why Weather to Wear?
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
            <CloudSun className="h-12 w-12 mx-auto mb-4 text-teal-500" />
            <h3 className="text-lg font-semibold mb-2">Weather Integration</h3>
            <p className="text-gray-600">
              Get real-time weather updates and personalized outfit recommendations based on current conditions.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
            <Shirt className="h-12 w-12 mx-auto mb-4 text-teal-500" />
            <h3 className="text-lg font-semibold mb-2">Smart Closet</h3>
            <p className="text-gray-600">
              Organize your wardrobe digitally and let AI suggest the perfect outfit combinations for any weather.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-teal-500" />
            <h3 className="text-lg font-semibold mb-2">Outfit Planning</h3>
            <p className="text-gray-600">
              Plan your outfits in advance with weather forecasts and never worry about what to wear again.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
            <Users className="h-12 w-12 mx-auto mb-4 text-teal-500" />
            <h3 className="text-lg font-semibold mb-2">Style Community</h3>
            <p className="text-gray-600">
              Share your outfits, get inspiration from others, and build a community around weather-smart fashion.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-200 dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-12">
            How It Works
          </h2>
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-teal-600 mb-2">1</div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Set Your Location
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Allow location access or enter your city manually in the dashboard.
              </p>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-teal-600 mb-2">2</div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Add Your Wardrobe
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Save your clothing preferences to get personalized outfit suggestions.
              </p>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-teal-600 mb-2">3</div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Get Outfit Ideas
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Receive weather-based outfit recommendations tailored to your style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
          What Our Users Say
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400 italic mb-4">
              "Weather to Wear makes getting dressed so easy! I love how it matches my style to the forecast."
            </p>
            <p className="text-gray-900 dark:text-white font-semibold">
              - Sarah K.
            </p>
          </div>
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400 italic mb-4">
              "Planning outfits for my trips is a breeze with the event feature. Highly recommend!"
            </p>
            <p className="text-gray-900 dark:text-white font-semibold">
              - James T.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-200 dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Dress for the Weather?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join Weather to Wear today and simplify your daily outfit choices.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;