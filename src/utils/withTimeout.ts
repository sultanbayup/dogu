import type { ComponentType } from 'react'

/**
 * Wraps a lazy component factory with a Promise.race timeout.
 *
 * If the import does not resolve within `ms` milliseconds, the returned
 * promise rejects with a TimeoutError.
 *
 * Requirements: 14.5 — chunk fetch timeout of 10 seconds.
 */
export function withTimeout(
  factory: () => Promise<{ default: ComponentType }>,
  ms: number,
): () => Promise<{ default: ComponentType }> {
  return () =>
    Promise.race([
      factory(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool chunk timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ])
}
