import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'
import { getTokenValues } from '../utils/themeTokens'

describe('ThemeProvider', () => {
  it('should render children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <div>Test content</div>
      </ThemeProvider>
    )
    expect(getByText('Test content')).toBeInTheDocument()
  })

  it('should add dark class to html element', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should expose token values', () => {
    const tokens = getTokenValues()
    expect(tokens).toHaveProperty('colors')
    expect(tokens).toHaveProperty('radii')
    expect(tokens).toHaveProperty('motion')
    expect(tokens).toHaveProperty('fonts')
    expect(tokens.colors).toHaveProperty('bg')
    expect(tokens.colors).toHaveProperty('surface')
    expect(tokens.colors).toHaveProperty('accent')
    expect(tokens.colors).toHaveProperty('text')
    expect(tokens.colors).toHaveProperty('textSecondary')
  })
})
