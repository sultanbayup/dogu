import { createContext, ReactNode, useEffect, useState } from 'react'

interface MotionContextValue {
  prefersReducedMotion: boolean
}

export const MotionContext = createContext<MotionContextValue | undefined>(undefined)

interface MotionProviderProps {
  children: ReactNode
}

export function MotionProvider({ children }: MotionProviderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <MotionContext.Provider value={{ prefersReducedMotion }}>
      {children}
    </MotionContext.Provider>
  )
}
