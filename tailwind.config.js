/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#16603F',
          green: '#16603F',
          dark: '#14432E',
          sidebar: '#10362A',
          deep: '#0C2A20',
        },
        gold: {
          DEFAULT: '#C9A93B',
          light: '#E2C77E',
          pale: '#F1E4C0',
          tint: '#FAF4E4',
          border: '#EADFBE',
          text: '#9A7018',
          hover: '#B8912C',
        },
        app: {
          bg: '#F7F4EF',
          card: '#FFFFFF',
          border: '#EAE3D8',
          panel: '#FBF9F5',
          subtle: '#FBF9F5',
        },
        ink: {
          DEFAULT: '#241C15',
          primary: '#241C15',
          secondary: '#6B5E4C',
          body: '#4A4033',
          muted: '#8A7B68',
          faint: '#A79A87',
        },
        side: {
          active: '#F1E4C0',
          inactive: '#9FB3A6',
        },
        // Input convention
        manual: { text: '#2A62C9', bg: '#F8FAFF', border: '#C9D9F4' },
        master: { text: '#1F7A4D', bg: '#F4FBF7', border: '#BEE3CE' },
        auto: { text: '#241C15', bg: '#F2EFEA', border: '#E4DDD2' },
        // Status
        ok: { text: '#1F7A4D', bg: '#E7F5EE', border: '#BEE3CE' },
        warn: { text: '#9A7018', bg: '#FBF3DC', border: '#EAD9A6' },
        danger: { text: '#B3261E', bg: '#FDE9E5', border: '#F5C6BD' },
      },
      borderRadius: {
        card: '16px',
        modal: '18px',
        field: '10px',
        btn: '12px',
        pill: '99px',
      },
      maxWidth: {
        content: '1240px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(30,20,10,0.04), 0 8px 24px rgba(30,20,10,0.05)',
        modal: '0 24px 80px rgba(30,20,10,0.3)',
      },
      keyframes: {
        cbRing: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.12)', opacity: '0.9' },
        },
        cbBarFill: { '0%': { width: '0%' }, '100%': { width: '100%' } },
        cbFadeOut: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        cbFadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        sheetUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        cbRing: 'cbRing 2s ease-in-out infinite',
        cbBarFill: 'cbBarFill 2.4s ease-out forwards',
        cbFadeOut: 'cbFadeOut 0.75s ease forwards',
        cbFadeUp: 'cbFadeUp 0.7s ease-out both',
        fadeIn: 'fadeIn 0.2s ease',
        sheetUp: 'sheetUp 0.25s ease',
      },
    },
  },
  plugins: [],
}
