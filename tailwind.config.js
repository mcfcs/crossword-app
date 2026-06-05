/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'rgb(var(--paper-rgb) / <alpha-value>)',
          raised: 'rgb(var(--paper-raised-rgb) / <alpha-value>)',
          sunken: 'rgb(var(--paper-sunken-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          deep: 'rgb(var(--accent-deep-rgb) / <alpha-value>)',
        },
        gold: 'rgb(var(--gold-rgb) / <alpha-value>)',
        grass: 'rgb(var(--grass-rgb) / <alpha-value>)',
        inkblue: 'rgb(var(--inkblue-rgb) / <alpha-value>)',
        highlight: 'rgb(var(--highlight-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
      },
      boxShadow: {
        press: '4px 4px 0 0 var(--ink)',
        'press-sm': '3px 3px 0 0 var(--ink)',
        'press-accent': '4px 4px 0 0 var(--accent-deep)',
        sheet: '0 18px 40px -28px rgba(33,28,21,0.55)',
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.35)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'ink-bleed': {
          '0%': { opacity: '0.4', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'stamp-in': 'stamp-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'ink-bleed': 'ink-bleed 0.35s ease both',
      },
    },
  },
  plugins: [],
}
