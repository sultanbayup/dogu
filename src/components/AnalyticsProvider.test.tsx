import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnalyticsProvider } from './AnalyticsProvider'

describe('AnalyticsProvider', () => {
  it('should render children', () => {
    const { getByText } = render(
      <MemoryRouter>
        <AnalyticsProvider>
          <div>Test content</div>
        </AnalyticsProvider>
      </MemoryRouter>
    )
    expect(getByText('Test content')).toBeInTheDocument()
  })
})
