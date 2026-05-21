/**
 * Unit tests for Spin Wheel component.
 *
 * Requirements: 5.1, 5.3, 5.9, 6.2, 6.6, 6.8, 6.9
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../components/MotionProvider'
import SpinWheelTool from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useLocalStorage to avoid real localStorage interaction
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(),
}))

// Mock useReducedMotion to control reduced motion behavior
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(),
}))

// Mock selectItem and computeTargetAngle to control spin results
vi.mock('./selectItem', () => ({
  selectItem: vi.fn(),
  computeTargetAngle: vi.fn(),
}))

// Mock canvas-confetti to avoid real confetti
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

// Mock WheelCanvas to avoid canvas rendering issues in jsdom
vi.mock('./WheelCanvas', () => ({ default: () => <div data-testid="wheel-canvas" /> }))

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { selectItem, computeTargetAngle } from './selectItem'
import type { SpinItem } from './WheelCanvas'

const mockUseLocalStorage = vi.mocked(useLocalStorage)
const mockUseReducedMotion = vi.mocked(useReducedMotion)
const mockSelectItem = vi.mocked(selectItem)
const mockComputeTargetAngle = vi.mocked(computeTargetAngle)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StorageState {
  items: SpinItem[]
  weighted: boolean
}

const DEFAULT_ITEMS: SpinItem[] = [
  { label: 'Option 1', weight: 1 },
  { label: 'Option 2', weight: 1 },
]

function setupMocks(
  storageState: StorageState = { items: DEFAULT_ITEMS, weighted: false },
  reducedMotion = false,
) {
  const setStorage = vi.fn()
  mockUseLocalStorage.mockReturnValue([storageState, setStorage] as ReturnType<typeof useLocalStorage>)
  mockUseReducedMotion.mockReturnValue(reducedMotion)
  // Default: selectItem returns 0, computeTargetAngle returns 0
  mockSelectItem.mockReturnValue(0)
  mockComputeTargetAngle.mockReturnValue(0)
  return { setStorage }
}

function renderTool() {
  return render(
    <MemoryRouter>
      <MotionProvider>
        <SpinWheelTool />
      </MotionProvider>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpinWheelTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Requirement 5.1 ──────────────────────────────────────────────────────

  describe('renders with correct title', () => {
    it('displays "Spin Wheel" as the page heading', () => {
      setupMocks()
      renderTool()
      expect(screen.getByRole('heading', { name: 'Spin Wheel' })).toBeInTheDocument()
    })
  })

  // ── Requirement 5.3 ──────────────────────────────────────────────────────

  describe('spin button disabled with fewer than 2 valid items', () => {
    it('is disabled when item list has only 1 valid item', () => {
      setupMocks({
        items: [{ label: 'Only One', weight: 1 }],
        weighted: false,
      })
      renderTool()
      // There are two spin buttons (one in main controls, one in fullscreen overlay)
      // The main one is the first one rendered outside fullscreen
      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      expect(spinButtons[0]).toBeDisabled()
    })

    it('is disabled when item list is empty', () => {
      setupMocks({ items: [], weighted: false })
      renderTool()
      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      expect(spinButtons[0]).toBeDisabled()
    })

    it('is enabled when item list has 2 or more valid items', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 1 },
          { label: 'Item B', weight: 1 },
        ],
        weighted: false,
      })
      renderTool()
      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      expect(spinButtons[0]).not.toBeDisabled()
    })

    it('is enabled when item list has 3 valid items', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 1 },
          { label: 'Item B', weight: 1 },
          { label: 'Item C', weight: 1 },
        ],
        weighted: false,
      })
      renderTool()
      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      expect(spinButtons[0]).not.toBeDisabled()
    })
  })

  // ── Requirement 5.9 ──────────────────────────────────────────────────────

  describe('inline validation for weight out-of-range (weighted mode)', () => {
    it('shows inline validation message when weight is 0 (below minimum)', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 0 },
          { label: 'Item B', weight: 1 },
        ],
        weighted: true,
      })
      renderTool()
      expect(screen.getByText(/weight must be an integer between 1 and 1000/i)).toBeInTheDocument()
    })

    it('shows inline validation message when weight is 1001 (above maximum)', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 1001 },
          { label: 'Item B', weight: 1 },
        ],
        weighted: true,
      })
      renderTool()
      expect(screen.getByText(/weight must be an integer between 1 and 1000/i)).toBeInTheDocument()
    })

    it('does not show weight validation message when weighted mode is off', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 0 },
          { label: 'Item B', weight: 1 },
        ],
        weighted: false,
      })
      renderTool()
      expect(screen.queryByText(/weight must be an integer between 1 and 1000/i)).not.toBeInTheDocument()
    })

    it('does not show weight validation message when all weights are valid', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 5 },
          { label: 'Item B', weight: 10 },
        ],
        weighted: true,
      })
      renderTool()
      expect(screen.queryByText(/weight must be an integer between 1 and 1000/i)).not.toBeInTheDocument()
    })

    it('spin button is disabled when any weight is invalid in weighted mode', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 0 },
          { label: 'Item B', weight: 1 },
        ],
        weighted: true,
      })
      renderTool()
      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      expect(spinButtons[0]).toBeDisabled()
    })

    it('spin button is enabled when all weights are valid in weighted mode', () => {
      setupMocks({
        items: [
          { label: 'Item A', weight: 100 },
          { label: 'Item B', weight: 200 },
        ],
        weighted: true,
      })
      renderTool()
      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      expect(spinButtons[0]).not.toBeDisabled()
    })
  })

  // ── Requirements 6.6, 6.8 ────────────────────────────────────────────────

  describe('result card appears after spin (reduced motion)', () => {
    it('shows result card after spin completes with reduced motion', () => {
      setupMocks(
        {
          items: [
            { label: 'Apple', weight: 1 },
            { label: 'Banana', weight: 1 },
          ],
          weighted: false,
        },
        true, // reduced motion = true → skips rAF, shows result immediately
      )
      mockSelectItem.mockReturnValue(0) // selects index 0 → "Apple"
      mockComputeTargetAngle.mockReturnValue(Math.PI)

      renderTool()

      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      fireEvent.click(spinButtons[0])

      // Result card should appear with the winning item
      expect(screen.getByText('Apple')).toBeInTheDocument()
    })

    it('shows the correct winning item in the result card', () => {
      setupMocks(
        {
          items: [
            { label: 'Red', weight: 1 },
            { label: 'Blue', weight: 1 },
            { label: 'Green', weight: 1 },
          ],
          weighted: false,
        },
        true,
      )
      mockSelectItem.mockReturnValue(2) // selects index 2 → "Green"
      mockComputeTargetAngle.mockReturnValue(0)

      renderTool()

      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      fireEvent.click(spinButtons[0])

      expect(screen.getByText('Green')).toBeInTheDocument()
    })

    it('does not show result card before any spin', () => {
      setupMocks(
        {
          items: [
            { label: 'Apple', weight: 1 },
            { label: 'Banana', weight: 1 },
          ],
          weighted: false,
        },
        true,
      )
      renderTool()
      // "Result" label should not be present before spinning
      expect(screen.queryByText('Result')).not.toBeInTheDocument()
    })
  })

  // ── Requirement 6.9 ──────────────────────────────────────────────────────

  describe('previous result is cleared when a new spin begins', () => {
    it('clears the previous result when a new spin starts', () => {
      setupMocks(
        {
          items: [
            { label: 'Alpha', weight: 1 },
            { label: 'Beta', weight: 1 },
          ],
          weighted: false,
        },
        true, // reduced motion — results appear immediately
      )

      // First spin: select index 0 → "Alpha"
      mockSelectItem.mockReturnValue(0)
      mockComputeTargetAngle.mockReturnValue(0)

      renderTool()

      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      fireEvent.click(spinButtons[0])
      expect(screen.getByText('Alpha')).toBeInTheDocument()

      // Second spin: select index 1 → "Beta"
      mockSelectItem.mockReturnValue(1)
      mockComputeTargetAngle.mockReturnValue(Math.PI)

      fireEvent.click(spinButtons[0])

      // "Alpha" should be gone, "Beta" should be shown
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })
  })

  // ── Requirement 6.6 ──────────────────────────────────────────────────────

  describe('reduced motion: result shown immediately without animation', () => {
    it('shows result immediately when reduced motion is enabled', () => {
      setupMocks(
        {
          items: [
            { label: 'Fast', weight: 1 },
            { label: 'Slow', weight: 1 },
          ],
          weighted: false,
        },
        true, // reduced motion
      )
      mockSelectItem.mockReturnValue(0) // → "Fast"
      mockComputeTargetAngle.mockReturnValue(0)

      renderTool()

      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      fireEvent.click(spinButtons[0])

      // Result should be visible immediately (no rAF delay)
      expect(screen.getByText('Fast')).toBeInTheDocument()
    })

    it('spin button is re-enabled immediately after spin with reduced motion', () => {
      setupMocks(
        {
          items: [
            { label: 'X', weight: 1 },
            { label: 'Y', weight: 1 },
          ],
          weighted: false,
        },
        true,
      )
      mockSelectItem.mockReturnValue(0)
      mockComputeTargetAngle.mockReturnValue(0)

      renderTool()

      const spinButtons = screen.getAllByRole('button', { name: /spin the wheel/i })
      fireEvent.click(spinButtons[0])

      // After reduced-motion spin completes synchronously, button should be enabled again
      expect(spinButtons[0]).not.toBeDisabled()
    })
  })
})
