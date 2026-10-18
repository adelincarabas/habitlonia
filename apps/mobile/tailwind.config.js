/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (not the default 'media'): on web, NativeWind watches <html class> and throws in
  // 'media' mode when something (e.g. a dark-mode browser extension) toggles it.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2B4BDB', soft: '#E9EDFC' },
        ink: { DEFAULT: '#1B1B1F', muted: '#8A8A93', faint: '#B9B9C0' },
        surface: { DEFAULT: '#FFFFFF', sunken: '#F6F6F8' },
      },
      fontFamily: {
        hand: ['Caveat_600SemiBold'],
      },
    },
  },
  plugins: [],
};
