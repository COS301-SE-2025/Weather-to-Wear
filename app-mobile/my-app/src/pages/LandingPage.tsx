import Footer from "../components/Footer";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TypingSlogan from "../components/TypingSlogan";
import { motion, AnimatePresence } from "framer-motion";

const LandingPage: React.FC = () => {
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTextVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const testimonials = [
    { id: 1, quote: "Weather to Wear has simplified my mornings. I get dressed quickly without checking multiple apps.", author: "Alisha P.", role: "Weather To Wear user", image: "/test1.jpg" },
    { id: 2, quote: "I love how it blends weather forecasts with my wardrobe. Feels like having a personal stylist!", author: "Diya B.", role: "Weather To Wear user", image: "/test2.jpg" },
    { id: 3, quote: "This app helps me rotate my outfits better. No more repeating the same jacket twice in one week.", author: "Kyle L.", role: "Weather To Wear user", image: "/test4.jpg" },
    { id: 4, quote: "It’s the perfect combo of fashion and function. Even my friends started noticing I dress better.", author: "Taylor S.", role: "Weather To Wear user", image: "/test3.jpg" },
    { id: 5, quote: "Hands down, my favorite app of the year. Simple, clean interface and very practical.", author: "Bemo S.", role: "Weather To Wear user", image: "/test5.png" },
  ];
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const nextTestimonial = () => setCurrentTestimonial((p) => (p + 1) % testimonials.length);
  const prevTestimonial = () => setCurrentTestimonial((p) => (p - 1 + testimonials.length) % testimonials.length);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 overflow-x-hidden">
      {/* Top Banner */}
      <div className="bg-black dark:bg-gray-800 text-white py-2 px-4 lg:sticky lg:top-0 lg:z-50">
        <div className="max-w-screen-xl mx-auto flex items-center justify-center">
          <img src="/logo.png" alt="WeatherToWear logo" className="h-9 w-auto" loading="lazy" />
          <h1 className="ml-3 text-xl sm:text-2xl md:text-4xl font-sephir font-semibold tracking-tight">
            WeatherToWear
          </h1>
        </div>
      </div>

      {/* Hero */}
      <section className="relative flex flex-col lg:flex-row items-center lg:justify-between bg-black py-6 lg:py-10">
        {/* Text */}
        <div className="relative z-20 px-4 sm:px-8 lg:px-16 max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
          <TypingSlogan />
          <p className="mt-3 text-base sm:text-lg lg:text-xl text-white">
            Your personal weather-based clothing assistant.
          </p>
          <div className="mt-5 flex justify-center lg:justify-start gap-3">
            <Link to="/signup" className="px-5 py-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black transition">
              Sign Up
            </Link>
            <Link to="/login" className="px-5 py-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black transition">
              Log In
            </Link>
          </div>
        </div>

        {/* Decorative circle (hide on mobile) */}
        <div className="hidden lg:block absolute top-0 right-20 h-56 w-56 bg-teal-800 rounded-full translate-x-1/4 -translate-y-1/4" />

        {/* Image */}
        <div className="w-full lg:w-1/3 flex justify-center lg:justify-end mt-6 lg:mt-0 pr-4 sm:pr-8 lg:pr-16 relative z-10">
          <div className="w-52 sm:w-64 lg:w-72 max-w-[280px]">
            <img
              src="/LPcloset.jpg"
              alt="Closet preview"
              className="w-full h-auto object-cover rounded-tl-[9999px] rounded-tr-[9999px] shadow-md"
            />
          </div>
        </div>
      </section>

      {/* What is W2W */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-12 sm:py-14 lg:py-16 lg:sticky lg:top-0 lg:z-20"
        style={{ backgroundImage: "url('/header.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block px-5 py-2 border-2 border-white rounded mb-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bodoni font-light text-white">What is Weather To Wear?</h2>
          </div>
          <p
            className={`text-base sm:text-lg text-white leading-relaxed transition duration-700 ease-out
            ${textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
          >
            Weather to Wear is your ultimate companion for dressing smartly based on real-time weather,
            your personal wardrobe, and upcoming events. We simplify forecasts into a personalized wardrobe
            consultant so you always step out confident and weather‑ready.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 sm:py-16 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 lg:sticky lg:top-0 lg:z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4">
            <div className="inline-block relative group">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bodoni font-light text-black dark:text-white">Features</h2>
              <span className="absolute left-1/2 -bottom-1 w-0 h-[2px] bg-black dark:bg-white group-hover:left-0 group-hover:w-full transition-all duration-300" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to look and feel great in any weather.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { img: "/clouds.jpg", title: "Weather Integration", description: "Real-time weather insights plus AI-driven outfit recs for every forecast." },
              { img: "/closet.jpg", title: "Smart Closet", description: "Digitally organize your wardrobe and get perfect combos in a tap." },
              { img: "/planning.jpg", title: "Outfit Planning", description: "Plan your week’s looks in advance with seamless calendar sync." },
              { img: "/community.jpg", title: "Style Community", description: "Share your looks, get feedback, and inspire fellow fashion-lovers." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 sm:p-8 flex flex-col items-center text-center hover:shadow-lg transition"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-transparent opacity-20 rounded-3xl pointer-events-none" />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-5">
                  <img src={feature.img} alt={feature.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="relative text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="relative text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-stone-200 w-full py-12 sm:py-16 lg:sticky lg:top-0 lg:z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-4">
            <div className="inline-block relative group">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bodoni font-light text-black">Testimonials</h2>
              <span className="absolute left-1/2 -bottom-1 w-0 h-[2px] bg-black group-hover:left-0 group-hover:w-full transition-all duration-300" />
            </div>
          </div>
          <p className="mt-2 sm:mt-4 mb-4 text-base sm:text-lg text-gray-700 max-w-2xl mx-auto">
            Our main goal is to make your life easier and more stylish. Here’s what our users say:
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 rounded-lg p-5 sm:p-6 bg-white shadow-md"
            >
              <div className="w-full sm:w-1/3 flex justify-center">
                <img
                  src={testimonials[currentTestimonial].image}
                  alt="Testimonial outfit"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full object-cover"
                />
              </div>
              <div className="w-full sm:w-2/3">
                <p className="text-gray-700 text-base sm:text-lg mb-3">
                  “{testimonials[currentTestimonial].quote}”
                </p>
                <p className="text-gray-900 font-semibold">
                  {testimonials[currentTestimonial].author}
                </p>
                <p className="text-gray-600 text-sm">
                  {testimonials[currentTestimonial].role}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center mt-5 gap-3">
            <button
              onClick={prevTestimonial}
              className="p-2 rounded-full bg-white shadow hover:shadow-md text-gray-700"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={nextTestimonial}
              className="p-2 rounded-full bg-white shadow hover:shadow-md text-gray-700"
              aria-label="Next testimonial"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-white dark:bg-gray-800 lg:sticky lg:top-0 lg:z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-4">
            <div className="inline-block relative group">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bodoni font-light text-black dark:text-white">
                How It Works
              </h2>
              <span className="absolute left-1/2 -bottom-1 w-0 h-[2px] bg-black dark:bg-white group-hover:left-0 group-hover:w-full transition-all duration-300" />
            </div>
          </div>
          <p className="text-center mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Confused about how to get started? Here’s a quick guide:
          </p>

          <div className="relative mt-10 sm:mt-14">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
              {[
                { n: "1", color: "#3F978F", title: "Set Your Location", text: "Allow location access or enter your city." },
                { n: "2", color: "#304946", title: "Add Wardrobe", text: "Save your clothing items for suggestions." },
                { n: "3", color: "#3F978F", title: "Get Outfit Ideas", text: "Receive weather-based outfit recommendations." },
              ].map((s) => (
                <div key={s.n} className="relative group flex items-center justify-center">
                  {/* hide circle on mobile to avoid overlap */}
                  <div className="hidden sm:block absolute w-[240px] h-[240px] rounded-full shadow-md transition-all duration-300 -z-0"
                       style={{ backgroundColor: s.color }} />
                  <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-md p-5 text-center hover:shadow-lg transition z-10 w-[220px]">
                    <div className="text-3xl sm:text-4xl font-bold" style={{ color: s.color }}>{s.n}</div>
                    <p className="text-lg font-semibold font-livvic text-gray-900 dark:text-white mt-1">{s.title}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full mt-14">
            <Footer />
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
