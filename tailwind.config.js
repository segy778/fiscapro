/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sapin: {
          50: '#f0f5f2',
          100: '#d9e7df',
          600: '#2f6b4f',
          700: '#24543f',
          800: '#1c4131',
        },
        ardoise: {
          50: '#f7f8f9',
          100: '#eef0f2',
          200: '#dde1e5',
          500: '#697483',
          700: '#3b434d',
          900: '#1d2228',
        },
        ambre: {
          50: '#fdf6ec',
          500: '#c2871d',
          700: '#8a5e12',
        },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
