/**
 * Unit tests for Team Splitter component.
 *
 * Requirements: 2.1, 2.3, 2.5, 3.3, 3.4, 3.6, 2.7
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../components/MotionProvider'
import TeamSplitterTool from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useLocalStorage to avoid real localStorage interaction
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(),
}))

// Mock useUrlHashState to avoid real URL hash interaction
vi.mock('../../hooks/useUrlHashState', () => ({
  useUrlHashState: vi.fn(),
}))

// Mock canvas-confetti to avoid jsdom canvas errors
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useUrlHashState } from '../../hooks/useUrlHashState'

const mockUseLocalStorage = vi.mocked(useLocalStorage)
const mockUseUrlHashState = vi.mocked(useUrlHashState)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StorageState {
  namesText: string
  teamCount: number
  balanced: boolean
}

function setupMocks(
  storageState: StorageState = { namesText: '', teamCount: 2, balanced: true },
  hashResult: string[][] | null = null,
) {
  const setStorage = vi.fn()
  const setHashResult = vi.fn()

  mockUseLocalStorage.mockReturnValue([storageState, setStorage] as ReturnType<typeof useLocalStorage>)
  mockUseUrlHashState.mockReturnValue([hashResult, setHashResult] as ReturnType<typeof useUrlHashState>)

  return { setStorage, setHashResult }
}

function renderTool() {
  return render(
    <MemoryRouter>
      <MotionProvider>
        <TeamSplitterTool />
      </MotionProvider>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TeamSplitterTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Requirement 2.1 ──────────────────────────────────────────────────────

  describe('renders with correct title', () => {
    it('displays "Team Splitter" as the page heading', () => {
      setupMocks()
      renderTool()
      expect(screen.getByRole('heading', { name: 'Team Splitter' })).toBeInTheDocument()
    })
  })

  // ── Requirement 2.3 ──────────────────────────────────────────────────────

  describe('generate button disabled with fewer than 2 names', () => {
    it('is disabled when textarea is empty', () => {
      setupMocks({ namesText: '', teamCount: 2, balanced: true })
      renderTool()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeDisabled()
    })

    it('is disabled when textarea has only one non-empty line', () => {
      setupMocks({ namesText: 'Alice', teamCount: 2, balanced: true })
      renderTool()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeDisabled()
    })

    it('is disabled when textarea has only blank lines', () => {
      setupMocks({ namesText: '\n\n\n', teamCount: 2, balanced: true })
      renderTool()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeDisabled()
    })

    it('is enabled when textarea has two or more non-empty lines', () => {
      setupMocks({ namesText: 'Alice\nBob', teamCount: 2, balanced: true })
      renderTool()
      expect(screen.getByRole('button', { name: /split teams/i })).not.toBeDisabled()
    })
  })

  // ── Requirement 2.5 ──────────────────────────────────────────────────────

  describe('inline validation for K out-of-range', () => {
    it('shows "Must be between 2 and 20" and disables button when K < 2', () => {
      setupMocks({ namesText: 'Alice\nBob\nCarol', teamCount: 1, balanced: true })
      renderTool()
      expect(screen.getByText(/must be between 2 and 20/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeDisabled()
    })

    it('shows "Must be between 2 and 20" and disables button when K > 20', () => {
      setupMocks({ namesText: 'Alice\nBob\nCarol', teamCount: 21, balanced: true })
      renderTool()
      expect(screen.getByText(/must be between 2 and 20/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeDisabled()
    })

    it('does not show K validation message when K is valid', () => {
      setupMocks({ namesText: 'Alice\nBob', teamCount: 2, balanced: true })
      renderTool()
      expect(screen.queryByText(/must be between 2 and 20/i)).not.toBeInTheDocument()
    })
  })

  describe('inline validation when K exceeds participant count', () => {
    it('shows "Fewer names than teams" and disables button when K > N', () => {
      setupMocks({ namesText: 'Alice\nBob', teamCount: 3, balanced: true })
      renderTool()
      expect(screen.getByText(/fewer names than teams/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeDisabled()
    })
  })

  // ── Requirement 3.3 ──────────────────────────────────────────────────────

  describe('result card appears after generate', () => {
    it('does not show result when hashResult is null', () => {
      setupMocks({ namesText: 'Alice\nBob', teamCount: 2, balanced: true }, null)
      renderTool()
      expect(screen.queryByText(/^Team Blue$/)).not.toBeInTheDocument()
    })

    it('shows team cards with colour labels when hashResult is populated', () => {
      setupMocks(
        { namesText: 'Alice\nBob', teamCount: 2, balanced: true },
        [['Alice'], ['Bob']],
      )
      renderTool()
      expect(screen.getByText('Team Blue')).toBeInTheDocument()
      expect(screen.getByText('Team Red')).toBeInTheDocument()
    })

    it('shows team members as individual list items in the result', () => {
      setupMocks(
        { namesText: 'Alice\nBob\nCarol', teamCount: 2, balanced: true },
        [['Alice', 'Carol'], ['Bob']],
      )
      renderTool()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Carol')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('calls setHashResult when split button is clicked with valid inputs', () => {
      const { setHashResult } = setupMocks(
        { namesText: 'Alice\nBob', teamCount: 2, balanced: true },
        null,
      )
      renderTool()
      fireEvent.click(screen.getByRole('button', { name: /split teams/i }))
      expect(setHashResult).toHaveBeenCalledTimes(1)
      // The result should be a 2D array with 2 teams
      const result = setHashResult.mock.calls[0][0] as string[][]
      expect(result).toHaveLength(2)
      expect(result.flat().sort()).toEqual(['Alice', 'Bob'])
    })
  })

  // ── Requirement 3.4 ──────────────────────────────────────────────────────

  describe('reshuffle button present after result', () => {
    it('shows reshuffle button when a result is displayed', () => {
      setupMocks(
        { namesText: 'Alice\nBob', teamCount: 2, balanced: true },
        [['Alice'], ['Bob']],
      )
      renderTool()
      expect(screen.getByRole('button', { name: /reshuffle/i })).toBeInTheDocument()
    })

    it('does not show reshuffle button when no result is displayed', () => {
      setupMocks({ namesText: 'Alice\nBob', teamCount: 2, balanced: true }, null)
      renderTool()
      expect(screen.queryByRole('button', { name: /reshuffle/i })).not.toBeInTheDocument()
    })

    it('calls setHashResult when reshuffle button is clicked', () => {
      const { setHashResult } = setupMocks(
        { namesText: 'Alice\nBob', teamCount: 2, balanced: true },
        [['Alice'], ['Bob']],
      )
      renderTool()
      fireEvent.click(screen.getByRole('button', { name: /reshuffle/i }))
      expect(setHashResult).toHaveBeenCalledTimes(1)
    })
  })

  // ── Requirement 3.6 ──────────────────────────────────────────────────────

  describe('copy payload format', () => {
    it('result shows team members as individual items', () => {
      setupMocks(
        { namesText: 'Alice\nBob\nCarol', teamCount: 2, balanced: true },
        [['Alice', 'Carol'], ['Bob']],
      )
      renderTool()
      expect(screen.getByText('Team Blue')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Carol')).toBeInTheDocument()
      expect(screen.getByText('Team Red')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('copy button is enabled when result is present', () => {
      setupMocks(
        { namesText: 'Alice\nBob', teamCount: 2, balanced: true },
        [['Alice'], ['Bob']],
      )
      renderTool()
      // The CopyButton should be enabled (non-empty payload)
      const copyButton = screen.getByRole('button', { name: /copy/i })
      expect(copyButton).not.toBeDisabled()
    })
  })

  // ── Requirement 2.7 (localStorage persistence) ───────────────────────────

  describe('localStorage persistence', () => {
    it('calls setStorage when names textarea changes', () => {
      const { setStorage } = setupMocks({ namesText: '', teamCount: 2, balanced: true })
      renderTool()
      const textarea = screen.getByRole('textbox', { name: /participant names/i })
      fireEvent.change(textarea, { target: { value: 'Alice\nBob' } })
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({ namesText: 'Alice\nBob' }),
      )
    })

    it('calls setStorage when team count input changes', () => {
      const { setStorage } = setupMocks({ namesText: 'Alice\nBob', teamCount: 2, balanced: true })
      renderTool()
      const input = screen.getByRole('spinbutton', { name: /number of teams/i })
      fireEvent.change(input, { target: { value: '3' } })
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({ teamCount: 3 }),
      )
    })

    it('calls setStorage when balanced mode toggle changes', () => {
      const { setStorage } = setupMocks({ namesText: 'Alice\nBob', teamCount: 2, balanced: true })
      renderTool()
      const toggle = screen.getByRole('switch', { name: /balanced mode/i })
      fireEvent.click(toggle)
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({ balanced: false }),
      )
    })
  })

  // ── Requirement 2.7 (URL hash decode on load) ────────────────────────────

  describe('URL hash decode on load', () => {
    it('displays result immediately when hashResult is decoded from URL on load', () => {
      setupMocks(
        { namesText: '', teamCount: 2, balanced: true },
        [['Alice', 'Bob'], ['Carol', 'Dave']],
      )
      renderTool()
      expect(screen.getByText('Team Blue')).toBeInTheDocument()
      expect(screen.getByText('Team Red')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Carol')).toBeInTheDocument()
      expect(screen.getByText('Dave')).toBeInTheDocument()
    })

    it('shows default form state when hashResult is null (no hash or decode failure)', () => {
      setupMocks({ namesText: '', teamCount: 2, balanced: true }, null)
      renderTool()
      expect(screen.queryByText('Team Blue')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /split teams/i })).toBeInTheDocument()
    })
  })
})
