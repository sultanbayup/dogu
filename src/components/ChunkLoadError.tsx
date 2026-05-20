interface ChunkLoadErrorProps {
  /** Called when the user activates the Retry button. */
  onRetry: () => void
}

/**
 * ChunkLoadError is the fallback UI rendered by the error boundary in
 * ToolPage when a tool's lazy chunk fails to load (network error or
 * 10-second timeout).
 *
 * Requirements: 14.5 — if a tool chunk fails to load, render an error
 * message identifying the failure and provide a retry control.
 */
export function ChunkLoadError({ onRetry }: ChunkLoadErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[200px] gap-4 text-center px-4"
      role="alert"
    >
      <p className="text-text text-base font-medium">Tool failed to load.</p>
      <p className="text-text-secondary text-sm">
        There was a problem fetching this tool. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-button bg-accent text-white text-sm font-medium transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Retry
      </button>
    </div>
  )
}

export default ChunkLoadError
