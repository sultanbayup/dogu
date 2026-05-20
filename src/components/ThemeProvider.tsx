import { ReactNode, useEffect } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * ThemeProvider ensures the dark theme class is applied to the document root
 * on mount, preventing any flash of an alternative theme (Requirement 5.7).
 *
 * Design tokens (colors, radii, motion timings, fonts) are defined in
 * src/styles/tokens.css and consumed via Tailwind utility classes throughout
 * the app. No React context is needed for token access.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return <>{children}</>
}
