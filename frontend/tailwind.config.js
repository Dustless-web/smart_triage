/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        // The Enterprise Health-Tech Palette
        'ctp-base': '#030712',    // Ultra-deep Navy/Black (Main Background)
        'ctp-mantle': '#111827',  // Elevated Card Background (Slightly lighter)
        'ctp-text': '#f9fafb',    // Crisp, readable white text
        
        // The Intuitive Medical Accents
        'ctp-mauve': '#405b86',   // Medical Blue -> Used for Trauma Unit & Main Buttons
        'ctp-peach': '#f43f5e',   // Pulse Rose -> Used for Cardiology
        'ctp-teal': '#10b981',    // Clinical Emerald -> Used for General Queue
        
        // System Alerts
        'ctp-red': '#ef4444',     // Critical Risk / Fatigue Alert
        'ctp-blue': '#8b5cf6',    // Violet accent for secondary UI elements
      }
    },
  },
  plugins: [],
}