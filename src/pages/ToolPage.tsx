import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { findTool } from '../tools/registry'
import { ToolLayout } from '../layouts/ToolLayout'
import { DelayedSpinner } from '../components/DelayedSpinner'
import { ChunkLoadError } from '../components/ChunkLoadError'
import { ToolErrorBoundary } from '../components/ToolErrorBoundary'
import { NotFoundPage } from './NotFoundPage'
import { withTimeout } from '../utils/withTimeout'

/**
 * ToolPage reads the `:slug` URL param, looks it up in the registry, and
 * renders the matching tool inside Tool_Layout with lazy loading.
 *
 * - Unknown slug → NotFoundPage
 * - Known slug   → React.lazy(withTimeout(tool.component, 10_000)) inside
 *                  Tool_Layout, wrapped in Suspense + ToolErrorBoundary
 *
 * Requirements: 2.2, 2.3, 14.4, 14.5, 14.6
 */
export function ToolPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const tool = useMemo(() => findTool(slug), [slug])

  if (!tool) {
    return <NotFoundPage />
  }

  return <ToolPageInner tool={tool} />
}

// ---------------------------------------------------------------------------
// ToolPageInner — separated so that React.lazy is stable per tool identity
// ---------------------------------------------------------------------------

interface ToolPageInnerProps {
  tool: NonNullable<ReturnType<typeof findTool>>
}

/**
 * Inner component that holds the lazy reference in state so that the Retry
 * button can reset it (by bumping a key) to trigger a fresh import attempt.
 */
function ToolPageInner({ tool }: ToolPageInnerProps) {
  // retryKey is incremented on retry to force React.lazy to re-evaluate
  const [retryKey, setRetryKey] = useState(0)

  const LazyTool = useMemo(
    () => React.lazy(withTimeout(tool.component, 10_000)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool.slug, retryKey],
  )

  return (
    <ToolLayout title={tool.name}>
      <ToolErrorBoundary
        key={retryKey}
        fallback={(onRetry) => (
          <ChunkLoadError
            onRetry={() => {
              onRetry()
              setRetryKey((k) => k + 1)
            }}
          />
        )}
      >
        {/* Suspense fallback: DelayedSpinner shows only after 200 ms */}
        <React.Suspense fallback={<DelayedSpinner delay={200} />}>
          <LazyTool />
        </React.Suspense>
      </ToolErrorBoundary>
    </ToolLayout>
  )
}

export default ToolPage
