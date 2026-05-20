import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ToolErrorBoundaryProps {
  children: ReactNode
  fallback: (onRetry: () => void) => ReactNode
}

interface ToolErrorBoundaryState {
  hasError: boolean
}

/**
 * Class-based error boundary that catches errors thrown during rendering of
 * lazy tool components (network errors, timeouts, etc.) and renders the
 * supplied fallback with a retry callback.
 *
 * Requirements: 14.5 — error boundary catches timeout/network errors and
 * renders "Tool failed to load" with a Retry button.
 */
export class ToolErrorBoundary extends Component<
  ToolErrorBoundaryProps,
  ToolErrorBoundaryState
> {
  constructor(props: ToolErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ToolErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ToolPage] Tool chunk failed to load:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.handleRetry)
    }
    return this.props.children
  }
}
