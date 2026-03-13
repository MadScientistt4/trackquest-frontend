import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        bg: {
          primary: '#0a0d0f',
          secondary: '#0f1419',
          card: '#131920',
          elevated: '#1a2332',
          border: '#1e2d3d',
        },
        accent: {
          green: '#00d084',
          'green-dim': '#00d08422',
          gold: '#f5c842',
          'gold-dim': '#f5c84220',
          red: '#ff4757',
          'red-dim': '#ff475722',
          blue: '#4dabf7',
        },
        text: {
          primary: '#e8f4fd',
          secondary: '#8899aa',
          muted: '#445566',
          green: '#00d084',
          red: '#ff4757',
          gold: '#f5c842',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui'],
        mono: ['var(--font-mono)', 'monospace'],
        body: ['var(--font-body)', 'system-ui'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e2d3d' fill-opacity='0.4'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%)',
        'green-glow': 'radial-gradient(ellipse at center, rgba(0, 208, 132, 0.15) 0%, transparent 70%)',
        'gold-glow': 'radial-gradient(ellipse at center, rgba(245, 200, 66, 0.1) 0%, transparent 70%)',
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(0, 208, 132, 0.3)',
        'gold-glow': '0 0 20px rgba(245, 200, 66, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-green': 'pulseGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'ticker': 'ticker 20s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 208, 132, 0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(0, 208, 132, 0.1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        ticker: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(-100%)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
