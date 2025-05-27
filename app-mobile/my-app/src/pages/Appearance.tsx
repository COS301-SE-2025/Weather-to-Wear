// src/pages/Appearance.tsx

import React, { useState, useEffect } from "react";

const Appearance = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );

  useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  localStorage.setItem('theme', theme);
}, [theme]);


  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Appearance</h1>
      <p className="text-gray-600">Choose your preferred theme:</p>

      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => setTheme("light")}
          className={`p-6 border rounded-lg text-center transition ${
            theme === "light"
              ? "border-teal-500 bg-teal-50"
              : "hover:border-gray-400"
          }`}
        >
          <div className="h-24 mb-3 bg-gray-200 rounded" />
          <span className="block font-medium">Light Mode</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`p-6 border rounded-lg text-center transition ${
            theme === "dark"
              ? "border-teal-500 bg-gray-800"
              : "hover:border-gray-400"
          }`}
        >
          <div className="h-24 mb-3 bg-gray-900 rounded" />
          <span className="block font-medium text-white">Dark Mode</span>
        </button>
      </div>
    </div>
  );
};

export default Appearance;
