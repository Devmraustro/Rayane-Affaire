import type { Config } from 'tailwindcss';

/**
 * RAYANE AFFAIRE design system.
 *
 * Premium editorial: warm neutral paper, ink charcoal, restrained gold.
 * Tokens here match `lib/brand.ts` (THEME) and `app/globals.css`.
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        gold: {
          50: '#FBF7EA',
          100: '#F6ECCB',
          200: '#EFDE9B',
          300: '#E9D06B',
          400: '#E5BC42',
          500: '#D9A622',
          600: '#B98417',
          700: '#946312',
          800: '#714A0F',
          900: '#4A300A',
        },
        ink: {
          DEFAULT: '#1B1B1D',
          50: '#F6F6F6',
          100: '#EAEAEC',
          200: '#D3D3D7',
          300: '#B0B0B6',
          400: '#85858D',
          500: '#63636B',
          600: '#4A4A52',
          700: '#35353B',
          800: '#25252A',
          900: '#1B1B1D',
          950: '#101012',
        },
        sand: {
          50: '#FBFAF8',
          100: '#F6F4F0',
          200: '#EDE9E1',
          300: '#DED8CA',
          400: '#C9C0AC',
        },
        success: { DEFAULT: '#1E8E5A', soft: '#E8F5EF' },
        warning: { DEFAULT: '#B7791F', soft: '#FDF5E4' },
        danger: { DEFAULT: '#B42318', soft: '#FDEDEC' },
        info: { DEFAULT: '#17638F', soft: '#E9F2F9' },
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Noto Sans Arabic',
          'Tahoma',
          'Arial',
          'sans-serif',
        ],
        display: [
          'var(--font-display)',
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          'Palatino',
          'Georgia',
          '"Noto Naskh Arabic"',
          'serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        card: '0 1px 2px 0 rgb(27 27 29 / 0.04), 0 10px 28px -14px rgb(27 27 29 / 0.16)',
        'card-hover': '0 2px 6px 0 rgb(27 27 29 / 0.07), 0 22px 48px -20px rgb(27 27 29 / 0.26)',
        panel: '0 1px 3px 0 rgb(27 27 29 / 0.06), 0 16px 40px -24px rgb(27 27 29 / 0.3)',
        gold: '0 10px 28px -10px rgb(217 166 34 / 0.5)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.6)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 16px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translate3d(0, -8px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.7)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down': 'slide-down 0.2s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite',
      },
      transitionTimingFunction: { premium: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      spacing: { 18: '4.5rem', 22: '5.5rem' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
