import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto w-full bg-black text-white">
      <div className="max-w-screen-xl mx-auto px-6 py-12 md:py-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8">

          {/* Our Story Section - Left aligned */}
          <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-bodoni font-bold tracking-wide">
              Our Story
            </h3>
            <p className="text-gray-300 leading-relaxed max-w-md">
              We created Weather2Wear to simplify the daily challenge of choosing outfits.
              By curating styles based on live weather and personal taste, we aim to
              make fashion both effortless and expressive — no more morning guesswork.
            </p>
          </div>

          {/* Contact Section - Right aligned with icons only */}

        </div>

        {/* Icons centered above copyright */}
        <div className="mt-12 flex justify-center space-x-6">
          <a
            href="mailto:gitgood301@gmail.com"
            className="flex items-center justify-center bg-[#3F978F] hover:bg-[#2e6e67] transition-colors p-3 rounded-full w-12 h-12"
            aria-label="Email"
          >
            <Mail className="w-6 h-6 text-white" />
          </a>
          <a
            href="https://gitgood.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center bg-[#3F978F] hover:bg-[#2e6e67] transition-colors p-3 rounded-full w-12 h-12"
            aria-label="Website"
          >
            <ExternalLink className="w-6 h-6 text-white" />
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-gray-700 text-center text-gray-400">
          © {new Date().getFullYear()} GitGood. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
