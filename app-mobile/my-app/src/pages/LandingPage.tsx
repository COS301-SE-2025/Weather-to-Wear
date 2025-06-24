import React from "react";
import { Link } from "react-router-dom";
import { CloudSun, Shirt, Calendar, Users, ArrowRight } from "lucide-react";
import Footer from '../components/Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div
        className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-96 mb-6"
        style={{
          backgroundImage: `url(/hero.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
          marginLeft: 'calc(-50vw + 50%)',
          width: '100vw',
          marginTop: '-1rem'
        }}
      >
        <div className="px-8 py-4 border-2 border-white z-10 text-center">
          <h1
            className="text-4xl sm:text-5xl font-bodoni font-light text-white mb-4"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.97)'
            }}
          >
            Weather 2 Wear
          </h1>
          <p className="text-lg text-white mb-6">
            Your personal weather-based clothing assistant. Never be caught off-guard by the weather again.
          </p>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

        {/* What is Weather to Wear */}
       <section className="bg-gray-200 dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            What is Weather To Wear
          </h2>
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            
            
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
          Why Weather to Wear?
        </h2>
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Weather-Based Outfits
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get tailored clothing suggestions based on real-time weather data for your location.
            </p>
          </div>
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Personal Wardrobe
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Save your clothing preferences and build outfits from your own wardrobe.
            </p>
          </div>
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Event Planning
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Plan outfits for future events with weather forecasts up to 7 days ahead.
            </p>
          </div>
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Share Your Style
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Post your outfits to the Weather to Wear feed and inspire your friends.
            </p>
          </div> */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            How It Works
          </h2>
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-teal-600 mb-2">1</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Set Your Location
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Allow location access or enter your city manually in the dashboard.
              </p>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-teal-600 mb-2">2</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Add Your Wardrobe
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Save your clothing preferences to get personalized outfit suggestions.
              </p>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-teal-600 mb-2">3</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Get Outfit Ideas
              </h3>
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
          <Link
            to="/signup"
            className="inline-block bg-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;