/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sg-lime': '#84CC16',
        'sg-forest': '#15803D',
        // Neutral scale matched to SimpleTickets
        neutral: {
          50: '#F9F9F9',
          100: '#F2F2F2',
          200: '#E5E5E5',
          500: '#737373',
          800: '#262626',
          950: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
