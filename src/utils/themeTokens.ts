/**
 * Reads the current design token values from CSS custom properties on the
 * document root. Useful for tests and any code that needs to inspect the
 * active theme values at runtime.
 *
 * Token definitions live in src/styles/tokens.css.
 */
export interface ThemeTokens {
  colors: {
    bg: string
    surface: string
    accent: string
    text: string
    textSecondary: string
  }
  radii: {
    card: string
    button: string
  }
  motion: {
    durationFast: string
    easing: string
  }
  fonts: {
    sans: string
  }
}

export function getTokenValues(): ThemeTokens {
  const root = document.documentElement
  const getVar = (name: string) => getComputedStyle(root).getPropertyValue(name).trim()

  return {
    colors: {
      bg: getVar('--color-bg'),
      surface: getVar('--color-surface'),
      accent: getVar('--color-accent'),
      text: getVar('--color-text'),
      textSecondary: getVar('--color-text-secondary'),
    },
    radii: {
      card: getVar('--radius-card'),
      button: getVar('--radius-button'),
    },
    motion: {
      durationFast: getVar('--motion-duration-fast'),
      easing: getVar('--motion-easing'),
    },
    fonts: {
      sans: getVar('--font-sans'),
    },
  }
}
