import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CloudSun, Shirt, Calendar, Users } from "lucide-react";
import Footer from "../components/Footer";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const testimonials = [
    {
      id: 1,
      quote: "I've recently started paying more attention to my outfits/wardrobe and this app has been a big help. I can put together sample outfits, keep records of what I've worn. Lots of features I like and it's a free app!",
      author: "Alisha P.",
      role: "Weather To Wear user",
      image: "/LPtest1.jpg",
    },
    {
      id: 2,
      quote: "Weather to Wear makes getting dressed so easy! I love how it matches my style to the forecast.",
      author: "Diya B.",
      role: "Weather To Wear user",
      image: "/LPtest2.jpg",
    },
    {
      id: 3,
      quote: "I've recently started paying more attention to my outfits/wardrobe and this app has been a big help. I can put together sample outfits, keep records of what I've worn. Lots of features I like and it's a free app!",
      author: "Kyle L.",
      role: "Weather To Wear user",
      image: "/LPtest1.jpg",
    },
    {
      id: 4,
      quote: "Weather to Wear makes getting dressed so easy! I love how it matches my style to the forecast.",
      author: "Taylor S.",
      role: "Weather To Wear user",
      image: "/LPtest2.jpg",
    },
    {
      id: 5,
      quote: "I've recently started paying more attention to my outfits/wardrobe and this app has been a big help. I can put together sample outfits, keep records of what I've worn. Lots of features I like and it's a free app!",
      author: "Bemo S.",
      role: "Weather To Wear user",
      image: "LPtest1.jpg",
    }
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

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
        className="relative flex items-center min-h-[30rem] bg-black" style={{ position: 'relative', overflow: 'hidden' }}
      >
        <div className="pl-10 pr-8 py-4 z-10 ml-0 w-full">
          <TypingSlogan />
          <p className="text-lg text-white  mb-6 max-w-2xl">
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

        {/* Arch Section */}
        <div className="w-full lg:w-1/3 flex justify-center mt-0 lg:-mt-20">
          <div className="relative w-full max-w-[280px] h-[350px]">
            <div
              className="absolute rounded-tl-full rounded-tr-full h-full pointer-events-none bg-white dark:bg-gray-800"
              style={{
                top: '-1%',
                left: '-130px',
                width: '280px',
                height: '380px',
                zIndex: 10,
                position: 'absolute',
              }}
            >
              <div className="z-10 p-0 relative h-full w-full">
                <img
                  src="/LPcloset.jpg"
                  alt="Event image"
                  className="absolute inset-0 w-full h-full object-cover rounded-tl-full rounded-tr-full"
                  style={{ zIndex: -1 }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* What is Weather to Wear Section*/}
      <section className="bg-stone-200 dark:bg-gray-800 py-16 h-[400px]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-center">
          <h2 className="text-4xl font-sephir font-bold text-gray-900 dark:text-white text-center mb-12">
            What is Weather To Wear?
          </h2>
          <p className="text-gray-600 text-center ">
            Weather to Wear is your ultimate companion for dressing smartly based on real-time weather,
            your personal wardrobe, and upcoming events.
            We aim to simplify weather forecasts into a personalized wardrobe consultant. By analysing real-time weather
            forecasts with the combination of a user's personalised styling preferences and the use of AI-driven
            outfit suggestions, we provide appropriate fashion recommendations from a your personal clothing collection to
            ensure you can step out confidently prepared for any weather condition while expressing your unique fashion sense.
            Join our style community and never worry about what to wear again!

          </p>
        </div>
      </section>

      {/* Features Section*/}
      <section className="py-16 max-w-8xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl font-sephir font-bold text-gray-900 dark:text-white text-center mb-12">
          Features
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow w-full min-h-[200px] flex flex-col justify-between">
            <div>
              <CloudSun className="h-12 w-12 mx-auto mb-4 text-teal-500" />
              <h3 className="text-lg font-semibold mb-2">Weather Integration</h3>
            </div>
            <p className="text-gray-600 ">
              Get real-time weather updates and personalized outfit recommendations based on current conditions.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow w-full min-h-[200px] flex flex-col justify-between">
            <div>
              <Shirt className="h-12 w-12 mx-auto mb-4 text-teal-500" />
              <h3 className="text-lg font-semibold mb-2">Smart Closet</h3>
            </div>
            <p className="text-gray-600 ">
              Organize your wardrobe digitally and let AI suggest the perfect outfit combinations for any weather.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow w-full min-h-[200px] flex flex-col justify-between">
            <div>
              <Calendar className="h-12 w-12 mx-auto mb-4 text-teal-500" />
              <h3 className="text-lg font-semibold mb-2">Outfit Planning</h3>
            </div>
            <p className="text-gray-600 ">
              Plan your outfits in advance with weather forecasts and never worry about what to wear again.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow w-full min-h-[200px] flex flex-col justify-between">
            <div>
              <Users className="h-12 w-12 mx-auto mb-4 text-teal-500" />
              <h3 className="text-lg font-semibold mb-2">Style Community</h3>
            </div>
            <p className="text-gray-600 ">
              Share your outfits, get inspiration from others, and build a community around weather-smart fashion.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <div className="bg-stone-200 w-full py-16">
        <section className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-4xl font-sephir font-bold text-gray-900 dark:text-white text-center mb-12">
            Testimonials
          </h2>
          <div
            className="flex flex-col sm:flex-row items-center gap-8 rounded-lg p-6 bg-white shadow-md"
            style={{ minHeight: "400px" }}
          >
            <div className="w-full sm:w-1/3 flex justify-center">
              <img
                src={testimonials[currentTestimonial].image}
                alt="Testimonial outfit"
                className="w-[300px] h-[300px] rounded-full object-cover"
                style={{}}
              />
            </div>
            <div className="w-full sm:w-2/3 flex flex-col justify-between">
              <div>
                <p
                  className="text-gray-600 dark:text-gray-400 text-lg mb-4"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  "{testimonials[currentTestimonial].quote}"
                </p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {testimonials[currentTestimonial].author}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {testimonials[currentTestimonial].role}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <button
              onClick={prevTestimonial}
              className="p-2 mx-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextTestimonial}
              className="p-2 mx-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              aria-label="Next testimonial"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </section>
      </div>


      {/* How it works */}
      <section className="dark:bg-gray-800 py-24 min-h-[600px]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-4xl font-sephir font-bold text-gray-800 dark:text-white text-center mb-20">
            How It Works
          </h2>
          <div className="relative">
            {/* Steps Row */}
            <div className="flex flex-wrap lg:flex-nowrap justify-center gap-6">
              <div className="relative group flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow w-[200px] min-h-[100px] flex flex-col justify-between z-10">
                  <div className="text-4xl font-bold text-teal-600">1</div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Set Your Location
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 ">
                    Allow location access or enter your city manually.
                  </p>
                </div>
                <div className="absolute w-[300px] h-[300px] bg-teal-600 rounded-full shadow-md transition-all duration-300 ease-in-out group-hover:w-[350px] group-hover:h-[350px] group-hover:bg-teal-600 z-0"></div>
              </div>
              <div className="relative group flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow w-[200px] min-h-[100px] flex flex-col justify-between z-10">
                  <div className="text-4xl font-bold text-teal-600 mb-2">2</div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Add Your Wardrobe
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 ">
                    Save your clothing preferences for outfit suggestions.
                  </p>
                </div>
                <div className="absolute w-[300px] h-[300px] bg-teal-600 rounded-full shadow-md transition-all duration-300 ease-in-out group-hover:w-[350px] group-hover:h-[350px] group-hover:bg-teal-600 z-0"></div>
              </div>
              <div className="relative group flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow w-[200px] min-h-[100px] flex flex-col justify-between z-10">
                  <div className="text-4xl font-bold text-teal-600 mb-2">3</div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Get Outfit Ideas
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Receive weather-based outfit recommendations.
                  </p>
                </div>
                <div className="absolute w-[300px] h-[300px] bg-teal-600 rounded-full shadow-md transition-all duration-300 ease-in-out group-hover:w-[350px] group-hover:h-[350px] group-hover:bg-teal-600 z-0"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;