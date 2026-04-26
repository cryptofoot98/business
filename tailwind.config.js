/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brut: {
          bg: '#EEF4F8',
          paper: '#FFFFFF',
          white: '#FFFFFF',
          black: '#1B3080',
          red: '#3DB240',
          'red-dark': '#2D9632',
          orange: '#5DC258',
          amber: '#4AB446',
          green: '#3DB240',
          'green-dark': '#2D9632',
          blue: '#1B3080',
          hdr: '#0A1628',
          'hdr-dark': '#060E1A',
          sidebar: '#0A1628',
          'sidebar-light': '#122040',
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        brut: '0 4px 24px rgba(10,22,40,0.10)',
        'brut-sm': '0 2px 8px rgba(10,22,40,0.07)',
        'brut-lg': '0 8px 40px rgba(10,22,40,0.14)',
        'brut-xl': '0 16px 64px rgba(10,22,40,0.20)',
        'brut-red': '0 0 0 3px rgba(61,178,64,0.28)',
        'brut-orange': '0 4px 20px rgba(61,178,64,0.28)',
        'brut-green': '0 4px 20px rgba(61,178,64,0.28)',
        'brut-hdr': '0 4px 24px rgba(6,14,26,0.40)',
        'brut-inset': 'inset 0 1px 3px rgba(0,0,0,0.10)',
        glass: '0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-lg': '0 16px 64px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.14)',
        'glass-green': '0 8px 32px rgba(61,178,64,0.32)',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
