/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ff-bg': '#0B1120',
        'ff-card': '#111827',
        'ff-card-border': '#1E293B',
        'ff-primary': '#2563EB',
        'ff-success': '#22C55E',
        'ff-warning': '#F59E0B',
        'ff-danger': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
