// import React from "react";
// import { Link } from "react-router-dom";
// import Footer from '../components/Footer';

// const CopyLandingPage: React.FC = () => {
//   return (
//     <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
//       {/* Hero Section */}
//       <div
//         className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-96 mb-6"
//         style={{
//           backgroundImage: `url(/hero.jpg)`,
//           backgroundSize: 'cover',
//           backgroundPosition: 'center',
//           opacity: 1,
//           marginLeft: 'calc(-50vw + 50%)',
//           width: '100vw',
//           marginTop: '-1rem'
//         }}
//       >
//         <div className="px-8 py-4 border-2 border-white z-10 text-center">
//           <h1
//             className="text-4xl sm:text-5xl font-bodoni font-light text-white mb-4"
//             style={{
//               textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
//             }}
//           >
//             Dress Smart, Weather Ready
//           </h1>
//           <p className="text-lg text-white mb-6">
//             Personalized outfits based on your local weather and style.
//           </p>
//           <Link
//             to="/signup"
//             className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
//           >
//             Get Started
//           </Link>
//         </div>
//         <div className="absolute inset-0 bg-black bg-opacity-30"></div>
//       </div>

//       {/* Features Section */}
//       <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
//         <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
//           Why Weather to Wear?
//         </h2>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
//           <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
//             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
//               Weather-Based Outfits
//             </h3>
//             <p className="text-gray-600 dark:text-gray-400">
//               Get tailored clothing suggestions based on real-time weather data for your location.
//             </p>
//           </div>
//           <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
//             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
//               Personal Wardrobe
//             </h3>
//             <p className="text-gray-600 dark:text-gray-400">
//               Save your clothing preferences and build outfits from your own wardrobe.
//             </p>
//           </div>
//           <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
//             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
//               Event Planning
//             </h3>
//             <p className="text-gray-600 dark:text-gray-400">
//               Plan outfits for future events with weather forecasts up to 7 days ahead.
//             </p>
//           </div>
//           <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
//             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
//               Share Your Style
//             </h3>
//             <p className="text-gray-600 dark:text-gray-400">
//               Post your outfits to the Weather to Wear feed and inspire your friends.
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* How It Works Section */}
//       <section className="bg-gray-200 dark:bg-gray-800 py-16">
//         <div className="max-w-3xl mx-auto px-4 sm:px-6">
//           <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
//             How It Works
//           </h2>
//           <div className="flex flex-col sm:flex-row justify-between gap-6">
//             <div className="text-center flex-1">
//               <div className="text-4xl font-bold text-blue-600 mb-2">1</div>
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
//                 Set Your Location
//               </h3>
//               <p className="text-gray-600 dark:text-gray-400">
//                 Allow location access or enter your city manually in the dashboard.
//               </p>
//             </div>
//             <div className="text-center flex-1">
//               <div className="text-4xl font-bold text-blue-600 mb-2">2</div>
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
//                 Add Your Wardrobe
//               </h3>
//               <p className="text-gray-600 dark:text-gray-400">
//                 Save your clothing preferences to get personalized outfit suggestions.
//               </p>
//             </div>
//             <div className="text-center flex-1">
//               <div className="text-4xl font-bold text-blue-600 mb-2">3</div>
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
//                 Get Outfit Ideas
//               </h3>
//               <p className="text-gray-600 dark:text-gray-400">
//                 Receive weather-based outfit recommendations tailored to your style.
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Testimonials Section */}
//       <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
//         <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
//           What Our Users Say
//         </h2>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
//           <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
//             <p className="text-gray-600 dark:text-gray-400 italic mb-4">
//               "Weather to Wear makes getting dressed so easy! I love how it matches my style to the forecast."
//             </p>
//             <p className="text-gray-900 dark:text-white font-semibold">
//               - Sarah K.
//             </p>
//           </div>
//           <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
//             <p className="text-gray-600 dark:text-gray-400 italic mb-4">
//               "Planning outfits for my trips is a breeze with the event feature. Highly recommend!"
//             </p>
//             <p className="text-gray-900 dark:text-white font-semibold">
//               - James T.
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="bg-blue-100 dark:bg-blue-900 py-16">
//         <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
//           <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
//             Ready to Dress for the Weather?
//           </h2>
//           <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
//             Join Weather to Wear today and simplify your daily outfit choices.
//           </p>
//           <Link
//             to="/signup"
//             className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
//           >
//             Sign Up Now
//           </Link>
//         </div>
//       </section>

//       <Footer />
//     </div>
//   );
// };

// export default CopyLandingPage;

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