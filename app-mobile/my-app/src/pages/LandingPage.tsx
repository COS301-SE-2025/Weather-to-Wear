import Footer from "../components/Footer";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CloudSun, Shirt, Calendar, Users, ChevronLeft, ChevronRight } from "lucide-react";
import TypingSlogan from "../components/TypingSlogan";
import { motion, AnimatePresence } from 'framer-motion'


const LandingPage: React.FC = () => {
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    // small delay so user can see the heading first
    const timer = setTimeout(() => setTextVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);
  const testimonials = [
    {
      id: 1,
      quote: "Weather to Wear has simplified my mornings. I get dressed quickly without checking multiple apps.",
      author: "Alisha P.",
      role: "Weather To Wear user",
      image: "/test1.jpg",
    },
    {
      id: 2,
      quote: "I love how it blends weather forecasts with my wardrobe. Feels like having a personal stylist!",
      author: "Diya B.",
      role: "Weather To Wear user",
      image: "/test2.jpg",
    },
    {
      id: 3,
      quote: "This app helps me rotate my outfits better. No more repeating the same jacket twice in one week.",
      author: "Kyle L.",
      role: "Weather To Wear user",
      image: "/test4.jpg",
    },
    {
      id: 4,
      quote: "It’s the perfect combo of fashion and function. Even my friends started noticing I dress better.",
      author: "Taylor S.",
      role: "Weather To Wear user",
      image: "/test3.jpg",
    },
    {
      id: 5,
      quote: "Hands down, my favorite app of the year. Simple, clean interface and very practical.",
      author: "Bemo S.",
      role: "Weather To Wear user",
      image: "/test5.png",
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
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 overflow-x-visible overflow-y-visible">
      {/* Top Banner (logo only) */}
      <div className="sticky top-0 z-60 bg-black dark:bg-gray-800 text-white py-2 px-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-center">
          <img
            src="/logo.png"
            alt="WeatherToWear logo"
            className="h-10 w-auto"
            loading="lazy"
          />
          <h1 className="ml-4 text-2xl md:text-4xl font-sephir font-semibold tracking-tight">
            WeatherToWear
          </h1>
        </div>
      </div>

    {/* Hero Section */}
<section className="relative flex flex-col lg:flex-row items-center lg:justify-between bg-black overflow-visible py-6 lg:py-8">
  {/* Text + Typing */}
  <div className="relative z-20 px-6 sm:px-12 lg:px-16 max-w-lg mx-auto lg:mx-0 text-center lg:text-left flex flex-col justify-center">
    <TypingSlogan />

    <p className="mt-4 text-base sm:text-lg lg:text-xl text-white max-w-sm mx-auto lg:mx-0">
      Your personal weather-based clothing assistant.
    </p>

    {/* Desktop Buttons */}
    <div className="mt-6 hidden md:flex justify-center lg:justify-start gap-4">
      <Link
        to="/signup"
        className="px-6 py-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black transition text-center"
      >
        Sign Up
      </Link>
      <Link
        to="/login"
        className="px-6 py-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black transition text-center"
      >
        Log In
      </Link>
    </div>
  </div>

  {/* Image & Circle */}
  <div className="w-full lg:w-1/3 flex flex-col items-center justify-center mt-6 lg:mt-0 px-6 sm:px-0 relative z-20">
    <div className="relative w-fit">
      {/* Circle */}
      <div className="absolute -top-6 sm:-top-10 -right-6 sm:right-0 w-32 h-32 sm:w-40 sm:h-40 lg:w-56 lg:h-56 bg-teal-800 rounded-full z-0" />
      
      {/* Image */}
      <div className="relative z-10 w-32 sm:w-40 md:w-48 lg:w-60 max-w-[200px]">
        <img
          src="/LPcloset.jpg"
          alt="Closet preview"
          className="object-cover rounded-tl-full rounded-tr-full shadow-md w-full h-auto"
        />
      </div>
    </div>

    {/* Mobile & Tablet Buttons (stacked under image) */}
    <div className="mt-4 flex md:hidden flex-row gap-4 justify-center z-10">
      <Link
        to="/signup"
        className="px-6 py-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black transition text-center"
      >
        Sign Up
      </Link>
      <Link
        to="/login"
        className="px-6 py-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black transition text-center"
      >
        Log In
      </Link>
    </div>
  </div>
</section>





      {/* What is Weather to Wear Section */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-16 sticky top-0 z-20"
        style={{ backgroundImage: "url('/header.jpg')" }}
      >
        {/* dark overlay */}
        <div className="absolute inset-0 bg-black opacity-50"></div>

        {/* content */}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
          {/* Bordered heading */}
          <div className="px-6 py-2 border-2 border-white rounded z-10 mb-6">
            <h2 className="text-3xl sm:text-4xl font-bodoni font-light text-white">
              What is Weather To Wear?
            </h2>
          </div>

          {/* Animated Paragraph */}
          <p
            className={`
              text-lg text-white leading-relaxed 
              transition-opacity transition-transform duration-700 ease-out
              ${textVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
              }`}
          >
            Weather to Wear is your ultimate companion for dressing smartly based on real-time weather,
            your personal wardrobe, and upcoming events. We aim to simplify weather forecasts into a
            personalized wardrobe consultant. By analysing real-time weather forecasts combined with your
            styling preferences and AI-driven outfit suggestions, you’ll always step out confident and
            weather-ready.
          </p>
        </div>
      </section>



      {/* Features Section*/}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Centered, pill-style title with hover-underline */}
          <div className="text-center mb-6">
            <div className="inline-block relative group mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bodoni font-light text-black dark:text-white">
                Features
              </h2>
              <span
                className="
            absolute left-1/2 -bottom-1 w-0 h-[2px]
            bg-black dark:bg-white
            group-hover:left-0 group-hover:w-full
            transition-all duration-300 ease-out
          "
              />
            </div>
          </div>

          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to look and feel great in any weather.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              {
                img: '/clouds.jpg',
                title: 'Weather Integration',
                description:
                  'Real-time weather insights plus AI-driven outfit recs for every forecast.',
              },
              {
                img: '/closet.jpg',
                title: 'Smart Closet',
                description:
                  'Digitally organize your wardrobe and get perfect combos in a tap.',
              },
              {
                img: '/planning.jpg',
                title: 'Outfit Planning',
                description:
                  'Plan your week’s looks in advance with seamless calendar sync.',
              },
              {
                img: '/community.jpg',
                title: 'Style Community',
                description:
                  'Share your looks, get feedback, and inspire fellow fashion-lovers.',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="
            relative bg-white dark:bg-gray-800 rounded-3xl shadow-md
            p-8 flex flex-col items-center text-center overflow-visible
            hover:scale-105 hover:shadow-xl transition-transform duration-300
          "
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                viewport={{ once: true }}
              >
                {/* Soft glow behind image */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-transparent opacity-20 rounded-3xl pointer-events-none" />

                {/* Circular image */}
                <div className="relative w-28 h-28 rounded-full overflow-hidden mb-6">
                  <img
                    src={feature.img}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="relative text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="relative text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Testimonials Section */}
      <div className="bg-stone-200 w-full py-16  sticky top-0 z-30">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {/* Section Title */}
          <div className="text-center mb-6">
            <div className="inline-block relative group mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bodoni font-light text-black dark:text-white">
                Testimonials
              </h2>
              <span
                className="
            absolute left-1/2 -bottom-1 w-0 h-[2px]
            bg-black dark:bg-white
            group-hover:left-0 group-hover:w-full
            transition-all duration-300 ease-out
          "
              />
            </div>
          </div>
          <p className="mt-4 mb-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Our main goal is to make your life easier and more stylish. Here’s what our users say:
          </p>

          {/* AnimatePresence wrapper using mode="wait" */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-8 rounded-lg p-6 bg-white shadow-md"
              style={{ minHeight: "400px" }}
            >
              {/* Image */}
              <div className="w-full sm:w-1/3 flex justify-center">
                <img
                  src={testimonials[currentTestimonial].image}
                  alt="Testimonial outfit"
                  className="w-[300px] h-[300px] rounded-full object-cover"
                />
              </div>

              {/* Text */}
              <div className="w-full sm:w-2/3 flex flex-col justify-between">
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                  “{testimonials[currentTestimonial].quote}”
                </p>
                <div>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {testimonials[currentTestimonial].author}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {testimonials[currentTestimonial].role}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
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




      {/* How It Works Section */}
      <section className="dark:bg-gray-800 py-24 min-h-[600px] sticky top-0 z-50 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Centered heading, now on top of circles */}
          <div className="text-center mb-6 relative z-20">
            <div className="inline-block relative group mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bodoni font-light text-black dark:text-white">
                How It Works
              </h2>
              <span
                className="
            absolute left-1/2 -bottom-1 w-0 h-[2px]
            bg-black dark:bg-white
            group-hover:left-0 group-hover:w-full
            transition-all duration-300 ease-out
          "
              />
            </div>
          </div>
          <p className=" text-center mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Confused about how to get started? Here’s a quick guide:
          </p>

          {/* Steps Row */}
          <div className="relative mt-32">
            <div className="flex flex-wrap lg:flex-nowrap justify-center gap-6">
              {/* Step 1 */}
              <div className="relative group flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow w-[200px] min-h-[100px] flex flex-col justify-between z-10">
                  <div className="text-4xl font-bold text-teal-600">1</div>
                  <p className="text-lg font-semibold font-livvic text-gray-900 dark:text-white">
                    Set Your Location
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 ">
                    Allow the app location access or enter your city manually.
                  </p>
                </div>
                <div className="absolute w-[300px] h-[300px] bg-[#3F978F] rounded-full shadow-md transition-all duration-300 ease-in-out group-hover:w-[350px] group-hover:h-[350px] group-hover:bg-[#3F978F] z-0" />
              </div>

              {/* Step 2 */}
              <div className="relative group flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow w-[200px] min-h-[100px] flex flex-col justify-between z-10">
                  <div className="text-4xl font-bold text-[#304946] mb-2">2</div>
                  <p className=" font-livvic text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Add Wardrobe
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 ">
                    Save your clothing preferences for outfit suggestions.
                  </p>
                </div>
                <div className="absolute w-[300px] h-[300px] bg-[#304946] rounded-full shadow-md transition-all duration-300 ease-in-out group-hover:w-[350px] group-hover:h-[350px] group-hover:bg-[#304946] z-0" />
              </div>

              {/* Step 3 */}
              <div className="relative group flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow w-[200px] min-h-[100px] flex flex-col justify-between z-10">
                  <div className="text-4xl font-bold text-teal-600 mb-2">3</div>
                  <p className="font-livvic text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Get Outfit Ideas
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Receive weather-based outfit recommendations.
                  </p>
                </div>
                <div className="absolute w-[300px] h-[300px] bg-[#3F978F] rounded-full shadow-md transition-all duration-300 ease-in-out group-hover:w-[350px] group-hover:h-[350px] group-hover:bg-[#3F978F] z-0" />
              </div>
            </div>
          </div>

          {/* Footer now part of this section */}

        </div>
        <div className="w-full mt-32 -mb-32 bg-white dark:bg-gray-900">
          <Footer />
        </div>
      </section>

    </div>
  );
};

export default LandingPage;