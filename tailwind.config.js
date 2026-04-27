/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brut: {
          bg: '#ede8df',
          paper: '#f7f4ef',
          white: '#ffffff',
          black: '#0d0d0d',
          red: '#c63320',
          'red-dark': '#952515',
          orange: '#d96a1c',
          amber: '#df9a10',
          green: '#1572b6',
          'green-dark': '#0e5590',
          blue: '#1572b6',
          hdr: '#0c2844',
          'hdr-dark': '#081a2c',
          sidebar: '#091520',
          'sidebar-light': '#0d2035',
        },
      },
      fontFamily: {
        display: ['Impact', 'Arial Black', 'sans-serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      boxShadow: {
        brut: '4px 4px 0px #0d0d0d',
        'brut-sm': '3px 3px 0px #0d0d0d',
        'brut-lg': '6px 6px 0px #0d0d0d',
        'brut-xl': '8px 8px 0px #0d0d0d',
        'brut-red': '4px 4px 0px #c63320',
        'brut-orange': '4px 4px 0px #d96a1c',
        'brut-green': '4px 4px 0px #0e5590',
        'brut-hdr': '4px 4px 0px #081a2c',
        'brut-inset': 'inset 3px 3px 0px rgba(0,0,0,0.15)',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
