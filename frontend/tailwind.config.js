/** @type {import('tailwindcss').Config} */
// Colors and radii bridge to the Glasshouse tokens (src/glasshouse.css) so
// utilities re-theme with [data-theme]/[data-app]. Never hard-code brand hexes.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        b1: 'var(--b1)',
        b2: 'var(--b2)',
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        field: 'var(--field)',
        edge: { DEFAULT: 'var(--edge)', hi: 'var(--edge-hi)' },
        track: 'var(--track)',
        'brand-ink': 'var(--brand-ink)',
        'warn-ink': 'var(--warn-ink)',
        'danger-ink': 'var(--danger-ink)',
        'brand-tint': 'var(--brand-tint)',
        'warn-tint': 'var(--warn-bg)',
        'danger-tint': 'var(--danger-bg)',
        // Legacy — removed once all pages are converted (DoD §16)
        'sg-lime': '#84CC16',
        'sg-forest': '#15803D',
        neutral: {
          50: '#F9F9F9',
          100: '#F2F2F2',
          200: '#E5E5E5',
          500: '#737373',
          800: '#262626',
          950: '#0A0A0A',
        },
      },
      borderRadius: {
        panel: '22px',
        overlay: '26px',
        block: '16px',
        control: '12px',
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
