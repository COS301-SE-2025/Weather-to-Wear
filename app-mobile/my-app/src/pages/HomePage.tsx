import { Sun, CloudSun } from 'lucide-react';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import WeatherDisplay from '../components/WeatherDisplay';
import HourlyForecast from '../components/HourlyForecast';
import { useWeather } from '../hooks/useWeather';
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
            className="flex justify-center items-center group" // Added group class
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
              } ${
                starValue <= hover 
                  ? 'transform scale-110' // Scales up 10% on hover
                  : ''
              }`}
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
        setTimeout(() => setIsDeleting(true), 30000);
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


  // Add this component near the top of your file (or in a separate file if preferred)

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

  const { weather, loading, error } = useWeather();

  return (


    
    <div className="flex flex-col min-h-screen bg-white">

                  <div 
   className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-64 mb-6 z-0"
      style={{
        backgroundImage: `url(/background.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
          marginLeft: 'calc(-50vw + 50%)', // This centers the full-width element
        width: '100vw',
         marginTop: '-4rem'
      }}
    >
<div className="px-6 py-2 border-2 border-white z-10">
  <h1 
    className="text-2xl font-bodoni font-light text-center text-white"
    style={{
     // fontFamily: "'Bodoni Moda', serif",
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    }}
  >
    WELCOME BACK [user]
  </h1>
</div>


      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
    </div>
      {/* Main content area with improved spacing */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 gap-8 mt-24 md:mt-28 z-10">

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

              

              {weather && (
  <>
                  <WeatherDisplay />
                  <HourlyForecast forecast={weather.forecast} />
                </>
)}


          
            </div>
          </div>
        </div>

{/* Center Image Section */}
<div className="w-full lg:w-1/3 flex flex-col items-center mb-8 lg:mb-0 lg:-mt-24"> {/* Increased negative margin */}
  <div className="w-full max-w-xs sm:max-w-sm md:max-w-[350px] lg:max-w-[350px]">
    

    <div className="flex justify-center">
<div className="inline-block py-1 px-3 border-2 border-black z-10 mx-auto">
  <h1 
    className="text-xl font-normal text-center text-black"
    style={{
      // fontFamily: "'Bodoni Moda', serif",
      // textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    }}
  >
    OUTFIT OF THE DAY
  </h1>
</div>
</div>


    
    
    
    <div className="mt-6 bg-gray-200 rounded-xl md:rounded-2xl lg:rounded-3xl overflow-hidden aspect-[3/4] h-auto max-h-[500px]">
      <img 
        src="/outfit.jpg" 
        alt="Selected outfit" 
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = '/placeholder-outfit.jpg';
          e.currentTarget.alt = 'Outfit placeholder';
        }}
      />
    </div>
    <StarRating  /> {/* Added small margin-top */}
  </div>
</div>

        {/* Right Events Section */}
        <div className="w-full lg:w-1/3 flex justify-center mt-0 lg:-mt-20">
          <div className="relative w-full max-w-[280px]">
            {/* Arch Border */}
            {/* <div className="absolute inset-0 border-[2px] border-black rounded-tl-full rounded-tr-full h-full -top-[4%] pointer-events-none"></div> */}


{/* Teal shadow arch */}
<div
  className="absolute rounded-tl-full rounded-tr-full h-full pointer-events-none"
  style={{
    backgroundColor: '#3F978F',
    // top: '0.5%',         // shift down a bit
    left: '5%',        // shift right a bit (adjust as needed)
    right: '-5%',      // allow it to stick out to the right beyond container
    bottom: '0',
    zIndex: 0,
    position: 'absolute',
    border: 'none',
  }}
></div>

{/* Main arch */}
<div
  className="absolute inset-0 rounded-tl-full rounded-tr-full h-full pointer-events-none"
  style={{
    backgroundColor: 'white',
    border: '2px solid black',
    top: '-4%',
    left: '0',
    zIndex: 10,
    position: 'absolute',
  }}
></div>


            {/* Content */}
            <div className="relative z-10 pt-10 pb-6 px-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-regular text-center mb-6 md:mb-8">Upcoming Events</h2>
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
                  <div 
   className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-48 mb-0"
      style={{
        backgroundImage: `url(/header.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
          marginLeft: 'calc(-50vw + 50%)', // This centers the full-width element
        width: '100vw',
         marginTop: '2rem'
      }}
    >



      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
    </div>
      <Footer />
    </div>
  );
}