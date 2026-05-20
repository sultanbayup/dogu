import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MotionProvider } from './MotionProvider'
import { useReducedMotion } from '../hooks/useReducedMotion'

function TestComponent() {
  const prefersReducedMotion = useReducedMotion()
  return <div>{prefersReducedMotion ? 'reduced' : 'normal'}</div>
}

describe('MotionProvider', () => {
  it('should render children', () => {
    const { getByText } = render(
      <MotionProvider>
        <div>Test content</div>
      </MotionProvider>
    )
    expect(getByText('Test content')).toBeInTheDocument()
  })

  it('should provide useReducedMotion hook', () => {
    const { getByText } = render(
      <MotionProvider>
        <TestComponent />
      </MotionProvider>
    )
    expect(getByText(/reduced|normal/)).toBeInTheDocument()
  })

  it('should throw error when useReducedMotion is used outside provider', () => {
    // This test verifies the error handling
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useReducedMotion must be used within a MotionProvider')
  })
})
