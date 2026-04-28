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
        maritime: {
          DEFAULT: '#003366',
          dark: '#001A33',
        },
        action: {
          DEFAULT: '#0056B3',
          dark: '#003D8F',
        },
        'orange-dest': '#FF8C00',
        navy: {
          DEFAULT: '#0F1B2E',
          deep: '#1E3A8A',
          dark: '#111827',
        },
        emerald: {
          DEFAULT: '#10B981',
          dark: '#047857',
        },
        cyan: {
          neon: '#00D9FF',
        },
        purple: {
          neon: '#A855F7',
        },
        grey: {
          neon: '#E8EAED',
          900: '#111827',
          500: '#9CA3AF',
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
        'typewriter': 'typewriter 2s steps(40) 1s forwards',
        'bounce-soft': 'bounceSoft 2s infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '0.4' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.6), 0 0 40px rgba(0, 217, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 217, 255, 0.8), 0 0 70px rgba(0, 217, 255, 0.5)' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' }
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 217, 255, 0.6), 0 0 40px rgba(0, 217, 255, 0.3)',
        'emerald': '0 0 15px rgba(16, 185, 129, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
