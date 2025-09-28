/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          light: '#ffffff',
          dark: '#05070b'
        },
        brand: {
          50: '#eef2ff',
          500: '#4f59ff',
          600: '#3943f8'
        }
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0,0,0,0.05),0 1px 3px 1px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
}