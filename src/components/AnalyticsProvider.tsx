import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface AnalyticsProviderProps {
  children: ReactNode
}

// Extend the Window interface to include the optional plausible function
declare global {
  interface Window {
    plausible?: (event: string, options?: Record<string, unknown>) => void
  }
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation()

  useEffect(() => {
    // No-op in development and preview modes (Requirement 11.5)
    if (!import.meta.env.PROD) return

    // No-op if the Plausible script failed to load or was blocked (Requirement 11.6)
    if (typeof window.plausible !== 'function') return

    // Record exactly one page-view event per route change (Requirement 11.2)
    // No cookies, no PII, no user identifiers passed (Requirements 11.3, 11.4)
    window.plausible('pageview')
  }, [location.pathname, location.search])

  return <>{children}</>
}
