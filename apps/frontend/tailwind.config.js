/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        office: {
          floor: '#f5e6d3',
          wall: '#e8d5c4',
          desk: '#c8a882',
          'desk-dark': '#a8845a',
          accent: '#7eb5a6',
          'accent-2': '#e8a598',
          'accent-3': '#b5c9e8',
        },
        pastel: {
          pink: '#ffd6e0',
          yellow: '#fff3b0',
          mint: '#b8f0e6',
          lavender: '#e6d6ff',
          peach: '#ffd6b8',
          sky: '#b8e0ff',
        },
      },
      fontFamily: {
        cute: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'typing': 'typing 0.8s steps(2) infinite',
        'think': 'think 1.5s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        typing: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        think: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
