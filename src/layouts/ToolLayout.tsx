import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// ─── Logo ─────────────────────────────────────────────────────────────────────

function DoguLogo() {
  const size = 24
  const gap = 3
  const r = 2
  const sq = (size - gap) / 2

  const squares = [
    { x: 0,        y: 0 },
    { x: sq + gap, y: 0 },
    { x: 0,        y: sq + gap },
    { x: sq + gap, y: sq + gap },
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {squares.map(({ x, y }, i) => (
        <rect key={i} x={x} y={y} width={sq} height={sq} rx={r} ry={r} fill="currentColor" />
      ))}
    </svg>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface ToolLayoutProps {
  title: string
  children: ReactNode
}

/**
 * Tool_Layout — single header bar aligned to the same max-w-lg column as the
 * tool content:
 *   Left:   [logo]  (links to /)
 *   Center: tool title
 *   Right:  ← Back  (links to /)
 *
 * Requirements: 6.2
 */
export function ToolLayout({ title, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">

      {/* ── Tool header bar — same width constraint as content ── */}
      <header className="w-full px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-3">

          {/* Left — logo only */}
          <Link
            to="/"
            className="inline-flex items-center justify-center text-text transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-button min-h-[44px] min-w-[44px]"
            aria-label="Dogu — go to home"
          >
            <DoguLogo />
          </Link>

          {/* Center — tool title */}
          <h1 className="text-sm font-semibold text-text truncate text-center">
            {title}
          </h1>

          {/* Right — back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-1 min-h-[44px] px-1 text-sm text-text-secondary transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-button whitespace-nowrap"
            aria-label="Back to home"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </Link>

        </div>
      </header>

      {/* ── Tool content — same max-w-lg column ── */}
      <main className="flex-1 pb-8 pt-2">
        <div className="w-full max-w-lg mx-auto px-4 flex flex-col items-center">
          {children}
        </div>
      </main>

    </div>
  )
}

export default ToolLayout
