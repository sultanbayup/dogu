import type { ReactNode } from 'react'
import { CopyButton } from './CopyButton'

export interface ResultCardProps {
  /** The tool's output content to display inside the card. */
  children: ReactNode
  /**
   * The text payload bound to the embedded Copy_Button.
   * When empty, the Copy_Button is automatically disabled.
   */
  copyPayload: string
}

/**
 * Result_Card presents a tool's output on a card surface with an embedded
 * Copy_Button bound to the caller-supplied `copyPayload`.
 *
 * - Uses the `--color-surface` token as the card background.
 * - `rounded-card` (1 rem / rounded-2xl) corner radius per the design spec.
 * - The Copy_Button is positioned in the top-right corner so it does not
 *   obscure the output content.
 *
 * Requirements: 6.7, 7.1–7.5
 */
export function ResultCard({ children, copyPayload }: ResultCardProps) {
  return (
    <div
      className={[
        'relative',
        'glass-panel',
        'rounded-card',
        'p-4',
      ].join(' ')}
    >
      {/* Copy button — top-right corner */}
      <div className="absolute top-3 right-3">
        <CopyButton payload={copyPayload} />
      </div>

      {/* Tool output content — right-padded to avoid overlapping the button */}
      <div className="pr-16">
        {children}
      </div>
    </div>
  )
}

export default ResultCard
