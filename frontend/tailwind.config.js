/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'biat': {
          primary: '#134a21',     // Dark Teal/Green - Main brand color
          secondary: '#012c2e',   // Dark Navy - Secondary elements
          accent: '#1a6b2e',      // Lighter teal for highlights
          light: '#2d8a45',       // Light green for hover states
          50: '#f0f9f3',
          100: '#d9f0e1',
          200: '#b6e3c7',
          300: '#87d0a5',
          400: '#56b87f',
          500: '#2d8a45',
          600: '#1a6b2e',
          700: '#134a21',
          800: '#012c2e',
          900: '#001a1c',
        },
      },
    },
  },
  plugins: [],
}
