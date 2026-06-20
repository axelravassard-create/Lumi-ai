/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
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
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.15), 0 20px 60px -15px rgba(79,70,229,0.35)',
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
