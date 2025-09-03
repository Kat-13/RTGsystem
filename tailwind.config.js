/** @type {import('tailwindcss').Config} */ 
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'], // modern sans serif
        heading: ['Poppins', 'ui-sans-serif'], // clean for headers
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6', // primary blue
          600: '#2563eb',
          900: '#1e3a8a',
        },
        accent: {
          500: '#f43f5e', // rose/red accent
        },
      },
      borderRadius: {
        xl: '1rem', // softer modern look
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}

