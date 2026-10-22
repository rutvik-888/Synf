/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08070a',
          900: '#0c0b10',
          800: '#15131c',
          700: '#1f1c28',
          600: '#2a2636',
          500: '#3a3548',
        },
        synf: {
          50: '#fff1f5',
          100: '#ffe0ea',
          200: '#ffc3d6',
          300: '#ff9ab8',
          400: '#ff5e8c',
          500: '#ff2d6f',
          600: '#e8135a',
          700: '#c40a48',
          800: '#9a0a3a',
          900: '#7a0c33',
        },
        acid: {
          300: '#e4ff7a',
          400: '#d4ff3f',
          500: '#c2f238',
          600: '#a6d92e',
        },
        gold: {
          400: '#ffcf6b',
          500: '#f5b342',
        },
        violet: {
          300: '#c9a3ff',
          400: '#a855f7',
          500: '#8b2df0',
          600: '#7c1fd1',
        },
        electric: {
          300: '#7ad9ff',
          400: '#22b8ff',
          500: '#0ea5e9',
        },
        ember: {
          400: '#ff7a3d',
          500: '#ff5722',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.2,0.8,0.2,1) both',
        'fade-in': 'fadeIn 0.6s ease both',
        'scale-in': 'scaleIn 0.6s cubic-bezier(0.2,0.8,0.2,1) both',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
        'clip-reveal': 'clipReveal 0.9s cubic-bezier(0.7,0,0.3,1) both',
        marquee: 'marquee 30s linear infinite',
        'marquee-fast': 'marquee 18s linear infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(60px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        clipReveal: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
