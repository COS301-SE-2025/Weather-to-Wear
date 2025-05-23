import { Sun, CloudSun } from 'lucide-react';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import WeatherNow from '../components/WeatherNow';

const TypingSlogan = () => {
  const slogan = "Style Made Simple.";
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isDeleting && currentIndex < slogan.length) {
        setDisplayText(prev => prev + slogan[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      } else if (!isDeleting && currentIndex === slogan.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentIndex > 0) {
        setDisplayText(prev => prev.slice(0, -1));
        setCurrentIndex(prev => prev - 1);
        setTypingSpeed(75);
      } else {
        setIsDeleting(false);
        setTypingSpeed(150);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentIndex, isDeleting, typingSpeed]);

  const simpleStart = slogan.indexOf("Simple");
  const beforeSimple = displayText.slice(0, simpleStart);
  const simplePart = displayText.slice(simpleStart, simpleStart + 7);
  const afterSimple = displayText.slice(simpleStart + 7);

  return (
    <h2 className="text-5xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-10 font-bodoni tracking-wide text-left w-full">
      {beforeSimple}
      <span style={{ color: '#3F978F' }}>{simplePart}</span>
      {afterSimple}
      <span className="animate-pulse">|</span>
    </h2>
  );
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Main content area with improved spacing */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 gap-8 mt-24 md:mt-20">
        
        {/* Left Weather Section */}
        <div className="w-full lg:w-1/3 flex flex-col items-center mb-8 lg:mb-0">
          <div className="w-full max-w-[280px]">
            <div className="h-[4rem] md:h-[5rem] lg:h-[5.5rem] w-full flex items-end">
              <TypingSlogan />
            </div>
            
            <div className="w-full">

             
              {/* <div className="flex items-center space-x-2 md:space-x-4 text-3xl md:text-5xl font-bold mb-6 md:mb-10">
                <CloudSun className="w-12 h-12 md:w-16 md:h-16" />
                <span>22°</span>
                <span className="text-xl md:text-2xl text-gray-600 font-normal">cloudy</span>
              </div> */}

              <WeatherNow />

              <div className="divide-y divide-black">
                {[
                  { time: '09:00', temp: '24°', desc: 'sunny' },
                  { time: '10:00', temp: '24°', desc: 'sunny' },
                  { time: '11:00', temp: '24°', desc: 'sunny' },
                  { time: '12:00', temp: '24°', desc: 'sunny' },
                ].map((hour, idx) => (
                  <div key={idx} className="flex justify-between text-base md:text-lg py-2">
                    <span>{hour.time}</span>
                    <span className="flex gap-1 md:gap-2">
                      <span className="font-medium">{hour.temp}</span>
                      <span className="text-gray-600">{hour.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center Image Section */}
        <div className="w-full lg:w-1/3 flex justify-center items-center mb-8 lg:mb-0 lg:-mt-32">
<div className="w-full max-w-xs sm:max-w-sm md:max-w-[350px] lg:max-w-[400px] bg-gray-200 rounded-xl md:rounded-2xl lg:rounded-3xl overflow-hidden">
  <img 
    src="/outfit.jpg" 
    alt="Selected outfit" 
    className="w-full h-auto object-contain aspect-[3/4]" // Custom ratio like portrait
    onError={(e) => {
      e.currentTarget.src = '/placeholder-outfit.jpg';
      e.currentTarget.alt = 'Outfit placeholder';
    }}
  />
</div>

        </div>

        {/* Right Events Section */}
        <div className="w-full lg:w-1/3 flex justify-center mt-0 lg:-mt-10">
          <div className="relative w-full max-w-[280px]">
            {/* Arch Border */}
            <div className="absolute inset-0 border border-black rounded-tl-full rounded-tr-full h-full -top-[4%] pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10 pt-10 pb-6 px-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-6 md:mb-8">Upcoming Events</h2>
              <div className="space-y-2 md:space-y-3">
                {[
                  { date: '30 December', label: "Kyle's Birthday" },
                  { date: '21 May', label: '21st birthday' },
                  { date: '3 June', label: 'Random Day' },
                  { date: '4 November', label: "Diya's Birthday" },
                ].map((event, idx) => (
                  <div key={idx}>
                    {idx !== 0 && <hr className="border-black" />}
                    <div className="flex justify-between text-base md:text-lg py-1 md:py-2">
                      <span className="font-semibold">{event.date}</span>
                      <span className="text-gray-600">{event.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
      </div>

      <Footer />
    </div>
  );
}
