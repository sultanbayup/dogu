import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'

interface ToolLayoutProps {
  title: string
  children: ReactNode
}

/**
 * Tool_Layout wraps every Tool_Page with the shared Header, a back-to-home
 * link, the tool title as a heading, and a <main> content slot.
 *
 * Requirements: 6.2
 */
export function ToolLayout({ title, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <Header />

      <div className="px-4 pt-2 pb-1">
        <Link
          to="/"
          className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] text-sm text-text-secondary transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-button"
        >
          {/* Left-pointing arrow */}
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
          Back to home
        </Link>
      </div>

      <div className="px-4 pt-2 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>

      <main className="flex-1 px-4 pb-8">
        {children}
      </main>
    </div>
  )
}

export default ToolLayout
