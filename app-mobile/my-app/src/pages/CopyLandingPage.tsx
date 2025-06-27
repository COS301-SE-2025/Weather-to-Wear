import { useState } from "react";
import { CloudSun, Shirt, Calendar, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from '../components/Footer';

const CopyLandingPage = () => {
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Weather2Wear</h1>
            <p className="text-gray-600">
              {showAuth === 'login' ? 'Welcome back!' : 'Join our community'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            {showAuth === 'login' ? (
              <div className="text-center">
                <p className="mb-4">Proceed to login page</p>
                <Link
                  to="/login"
                  className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-4">Proceed to registration page</p>
                <Link
                  to="/register"
                  className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Go to Register
                </Link>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setShowAuth(null)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 text-gray-900">
            Weather2Wear
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your personal weather-based clothing assistant. Never be caught off-guard by the weather again.
          </p>
          <div className="flex justify-center gap-4 mb-12">
            <Link
              to="/login"
              className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors text-lg"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="border-2 border-black text-black px-6 py-3 rounded-md hover:bg-gray-100 transition-colors text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>

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

        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-8 text-gray-900">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="bg-teal-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Your Clothes</h3>
              <p className="text-gray-600">Upload photos of your clothing items and organize them in your digital closet.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-teal-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Check Weather</h3>
              <p className="text-gray-600">Our app automatically checks the weather forecast for your location.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-teal-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Recommendations</h3>
              <p className="text-gray-600">Receive personalized outfit suggestions that match the weather perfectly.</p>
            </div>
          </div>
        </div>

        <div className="bg-black text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Never Worry About Weather Again?</h2>
          <p className="text-lg mb-8 text-gray-300">
            Join thousands of users who have revolutionized their daily outfit planning.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center bg-teal-500 text-white px-6 py-3 rounded-md hover:bg-teal-600 transition-colors text-lg"
          >
            Start Your Free Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CopyLandingPage;