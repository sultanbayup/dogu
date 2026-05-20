import type { ReactNode } from 'react'

export interface EmptyStateProps {
  /** Non-empty message to display. */
  message: string
  /** Optional action element rendered below the message (e.g. a retry button). */
  action?: ReactNode
}

/**
 * Empty_State is rendered when a section has no content to show.
 *
 * - Centered layout with the message as primary text.
 * - Optional `action` element (e.g. a retry button or a link) rendered below
 *   the message when supplied.
 *
 * Requirements: 6.6, 3.6, 3.7, 4.4, 17.1
 */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center"
    >
      {/* Primary message */}
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
        {message}
      </p>

      {/* Optional action (e.g. retry button) */}
      {action != null && (
        <div className="flex items-center justify-center">
          {action}
        </div>
      )}
    </div>
  )
}

export default EmptyState
