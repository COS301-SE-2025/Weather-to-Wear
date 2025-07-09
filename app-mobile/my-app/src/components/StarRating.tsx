// src/components/StarRating.tsx
import React, { useState } from 'react';

interface StarRatingProps {
  disabled?: boolean;
  onSelect: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ disabled = false, onSelect }) => {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="w-full grid grid-cols-5 gap-1 mt-4 mb-8 px-2">
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hover || selected);
        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            className="flex justify-center items-center"
            onClick={() => {
              setSelected(starValue);
              onSelect(starValue);
            }}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-10 h-10 transition-transform duration-200 ease-in-out ${isFilled ? 'text-[#3F978F]' : 'text-black'
                } ${starValue <= hover ? 'transform scale-110' : ''}`}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
