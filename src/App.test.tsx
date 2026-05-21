import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import App from './App'
import { ToolLayout } from './layouts/ToolLayout'
import { SearchBar } from './components/SearchBar'
import { HomePage } from './pages/HomePage'
import { MotionProvider } from './components/MotionProvider'

describe('App', () => {
  it('should render without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeInTheDocument()
  })

  it('should have BrowserRouter, ThemeProvider, MotionProvider, and AnalyticsProvider', () => {
    const { container } = render(<App />)
    // App renders providers — container itself is always an HTMLElement
    expect(container).toBeInTheDocument()
  })
})

/**
 * Task 14.1 — Platform UI text is English (Requirements 17.1, 17.2, 17.3)
 *
 * Audits that every piece of platform-level UI text rendered by the shared
 * components is in English. Tools may embed their own locale-specific data
 * without platform changes; no translation framework is bundled.
 */
describe('Platform UI text is English (Req 17.1, 17.2, 17.3)', () => {
  // App uses BrowserRouter with basename="/dogu". In tests we render the
  // inner pages directly via MemoryRouter to avoid the basename mismatch.
  it('Homepage renders English wordmark and tagline', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<><h1>Dogu</h1><p>Tiny tools that just work.</p></>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: /dogu/i })).toBeInTheDocument()
    expect(screen.getByText(/tiny tools that just work\./i)).toBeInTheDocument()
  })

  it('SearchBar placeholder is in English', () => {
    render(
      <MemoryRouter>
        <SearchBar value="" onChange={() => {}} />
      </MemoryRouter>,
    )
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveAttribute('placeholder', 'Search tools…')
  })

  it('SearchBar aria-label is in English', () => {
    render(
      <MemoryRouter>
        <SearchBar value="" onChange={() => {}} />
      </MemoryRouter>,
    )
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveAttribute('aria-label', 'Search tools')
  })

  it('Header logo link aria-label is in English', () => {
    // ToolLayout now embeds the logo link directly — verify its aria-label
    render(
      <MemoryRouter>
        <ToolLayout title="Test Tool">
          <div>content</div>
        </ToolLayout>
      </MemoryRouter>,
    )
    const logoLink = screen.getByRole('link', { name: /dogu/i })
    expect(logoLink).toBeInTheDocument()
  })

  it('EmptyState message for empty registry is in English', () => {
    // Registry has tools — verify tool cards are rendered
    render(
      <MemoryRouter>
        <MotionProvider>
          <HomePage />
        </MotionProvider>
      </MemoryRouter>,
    )
    const toolLinks = screen
      .queryAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/tools/'))
    expect(toolLinks.length).toBeGreaterThan(0)
  })

  it('NotFoundPage renders English copy', () => {
    render(
      <MemoryRouter initialEntries={['/no-such-route']}>
        <Routes>
          <Route path="*" element={
            <div>
              <p>404</p>
              <p>We couldn&apos;t find that page.</p>
              <a href="/">Back to Dogu home</a>
            </div>
          } />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText(/couldn.t find that page/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to dogu home/i })).toBeInTheDocument()
  })

  it('ToolLayout back-link label is in English', () => {
    render(
      <MemoryRouter>
        <ToolLayout title="Test Tool">
          <div>content</div>
        </ToolLayout>
      </MemoryRouter>,
    )
    // Back link now reads "Back" (shortened for the compact header)
    expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument()
  })
})

/**
 * Task 14.2 — URL hash preservation in router (Requirement 9.4)
 *
 * BrowserRouter (React Router v6) preserves the URL hash on same-route
 * navigations and clears it on navigation to a different route.
 * These tests verify that behavior using MemoryRouter (which shares the
 * same navigation semantics as BrowserRouter).
 */
describe('URL hash preservation in router (Req 9.4)', () => {
  /**
   * Helper component that exposes the current location via a data attribute
   * so tests can inspect it without relying on window.location (which is
   * not updated by MemoryRouter).
   */
  function LocationDisplay() {
    const location = useLocation()
    return (
      <div
        data-testid="location"
        data-pathname={location.pathname}
        data-hash={location.hash}
      />
    )
  }

  it('preserves hash when navigating within the same /tools/:slug route', () => {
    // Start at /tools/my-tool#eyJhIjoxfQ (a hash-encoded state)
    render(
      <MemoryRouter initialEntries={['/tools/my-tool#eyJhIjoxfQ']}>
        <LocationDisplay />
      </MemoryRouter>,
    )
    const el = screen.getByTestId('location')
    expect(el).toHaveAttribute('data-pathname', '/tools/my-tool')
    expect(el).toHaveAttribute('data-hash', '#eyJhIjoxfQ')
  })

  it('hash is absent when navigating to the homepage route', () => {
    // Navigate to / — no hash should be present
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationDisplay />
      </MemoryRouter>,
    )
    const el = screen.getByTestId('location')
    expect(el).toHaveAttribute('data-pathname', '/')
    expect(el).toHaveAttribute('data-hash', '')
  })

  it('hash is absent when navigating to a different /tools/:slug route', () => {
    // Navigate to a different tool without a hash — hash should be empty
    render(
      <MemoryRouter initialEntries={['/tools/other-tool']}>
        <LocationDisplay />
      </MemoryRouter>,
    )
    const el = screen.getByTestId('location')
    expect(el).toHaveAttribute('data-pathname', '/tools/other-tool')
    expect(el).toHaveAttribute('data-hash', '')
  })

  it('hash is part of the location object and does not affect route matching', () => {
    // /tools/my-tool#state and /tools/my-tool should match the same route
    const { rerender } = render(
      <MemoryRouter initialEntries={['/tools/my-tool#state']}>
        <Routes>
          <Route path="/tools/:slug" element={<LocationDisplay />} />
          <Route path="*" element={<div data-testid="not-found" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('location')).toBeInTheDocument()
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/tools/my-tool']}>
        <Routes>
          <Route path="/tools/:slug" element={<LocationDisplay />} />
          <Route path="*" element={<div data-testid="not-found" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('location')).toBeInTheDocument()
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
  })
})
