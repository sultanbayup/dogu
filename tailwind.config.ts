import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)'
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)'
      },
      fontFamily: {
        sans: 'var(--font-sans)'
      },
      transitionDuration: {
        fast: 'var(--motion-duration-fast)'
      },
      transitionTimingFunction: {
        'ease-out': 'var(--motion-easing)'
      }
    }
  },
  plugins: [],
  darkMode: 'class'
} satisfies Config
