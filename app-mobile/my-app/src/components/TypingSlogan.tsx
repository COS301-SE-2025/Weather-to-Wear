import React, { useState, useEffect } from 'react';



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

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isDeleting && currentIndex <= fullText.length) {
      timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, currentIndex));
        setCurrentIndex(prev => prev + 1);
      }, typeSpeed);
    } else if (isDeleting && currentIndex > 0) {
      timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, currentIndex));
        setCurrentIndex(prev => prev - 1);
      }, deleteSpeed);
    } else {
      timer = setTimeout(() => setIsDeleting(!isDeleting), pauseDelay);
    }

    return () => clearTimeout(timer);
  }, [currentIndex, isDeleting]);

  const before = displayText.slice(0, breakIndex);
  const highlight = displayText.slice(breakIndex, breakIndex + 'Everyday.'.length);
  const after = displayText.slice(breakIndex + 'Everyday.'.length);

  return (
    <h2
      className="
        relative z-[100]
        text-5xl sm:text-6xl md:text-7xl font-bodoni font-light text-white 
        mb-6 tracking-wide text-left w-full
        whitespace-nowrap sm:whitespace-normal overflow-visible
      "
      style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.97)' }}
      aria-live="polite"
    >
      {/* Mobile: break line before 'Everyday.' */}
      <span className="inline sm:hidden">
        {before}
        {highlight && <><br /><span className="text-[#3F978F]">{highlight}</span></>}
      </span>

      {/* Desktop: one line */}
      <span className="hidden sm:inline">
        {before}
        <span className="text-[#3F978F]">{highlight}</span>
      </span>

      {after}
      <span className="animate-pulse">|</span>
    </h2>
  );
};

export default TypingSlogan;
