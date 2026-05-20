import { Link } from 'react-router-dom'
import { Header } from '../components/Header'

/**
 * NotFoundPage — minimal stub rendered when no route matches.
 *
 * Full implementation is in task 7.3. This stub satisfies the dependency
 * required by ToolPage (task 7.2) so that unknown slugs render a 404 message.
 *
 * Requirements: 12.1, 12.2, 12.3
 */
export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-6xl font-bold tracking-tight">404</p>
        <p className="text-text-secondary text-base">
          We couldn&apos;t find that page.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-button bg-accent text-white text-sm font-medium transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Back to Dogu home
        </Link>
      </main>
    </div>
  )
}

export default NotFoundPage
