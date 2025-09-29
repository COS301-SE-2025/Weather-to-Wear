import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto w-full bg-white text-gray-600 border-t border-gray-200">
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {/* Copyright (centered) */}
        <div className="text-center text-sm">
          © {new Date().getFullYear()} GitGood. All rights reserved.
        </div>

        {/* Icons (centered under copyright) */}
        <div className="mt-3 flex justify-center gap-3">
          <a
            href="mailto:gitgood301@gmail.com"
            aria-label="Email"
            title="Email"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full
                       border border-gray-300 bg-white shadow-sm hover:bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition"
          >
            <Mail className="w-5 h-5" />
          </a>

          <a
            href="https://gitgood.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Website"
            title="Website"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full
                       border border-gray-300 bg-white shadow-sm hover:bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
