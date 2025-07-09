import React, { useState } from "react";
import Footer from '../components/Footer';

const HelpPage = () => {
  const [openSection, setOpenSection] = useState<number | null>(null);

  const toggleSection = (section: number) => {
    setOpenSection(openSection === section ? null : section);
  };

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What is Weather to Wear?",
          answer: "Weather to Wear is an app that suggests clothing and accessories based on your local weather forecast, personal style preferences, and planned events."
        },
        {
          question: "Do I need to create an account to use Weather to Wear?",
          answer: "Yes, you do need an account to use Weather to Wear, this allows the app to save your clothing preferences according to the outfits in your personal wardrobe. This also allows you to post your outfits for friends to see through the Weather to Wear feed."
        },
        {
          question: "How do I input my location?",
          answer: "Allow location access when prompted, or manually enter your city in the dashboard. You can manually change your location in the user profile section of the app."
        }
      ]
    },
    {
      category: "Using the App",
      questions: [
        {
          question: "How does Weather to Wear get my local weather?",
          answer: "The app uses your device’s location services or a manually entered location to fetch real-time weather data from a trusted weather API. Ensure location permissions are enabled."
        },
        {
          question: "Can I use Weather to Wear for future dates?",
          answer: "Yes, select the calendar feature and add an event. An event will prompt you to add details of the event, such as the location and time, and allow you to add a preplanned outfit for that upcoming event."
        },
        {
          question: "What if the weather changes during the day?",
          answer: "The app provides layered clothing suggestions to adapt to changing conditions. Check the hourly forecast feature for detailed recommendations."
        }
      ]
    },
    {
      category: "Customization",
      questions: [
        {
          question: "How does the app decide what clothes to recommend?",
          answer: "Outfit recommendations are based on weather conditions (temperature, precipitation, wind) and your personal style preferences set in the app."
        },
        {
          question: "Can I customize my clothing preferences?",
          answer: "Yes, go to the settings menu to adjust preferences like clothing style and color choices."
        },
        {
          question: "Why are the clothing suggestions not matching my style?",
          answer: "Ensure your style preferences are updated in settings. If issues persist, try resetting your profile or contacting support."
        }
      ]
    },
    {
      category: "Troubleshooting & Support",
      questions: [
        {
          question: "What should I do if the app isn’t working properly?",
          answer: "Try refreshing the app, checking your internet connection, or updating to the latest version. If the issue persists, contact support at gitgood301@gmail.com."
        },
        {
          question: "How accurate are the weather forecasts?",
          answer: "We use data from a reliable weather API, but accuracy may vary based on location and weather patterns."
        },
        {
          question: "Is my data safe with Weather to Wear?",
          answer: "We prioritize your privacy. Location and preference data are securely stored and only used to improve your experience. See our Privacy Policy for details."
        },
        {
          question: "How do I contact support?",
          answer: "Reach out via our email gitgood301@gmail.com."
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Header Section */}
      <div
        className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-64 mb-6"
        style={{
          backgroundImage: `url(/header.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
          marginLeft: 'calc(-50vw + 50%)',
          width: '100vw',
          marginTop: '-1rem'
        }}
      >
        <div className="px-6 py-2 border-2 border-white z-10">
          <h1
            className="text-2xl font-bodoni font-light text-center text-white"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            HELP PAGE
          </h1>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 min-h-[800px]">
        <h1 className="text-3xl font-sephir font-bold text-gray-900 dark:text-white text-center mb-6">
          Weather to Wear Help Center
        </h1>
        <p className="text-gray-700 dark:text-gray-300 text-center mb-8">
          Welcome to the Weather to Wear Help Center. Below is a video tutorial on how to use Weather to Wear.
        </p>

        {/* Video Section */}
        <div className="mb-8">
          <video
            className="w-full rounded-lg shadow-md"
            controls
            poster="/path/to/poster-image.jpg"
          >
            <source src="DEMO1_VIDEO.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <p className="text-gray-700 dark:text-gray-300 text-center mb-8">
          Below you can find answers to frequently asked questions about the Weather to Wear platform.
        </p>

        {/* FAQ Sections */}
        {faqData.map((section, index) => (
          <div key={index} className="mb-4">
            <button
              onClick={() => toggleSection(index)}
              className="w-full text-left bg-stone-200 dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center hover:bg-gray-300 dark:hover:bg-gray-700 transition md-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {section.category}
              </h2>
              <span className="text-gray-600 dark:text-gray-400">
                {openSection === index ? "−" : "+"}
              </span>
            </button>
            {openSection === index && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-b-lg shadow-md">
                {section.questions.map((faq, qIndex) => (
                  <div key={qIndex} className="mb-4 last:mb-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
};

export default HelpPage;