/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Geist"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Geist"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        micro: ['12px', { lineHeight: '1.35' }],
        body: ['13px', { lineHeight: '1.45' }],
        title: ['15px', { lineHeight: '1.35' }],
        heading: ['20px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        hero: ['30px', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
      },
    },
  },
  plugins: [],
};
