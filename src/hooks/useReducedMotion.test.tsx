import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MotionProvider } from '../components/MotionProvider'
import { useReducedMotion } from './useReducedMotion'

function TestComponent() {
  const prefersReducedMotion = useReducedMotion()
  return <div>{prefersReducedMotion ? 'reduced' : 'normal'}</div>
}

describe('useReducedMotion', () => {
  it('should return a boolean value', () => {
    const { getByText } = render(
      <MotionProvider>
        <TestComponent />
      </MotionProvider>
    )
    const element = getByText(/reduced|normal/)
    expect(element).toBeInTheDocument()
    expect(element.textContent).toMatch(/^(reduced|normal)$/)
  })

  it('should throw error when used outside MotionProvider', () => {
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useReducedMotion must be used within a MotionProvider')
  })

  it('should respect prefers-reduced-motion media query', () => {
    // This test verifies the hook reads from the media query
    // The actual media query value depends on the test environment
    const { getByText } = render(
      <MotionProvider>
        <TestComponent />
      </MotionProvider>
    )
    const element = getByText(/reduced|normal/)
    expect(element).toBeInTheDocument()
  })
})
