/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cyber: {
          void: '#040308',
          bg: '#07060f',
          surface: '#0d091a',
          card: 'rgba(18, 12, 33, 0.65)',
          panel: 'rgba(24, 15, 45, 0.75)',
          border: 'rgba(168, 85, 247, 0.25)',
          borderHover: 'rgba(192, 132, 252, 0.6)',
          dim: '#94a3b8',
        },
        neon: {
          purple: '#a855f7',
          violet: '#8b5cf6',
          magenta: '#d946ef',
          pink: '#ec4899',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          glow: '#c084fc',
        }
      },
      boxShadow: {
        'neon-sm': '0 0 12px rgba(168, 85, 247, 0.35)',
        'neon-md': '0 0 22px rgba(168, 85, 247, 0.45)',
        'neon-lg': '0 0 35px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.2)',
        'neon-inset': 'inset 0 0 20px rgba(168, 85, 247, 0.25)',
        'cyan-glow': '0 0 20px rgba(6, 182, 212, 0.5)',
        'magenta-glow': '0 0 25px rgba(217, 70, 239, 0.5)',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(to right, rgba(168, 85, 247, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(168, 85, 247, 0.05) 1px, transparent 1px)',
        'radial-vibe': 'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.18) 0%, rgba(7, 6, 15, 0.95) 75%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'radar': 'radar 4s linear infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 22px rgba(168, 85, 247, 0.9))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
