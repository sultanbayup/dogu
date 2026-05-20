/**
 * Unit tests for pages and routing.
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 12.1
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '../components/ThemeProvider'
import { MotionProvider } from '../components/MotionProvider'
import { HomePage } from './HomePage'
import { ToolPage } from './ToolPage'
import { NotFoundPage } from './NotFoundPage'

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  )
}

function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {},
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Providers>{ui}</Providers>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('renders the Dogu wordmark', () => {
    renderWithRouter(<HomePage />)
    expect(screen.getByRole('heading', { level: 1, name: /dogu/i })).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    renderWithRouter(<HomePage />)
    expect(screen.getByText(/tiny tools that just work/i)).toBeInTheDocument()
  })

  it('renders the search bar', () => {
    renderWithRouter(<HomePage />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders the empty registry state when tools array is empty', () => {
    renderWithRouter(<HomePage />)
    expect(screen.getByText(/no tools are available yet/i)).toBeInTheDocument()
  })

  it('does not render any ToolCard links when registry is empty', () => {
    renderWithRouter(<HomePage />)
    const toolLinks = screen
      .queryAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/tools/'))
    expect(toolLinks).toHaveLength(0)
  })
})

describe('NotFoundPage', () => {
  it('renders a 404 indicator', () => {
    renderWithRouter(<NotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders a link back to home', () => {
    renderWithRouter(<NotFoundPage />)
    const homeLink = screen.getByRole('link', { name: /back to dogu home/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('renders a descriptive message', () => {
    renderWithRouter(<NotFoundPage />)
    expect(screen.getByText(/couldn.t find that page/i)).toBeInTheDocument()
  })
})

describe('ToolPage - unknown slug', () => {
  function renderToolPage(slug: string) {
    return render(
      <MemoryRouter initialEntries={['/tools/' + slug]}>
        <Providers>
          <Routes>
            <Route path="/tools/:slug" element={<ToolPage />} />
          </Routes>
        </Providers>
      </MemoryRouter>,
    )
  }

  it('renders NotFoundPage for an unknown slug', () => {
    renderToolPage('nonexistent-tool')
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders the home link from NotFoundPage for an unknown slug', () => {
    renderToolPage('some-random-slug')
    const homeLink = screen.getByRole('link', { name: /back to dogu home/i })
    expect(homeLink).toHaveAttribute('href', '/')
  })
})

describe('Router path matching', () => {
  function renderApp(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Providers>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tools/:slug" element={<ToolPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Providers>
      </MemoryRouter>,
    )
  }

  it('renders HomePage at root path', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: /dogu/i })).toBeInTheDocument()
  })

  it('renders NotFoundPage for an unknown /tools/:slug path', () => {
    renderApp('/tools/no-such-tool')
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders NotFoundPage for a completely unknown path', () => {
    renderApp('/this/does/not/exist')
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('does not render HomePage search bar at /tools/:slug', () => {
    renderApp('/tools/some-slug')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('does not render 404 at root path', () => {
    renderApp('/')
    expect(screen.queryByText('404')).not.toBeInTheDocument()
  })
})