/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ff-bg': '#04100C',
        'ff-card': '#071A14',
        'ff-card-border': '#113324',
        'ff-primary': '#10B981',
        'ff-primary-glow': '#34D399',
        'ff-success': '#22C55E',
        'ff-warning': '#F59E0B',
        'ff-danger': '#EF4444',
        'ff-fire': '#EA580C',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
