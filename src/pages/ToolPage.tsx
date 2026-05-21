import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { findTool } from '../tools/registry'
import { DelayedSpinner } from '../components/DelayedSpinner'
import { ChunkLoadError } from '../components/ChunkLoadError'
import { ToolErrorBoundary } from '../components/ToolErrorBoundary'
import { NotFoundPage } from './NotFoundPage'
import { withTimeout } from '../utils/withTimeout'

/**
 * ToolPage reads the `:slug` URL param, looks it up in the registry, and
 * renders the matching tool with lazy loading.
 *
 * Each tool component is responsible for rendering its own ToolLayout.
 *
 * - Unknown slug → NotFoundPage
 * - Known slug   → React.lazy(withTimeout(tool.component, 10_000)) wrapped
 *                  in Suspense + ToolErrorBoundary
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

function ToolPageInner({ tool }: ToolPageInnerProps) {
  const [retryKey, setRetryKey] = useState(0)

  const LazyTool = useMemo(
    () => React.lazy(withTimeout(tool.component, 10_000)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool.slug, retryKey],
  )

  return (
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
      <React.Suspense fallback={<DelayedSpinner delay={200} />}>
        <LazyTool />
      </React.Suspense>
    </ToolErrorBoundary>
  )
}

export default ToolPage
