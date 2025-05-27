// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bodoni: ['"Bodoni Moda"', 'serif'],
        livvic: ['"Livvic"', 'sans-serif'],
        sephir: ['Sephir', 'sans-serif'],   
      },
    },
  },
  plugins: [],
}
