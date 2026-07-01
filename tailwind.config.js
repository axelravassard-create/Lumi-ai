/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['"Sora Variable"', 'Sora', '"Manrope Variable"', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#d6dae9',
          300: '#b2bad3',
          400: '#8893b8',
          500: '#67719d',
          600: '#525a82',
          700: '#434a6a',
          800: '#3a3f59',
          900: '#1c2033',
          950: '#0e1020',
        },
        // Bleu azur — rappelle la couleur des yeux du personnage (cyan #1aa8ff),
        // avec des nuances profondes (600/700) pour un rendu pro et lisible.
        brand: {
          50: '#eff7ff',
          100: '#dbedfe',
          200: '#b6dbff',
          300: '#7cc0ff',
          400: '#3aa0fb',
          500: '#1583ef',
          600: '#0668d6',
          700: '#0a53ad',
          800: '#0e478c',
          900: '#123c73',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(21,131,239,0.15), 0 20px 60px -15px rgba(6,104,214,0.35)',
        card: '0 1px 2px rgba(16,16,32,0.04), 0 12px 40px -18px rgba(16,16,32,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.8s ease both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
