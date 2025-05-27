// tailwind.config.js
module.exports = {
  darkMode: 'class',        // ← enable class-based dark mode
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bodoni: ['"Bodoni Moda"', 'serif'],
        livvic: ['"Livvic"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
