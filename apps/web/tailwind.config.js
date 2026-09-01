/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'system-ui', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'Vazirmatn', 'monospace'],
      },
      colors: {
        ink: 'rgb(var(--bg) / <alpha-value>)',
        soft: 'rgb(var(--bg-soft) / <alpha-value>)',
        cream: 'rgb(var(--text) / <alpha-value>)',
        rose2: '#f472b6',
        purple2: '#a78bfa',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(244,114,182,0.35)',
        card: '0 8px 32px -8px rgba(0,0,0,0.45)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseSoft: { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite',
        pulseSoft: 'pulseSoft 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
