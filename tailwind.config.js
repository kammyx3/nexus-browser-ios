/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#0a0f1e',
          surface: '#121828',
          card: '#1a2440',
          border: '#1e2d4a',
          accent: '#e94560',
          'accent-hover': '#c73650',
          muted: '#505070',
          text: '#e0e0e0',
          'text-dim': '#8080a0',
          'text-bright': '#ffffff',
          link: '#6ab0ff',
          success: '#2ecc71',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
