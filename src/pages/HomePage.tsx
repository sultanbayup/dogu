import { useState, useMemo } from 'react'
import { tools } from '../tools/registry'
import { filterTools } from '../utils/filterTools'
import { SearchBar } from '../components/SearchBar'
import { ToolCard } from '../components/ToolCard'
import { EmptyState } from '../components/EmptyState'

export type { ToolMetadata } from '../tools/registry'

/**
 * HomePage displays the Dogu platform homepage with:
 * - Wordmark and tagline
 * - Search bar for filtering tools
 * - Popular section (when no search query)
 * - All tools grid (filtered by search query, lexicographic by slug)
 * - Empty state when no tools match or registry is empty
 *
 * Requirements: 3.1–3.7, 4.1–4.6, 13.2–13.4, 15.4
 */
export function HomePage() {
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0

  const filtered = useMemo(() => filterTools(tools, trimmed), [trimmed])

  // Popular section is only shown when there is no active search query (Req 4.3)
  const popular = useMemo(
    () => (hasQuery ? [] : tools.filter((t) => t.popular)),
    [hasQuery],
  )

  const noResults = hasQuery && filtered.length === 0
  const emptyRegistry = tools.length === 0 && !hasQuery

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* Hero region — wordmark, tagline, search bar (Req 3.1, 3.5, 15.4) */}
      <header className="w-full px-4 pt-10 pb-6 flex flex-col items-center gap-3 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-text leading-none">
          Dogu
        </h1>
        <p className="text-sm text-text-secondary text-center">
          Tiny tools that just work.
        </p>
        <div className="w-full mt-2">
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 pb-10 md:max-w-4xl lg:max-w-6xl">
        {/* Empty registry (Req 3.6) */}
        {emptyRegistry && (
          <EmptyState message="No tools are available yet. Check back soon." />
        )}

        {/* Popular section — hidden while searching (Req 3.3, 3.4, 4.3) */}
        {!hasQuery && popular.length > 0 && (
          <section aria-labelledby="popular-heading" className="mb-8">
            <h2
              id="popular-heading"
              className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-3"
            >
              Popular
            </h2>
            <ToolGrid tools={popular} />
          </section>
        )}

        {/* All Tools / Results section (Req 3.2, 4.1, 4.4) */}
        {!emptyRegistry && (
          <section
            aria-labelledby="all-tools-heading"
            aria-live="polite"
            aria-atomic="false"
          >
            <h2
              id="all-tools-heading"
              className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-3"
            >
              {hasQuery ? 'Results' : 'All Tools'}
            </h2>

            {noResults ? (
              <EmptyState
                message={`No tools match "${trimmed}". Try a different keyword.`}
              />
            ) : (
              <ToolGrid tools={filtered} />
            )}
          </section>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToolGrid — extracted to avoid repeating the responsive grid markup twice
// ---------------------------------------------------------------------------

interface ToolGridProps {
  tools: ReadonlyArray<Parameters<typeof ToolCard>[0]['tool']>
}

/**
 * Responsive grid of ToolCards.
 * 1 col → 2 cols at sm → 3 cols at md → 4 cols at lg (Req 13.3, 13.4).
 * gap-2 ensures ≥ 8px spacing between tap targets (Req 13.1).
 */
function ToolGrid({ tools }: ToolGridProps) {
  return (
    <ul
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      role="list"
    >
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  )
}

export default HomePage
