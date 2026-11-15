/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Silkscreen"', '"Press Start 2P"', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        retro: {
          bg: '#0f1219',
          panel: '#171c28',
          panelAlt: '#1e2536',
          border: '#333f58',
          borderBright: '#52658c',
          accent: '#f59e0b',
          cyan: '#06b6d4',
          green: '#10b981',
          red: '#ef4444',
          purple: '#8b5cf6',
          text: '#f1f5f9',
          muted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
};
