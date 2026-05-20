import { useEffect, useState } from 'react'

interface DelayedSpinnerProps {
  /** Milliseconds to wait before showing the spinner. Defaults to 200. */
  delay?: number
}

/**
 * DelayedSpinner renders a loading spinner only after `delay` milliseconds
 * have elapsed. This prevents a flash of the spinner for fast loads.
 *
 * Requirements: 14.6 — while a tool chunk fetch exceeds 200 ms, display a
 * loading indicator until the chunk is loaded or the fetch fails.
 */
export function DelayedSpinner({ delay = 200 }: DelayedSpinnerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) return null

  return (
    <div
      className="flex items-center justify-center min-h-[200px]"
      role="status"
      aria-label="Loading tool…"
    >
      {/* Spinning ring */}
      <svg
        className="animate-spin h-8 w-8 text-accent"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">Loading tool…</span>
    </div>
  )
}

export default DelayedSpinner
