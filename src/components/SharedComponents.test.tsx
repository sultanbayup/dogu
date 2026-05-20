/**
 * Unit tests for shared components.
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 7.2, 7.3, 7.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from './MotionProvider'
import { Header } from './Header'
import { ToolCard } from './ToolCard'
import { SearchBar } from './SearchBar'
import { CopyButton } from './CopyButton'
import { EmptyState } from './EmptyState'
import { ResultCard } from './ResultCard'
import type { ToolMetadata } from '../tools/registry'
import { Wrench } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <MotionProvider>{children}</MotionProvider>
    </MemoryRouter>
  )
}

const mockTool: ToolMetadata = {
  slug: 'test-tool',
  name: 'Test Tool',
  description: 'A tool for testing purposes',
  category: 'utility',
  icon: Wrench,
  popular: false,
  component: () => Promise.resolve({ default: () => null }),
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe('Header', () => {
  it('renders a link that points to "/"', () => {
    render(<MemoryRouter><Header /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })

  it('link has an accessible label that mentions Dogu', () => {
    render(<MemoryRouter><Header /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('aria-label')).toMatch(/dogu/i)
  })

  it('renders the SVG logo inside the link', () => {
    const { container } = render(<MemoryRouter><Header /></MemoryRouter>)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders inside a header landmark', () => {
    render(<MemoryRouter><Header /></MemoryRouter>)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ToolCard
// ---------------------------------------------------------------------------

describe('ToolCard', () => {
  it('renders the tool name', () => {
    render(<AllProviders><ToolCard tool={mockTool} /></AllProviders>)
    expect(screen.getByText('Test Tool')).toBeInTheDocument()
  })

  it('renders the tool description', () => {
    render(<AllProviders><ToolCard tool={mockTool} /></AllProviders>)
    expect(screen.getByText('A tool for testing purposes')).toBeInTheDocument()
  })

  it('renders the icon svg element', () => {
    const { container } = render(<AllProviders><ToolCard tool={mockTool} /></AllProviders>)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('links to the correct route /tools/<slug>', () => {
    render(<AllProviders><ToolCard tool={mockTool} /></AllProviders>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/tools/test-tool')
  })

  it('has an aria-label combining name and description', () => {
    render(<AllProviders><ToolCard tool={mockTool} /></AllProviders>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('aria-label')).toContain('Test Tool')
    expect(link.getAttribute('aria-label')).toContain('A tool for testing purposes')
  })
})

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

describe('SearchBar', () => {
  it('calls onChange on every keystroke', () => {
    const handleChange = vi.fn()
    render(<SearchBar value="" onChange={handleChange} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'h' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith('h')
  })

  it('calls onChange when input is cleared', () => {
    const handleChange = vi.fn()
    render(<SearchBar value="hello" onChange={handleChange} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '' } })
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('does NOT call onChange when input exceeds 200 characters', () => {
    const handleChange = vi.fn()
    render(<SearchBar value="" onChange={handleChange} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'a'.repeat(201) } })
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('calls onChange when input is exactly 200 characters', () => {
    const handleChange = vi.fn()
    render(<SearchBar value="" onChange={handleChange} />)
    const input = screen.getByRole('searchbox')
    const exactly200 = 'a'.repeat(200)
    fireEvent.change(input, { target: { value: exactly200 } })
    expect(handleChange).toHaveBeenCalledWith(exactly200)
  })

  it('has an accessible label Search tools', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)
    expect(screen.getByRole('searchbox', { name: /search tools/i })).toBeInTheDocument()
  })

  it('reflects the controlled value prop', () => {
    render(<SearchBar value="react" onChange={vi.fn()} />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('react')
  })
})

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is disabled when payload is empty string', () => {
    render(<MotionProvider><CopyButton payload="" /></MotionProvider>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is enabled when payload is non-empty', () => {
    render(<MotionProvider><CopyButton payload="hello" /></MotionProvider>)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('shows custom label in idle state', () => {
    render(<MotionProvider><CopyButton payload="hello" label="Copy result" /></MotionProvider>)
    expect(screen.getByRole('button')).toHaveTextContent('Copy result')
  })

  it('idle to copied: shows Copied after successful clipboard write', async () => {
    render(<MotionProvider><CopyButton payload="hello" /></MotionProvider>)
    const button = screen.getByRole('button')
    await act(async () => { fireEvent.click(button) })
    expect(button).toHaveTextContent('Copied')
  })

  it('copied to idle: reverts after 2 s', async () => {
    render(<MotionProvider><CopyButton payload="hello" /></MotionProvider>)
    const button = screen.getByRole('button')
    await act(async () => { fireEvent.click(button) })
    expect(button).toHaveTextContent('Copied')
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(button).toHaveTextContent('Copy')
  })

  it('idle to error: shows Copy failed when clipboard write rejects', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'))
    render(<MotionProvider><CopyButton payload="hello" /></MotionProvider>)
    const button = screen.getByRole('button')
    await act(async () => { fireEvent.click(button) })
    expect(button).toHaveTextContent('Copy failed')
  })

  it('error to idle: reverts after 3 s', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'))
    render(<MotionProvider><CopyButton payload="hello" /></MotionProvider>)
    const button = screen.getByRole('button')
    await act(async () => { fireEvent.click(button) })
    expect(button).toHaveTextContent('Copy failed')
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(button).toHaveTextContent('Copy')
  })

  it('ignores repeated clicks while in copied state', async () => {
    render(<MotionProvider><CopyButton payload="hello" /></MotionProvider>)
    const button = screen.getByRole('button')
    await act(async () => { fireEvent.click(button) })
    expect(button).toHaveTextContent('Copied')
    const callCount = vi.mocked(navigator.clipboard.writeText).mock.calls.length
    await act(async () => { fireEvent.click(button) })
    expect(vi.mocked(navigator.clipboard.writeText).mock.calls.length).toBe(callCount)
  })

  it('calls onError callback when clipboard write fails', async () => {
    const onError = vi.fn()
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'))
    render(<MotionProvider><CopyButton payload="hello" onError={onError} /></MotionProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('button')) })
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe('EmptyState', () => {
  it('renders the message text', () => {
    render(<EmptyState message="No results found" />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('does not render action element when action is not provided', () => {
    const { container } = render(<EmptyState message="Nothing here" />)
    expect(container.querySelectorAll('button, a')).toHaveLength(0)
  })

  it('renders the optional action element when provided', () => {
    render(<EmptyState message="Nothing here" action={<button>Retry</button>} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('has role status for live-region announcements', () => {
    render(<EmptyState message="Empty" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------

describe('ResultCard', () => {
  it('renders children content', () => {
    render(<MotionProvider><ResultCard copyPayload="output"><p>Tool output here</p></ResultCard></MotionProvider>)
    expect(screen.getByText('Tool output here')).toBeInTheDocument()
  })

  it('renders a CopyButton', () => {
    render(<MotionProvider><ResultCard copyPayload="output"><p>Content</p></ResultCard></MotionProvider>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('CopyButton is enabled when copyPayload is non-empty', () => {
    render(<MotionProvider><ResultCard copyPayload="some output"><p>Content</p></ResultCard></MotionProvider>)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('CopyButton is disabled when copyPayload is empty', () => {
    render(<MotionProvider><ResultCard copyPayload=""><p>Content</p></ResultCard></MotionProvider>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders multiple children correctly', () => {
    render(
      <MotionProvider>
        <ResultCard copyPayload="data">
          <span>Line 1</span>
          <span>Line 2</span>
        </ResultCard>
      </MotionProvider>
    )
    expect(screen.getByText('Line 1')).toBeInTheDocument()
    expect(screen.getByText('Line 2')).toBeInTheDocument()
  })
})