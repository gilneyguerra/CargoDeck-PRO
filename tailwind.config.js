/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#001F3F',
          dark: '#001326',
          light: '#002d5c',
        },
        emerald: {
          DEFAULT: '#00A884',
          glow: '#00ffc8',
        },
        cyan: {
          neon: '#00FFCC',
        },
        grey: {
          900: '#0A0A0A',
          500: '#757575',
          50: '#F9F9F9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'scan-line': 'scan 3s linear infinite',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 255, 204, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 255, 204, 0.8)' },
        }
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 255, 204, 0.5)',
        'emerald': '0 0 15px rgba(0, 168, 132, 0.3)',
      }
    },
  },
  plugins: [],
}
