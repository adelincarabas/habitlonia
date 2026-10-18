/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (not the default 'media'): on web, NativeWind watches <html class> and throws in
  // 'media' mode when something (e.g. a dark-mode browser extension) toggles it.
  // Token values live in global.css (:root / .dark:root); this only maps names to them.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: token('brand'), soft: token('brand-soft') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), faint: token('ink-faint') },
        surface: { DEFAULT: token('surface'), sunken: token('surface-sunken') },
      },
      fontFamily: {
        hand: ['Caveat_600SemiBold'],
      },
    },
  },
  plugins: [],
};
