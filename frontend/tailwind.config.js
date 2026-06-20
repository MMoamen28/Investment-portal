/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          50:  '#e8eef6',
          100: '#c5d4e8',
          500: '#3d6fb3',
          700: '#1e3a5f',
          900: '#0d1e35',
        },
        accent: {
          DEFAULT: '#c9a84c',
          light:   '#e2c97a',
          dark:    '#a07a28',
        },
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
