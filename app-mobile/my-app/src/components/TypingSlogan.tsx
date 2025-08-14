import React, { useState, useEffect } from 'react';

interface TypingSloganProps {
  words?: string[];
  highlightWord?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDelay?: number;
}

const TypingSlogan: React.FC<TypingSloganProps> = ({
  words = ['Style', 'Simple'],
  highlightWord = 'Simple',
  typeSpeed = 100,
  deleteSpeed = 50,
  pauseDelay = 2000,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordCycleIndex, setWordCycleIndex] = useState(0);
  const [speed, setSpeed] = useState(typeSpeed);

  useEffect(() => {
    const handleTyping = () => {
      const target = words[wordCycleIndex];
      const combined = words.map((w, i) => (i === wordCycleIndex ? target : w)).join(' ');

      if (!isDeleting && currentIndex < combined.length) {
        setDisplayText(combined.slice(0, currentIndex + 1));
        setCurrentIndex(curr => curr + 1);
        setSpeed(typeSpeed);
      } else if (!isDeleting && currentIndex === combined.length) {
        setTimeout(() => setIsDeleting(true), pauseDelay);
      } else if (isDeleting && currentIndex > 0) {
        setDisplayText(combined.slice(0, currentIndex - 1));
        setCurrentIndex(curr => curr - 1);
        setSpeed(deleteSpeed);
      } else {
        setIsDeleting(false);
        setWordCycleIndex(idx => (idx + 1) % words.length);
      }
    };

    const timer = setTimeout(handleTyping, speed);
    return () => clearTimeout(timer);
  }, [currentIndex, isDeleting, speed, wordCycleIndex, words, typeSpeed, deleteSpeed, pauseDelay]);

  const start = displayText.indexOf(highlightWord);
  const before = start >= 0 ? displayText.slice(0, start) : displayText;
  const highlighted =
    start >= 0 ? displayText.slice(start, start + highlightWord.length) : '';
  const after = start >= 0 ? displayText.slice(start + highlightWord.length) : '';

  return (
    <h2
      className="
        relative z-[100]
        text-5xl sm:text-6xl font-bodoni font-light text-white 
        mb-6 tracking-wide text-left w-full
        whitespace-nowrap overflow-visible
      "
      style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.97)' }}
      aria-live="polite"
    >
      {before}
      {highlighted && <span className="text-[#3F978F]">{highlighted}</span>}
      {after}
      <span className="animate-pulse">|</span>
    </h2>
  );
};

export default TypingSlogan;
