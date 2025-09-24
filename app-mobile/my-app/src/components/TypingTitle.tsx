import React, { useState, useEffect } from 'react';

interface TypingTitleProps {
  text: string;
  highlight?: string;
}

export default function TypingTitle({ text, highlight = '' }: TypingTitleProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isDeleting && currentIndex < text.length) {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      } else if (!isDeleting && currentIndex === text.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentIndex > 0) {
        setDisplayText((prev) => prev.slice(0, -1));
        setCurrentIndex((prev) => prev - 1);
        setTypingSpeed(75);
      } else {
        setIsDeleting(false);
        setTypingSpeed(150);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentIndex, isDeleting, typingSpeed]);

  const highlightStart = text.indexOf(highlight);
  const beforeHighlight = displayText.slice(0, highlightStart);
  const highlighted = displayText.slice(highlightStart, highlightStart + highlight.length);
  const afterHighlight = displayText.slice(highlightStart + highlight.length);

  return (
    <h1 className="text-black text-3xl sm:text-4xl mb-4 font-sephir tracking-wide text-center">
      {beforeHighlight}
      <span style={{ color: '#3F978F' }}>{highlighted}</span>
      {afterHighlight}
      <span className="animate-pulse">|</span>
    </h1>
  );
}
