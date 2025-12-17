// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        glass: {
          stroke: 'rgba(255, 255, 255, 0.15)', // Glowing edge
          surface: 'rgba(255, 255, 255, 0.05)', // Frosted bg
          text: 'rgba(255, 255, 255, 0.8)', // 80% opacity text
        },
        brand: {
          dark: '#05050A', // Deep black/blue background
          primary: '#6C5DD3', // Purple
          secondary: '#3F8CFF', // Blue
          accent: '#FF754C', // Orange for warnings/timers
        }
      }
    },
  },
  plugins: [],
}