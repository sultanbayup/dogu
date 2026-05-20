import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../utils/cn'

/**
 * Internal state machine for the Copy_Button.
 *
 * idle   → copied  (on successful writeText)
 * idle   → error   (on failed writeText or clipboard unavailable)
 * copied → idle    (after 2 s timeout)
 * error  → idle    (after 3 s timeout)
 *
 * While in `copied` or `error`, repeated activations are ignored.
 */
type CopyState = 'idle' | 'copied' | 'error'

const COPIED_DURATION_MS = 2_000  // within the 1–3 s window
const ERROR_DURATION_MS = 3_000   // within the 2–4 s window

export interface CopyButtonProps {
  /** The text payload to write to the clipboard. */
  payload: string
  /** Optional label shown in the idle state. Defaults to "Copy". */
  label?: string
  /** Called with the original error when the clipboard write fails. */
  onError?: (e: Error) => void
}

/**
 * Copy_Button writes a text payload to the system clipboard on activation.
 *
 * - Disabled when `payload` is empty.
 * - Minimum tap target: 44 × 44 CSS px (Requirements 7.5, 13.1).
 * - State machine: idle → copied → idle  /  idle → error → idle.
 *
 * Requirements: 7.1–7.5, 6.5
 */
export function CopyButton({ payload, label = 'Copy', onError }: CopyButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // Clear any pending revert timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const handleActivation = useCallback(async () => {
    if (copyState !== 'idle' || !payload) return

    try {
      await navigator.clipboard.writeText(payload)
      setCopyState('copied')
      timerRef.current = setTimeout(() => {
        setCopyState('idle')
        timerRef.current = null
      }, COPIED_DURATION_MS)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
      setCopyState('error')
      timerRef.current = setTimeout(() => {
        setCopyState('idle')
        timerRef.current = null
      }, ERROR_DURATION_MS)
    }
  }, [copyState, payload, onError])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        void handleActivation()
      }
    },
    [handleActivation],
  )

  const visibleLabel =
    copyState === 'copied' ? 'Copied'
    : copyState === 'error' ? 'Copy failed'
    : label

  return (
    <button
      type="button"
      disabled={!payload}
      aria-disabled={!payload || copyState !== 'idle'}
      aria-label={visibleLabel}
      onClick={() => void handleActivation()}
      onKeyDown={handleKeyDown}
      className={cn(
        // Tap target & layout
        'min-w-[44px] min-h-[44px] inline-flex items-center justify-center px-4 py-2',
        // Shape & typography
        'rounded-button text-sm font-medium border cursor-pointer',
        // Disabled state
        'disabled:opacity-40 disabled:cursor-not-allowed',
        // Focus ring
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        // State colours
        copyState === 'copied' && 'bg-green-600 text-white border-green-600',
        copyState === 'error'  && 'bg-red-600 text-white border-red-600',
        copyState === 'idle'   && 'bg-accent text-white border-accent hover:opacity-90 active:opacity-75',
        // Motion
        !prefersReducedMotion && 'transition-all duration-fast ease-out',
      )}
    >
      {visibleLabel}
    </button>
  )
}

export default CopyButton
