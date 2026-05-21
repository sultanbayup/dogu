/**
 * Unit tests for Split Bill component — Simple mode.
 *
 * Requirements: 8.1, 8.6, 8.7, 9.3, 9.4, 9.6, 9.7
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../components/MotionProvider'
import SplitBillTool from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(),
}))

import { useLocalStorage } from '../../hooks/useLocalStorage'

const mockUseLocalStorage = vi.mocked(useLocalStorage)

// ---------------------------------------------------------------------------
// Helpers — new nested storage shape
// ---------------------------------------------------------------------------

interface SimpleBillStorage {
  subtotal: string
  people: number
  tax: number
  serviceCharge: number
}

function makeStorage(simple: Partial<SimpleBillStorage> = {}) {
  return {
    mode: 'simple' as const,
    simple: {
      subtotal: '',
      people: 1,
      tax: 0,
      serviceCharge: 0,
      ...simple,
    },
    itemized: {
      persons: [
        { name: '', items: [{ name: '', price: '' }] },
        { name: '', items: [{ name: '', price: '' }] },
      ],
      tax: 0,
      serviceCharge: 0,
      sharedCostMode: 'proportional' as const,
    },
  }
}

function setupMocks(simple: Partial<SimpleBillStorage> = {}) {
  const setStorage = vi.fn()
  mockUseLocalStorage.mockReturnValue([makeStorage(simple), setStorage] as ReturnType<typeof useLocalStorage>)
  return { setStorage }
}

function renderTool() {
  return render(
    <MemoryRouter>
      <MotionProvider>
        <SplitBillTool />
      </MotionProvider>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SplitBillTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('renders with correct title', () => {
    it('displays "Split Bill" as the page heading', () => {
      setupMocks()
      renderTool()
      expect(screen.getByRole('heading', { name: 'Split Bill' })).toBeInTheDocument()
    })
  })

  describe('calculate button disabled when subtotal is empty', () => {
    it('is disabled on initial render with empty subtotal', () => {
      setupMocks()
      renderTool()
      expect(screen.getByRole('button', { name: /calculate/i })).toBeDisabled()
    })

    it('is disabled when subtotal is zero', () => {
      setupMocks({ subtotal: '0' })
      renderTool()
      expect(screen.getByRole('button', { name: /calculate/i })).toBeDisabled()
    })

    it('is disabled when subtotal is negative', () => {
      setupMocks({ subtotal: '-5' })
      renderTool()
      expect(screen.getByRole('button', { name: /calculate/i })).toBeDisabled()
    })

    it('is enabled when subtotal is a valid positive number', () => {
      setupMocks({ subtotal: '100' })
      renderTool()
      expect(screen.getByRole('button', { name: /calculate/i })).not.toBeDisabled()
    })
  })

  describe('inline validation messages', () => {
    it('shows "Enter a positive amount" when subtotal is non-empty but zero', () => {
      setupMocks({ subtotal: '0' })
      renderTool()
      expect(screen.getByText(/enter a positive amount/i)).toBeInTheDocument()
    })

    it('shows "Enter a positive amount" when subtotal is negative', () => {
      setupMocks({ subtotal: '-10' })
      renderTool()
      expect(screen.getByText(/enter a positive amount/i)).toBeInTheDocument()
    })

    it('does not apply error border when subtotal is valid', () => {
      setupMocks({ subtotal: '50' })
      renderTool()
      const input = screen.getByRole('spinbutton', { name: /bill subtotal/i })
      expect(input.className).not.toContain('border-red-500')
    })

    it('shows "Must be 1–100" when people count is 0', () => {
      setupMocks({ subtotal: '100', people: 0 })
      renderTool()
      expect(screen.getByText(/must be 1.{0,3}100/i)).toBeInTheDocument()
    })

    it('shows "Must be 1–100" when people count is 101', () => {
      setupMocks({ subtotal: '100', people: 101 })
      renderTool()
      expect(screen.getByText(/must be 1.{0,3}100/i)).toBeInTheDocument()
    })

    it('does not show people error when people count is valid', () => {
      setupMocks({ subtotal: '100', people: 5 })
      renderTool()
      expect(screen.queryByText(/must be 1.{0,3}100/i)).not.toBeInTheDocument()
    })

    it('disables calculate button when people count is out of range', () => {
      setupMocks({ subtotal: '100', people: 0 })
      renderTool()
      expect(screen.getByRole('button', { name: /calculate/i })).toBeDisabled()
    })
  })

  describe('result card hidden initially', () => {
    it('does not show result card on initial render with empty subtotal', () => {
      setupMocks()
      renderTool()
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    })

    it('does not show result card when subtotal is invalid (negative)', () => {
      setupMocks({ subtotal: '-5' })
      renderTool()
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    })
  })

  describe('result card appears after valid inputs are entered', () => {
    it('shows result card (copy button) when subtotal and people are valid', () => {
      setupMocks({ subtotal: '100', people: 2, tax: 0, serviceCharge: 0 })
      renderTool()
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    it('shows per-person amount in result card', () => {
      setupMocks({ subtotal: '100', people: 2, tax: 0, serviceCharge: 0 })
      renderTool()
      expect(screen.getByText('50.00')).toBeInTheDocument()
    })

    it('shows total in result card', () => {
      setupMocks({ subtotal: '100', people: 2, tax: 10, serviceCharge: 0 })
      renderTool()
      expect(screen.getByText('110.00')).toBeInTheDocument()
    })
  })

  describe('result card hidden when input becomes invalid', () => {
    it('does not show result card when subtotal is empty', () => {
      setupMocks({ subtotal: '', people: 2, tax: 0, serviceCharge: 0 })
      renderTool()
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    })

    it('does not show result card when people count is invalid', () => {
      setupMocks({ subtotal: '100', people: 0, tax: 0, serviceCharge: 0 })
      renderTool()
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    })
  })

  describe('all monetary values formatted to 2 decimal places', () => {
    it('formats subtotal to 2 decimal places', () => {
      setupMocks({ subtotal: '100', people: 1, tax: 8, serviceCharge: 0 })
      renderTool()
      const matches = screen.getAllByText('100.00')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it('formats tax amount to 2 decimal places', () => {
      setupMocks({ subtotal: '100', people: 1, tax: 8, serviceCharge: 0 })
      renderTool()
      expect(screen.getByText('8.00')).toBeInTheDocument()
    })

    it('formats service charge amount to 2 decimal places', () => {
      setupMocks({ subtotal: '100', people: 1, tax: 0, serviceCharge: 10 })
      renderTool()
      expect(screen.getByText('10.00')).toBeInTheDocument()
    })

    it('formats per-person amount to 2 decimal places', () => {
      setupMocks({ subtotal: '10', people: 3, tax: 0, serviceCharge: 0 })
      renderTool()
      expect(screen.getByText('3.33')).toBeInTheDocument()
    })
  })

  describe('copy payload format', () => {
    it('copy button is enabled when result is present', () => {
      setupMocks({ subtotal: '100', people: 2, tax: 8, serviceCharge: 10 })
      renderTool()
      const copyButton = screen.getByRole('button', { name: /copy/i })
      expect(copyButton).not.toBeDisabled()
    })

    it('result card shows all five breakdown labels', () => {
      setupMocks({ subtotal: '100', people: 2, tax: 8, serviceCharge: 10 })
      renderTool()
      const subtotalMatches = screen.getAllByText('Subtotal')
      expect(subtotalMatches.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/tax.*8.*%/i)).toBeInTheDocument()
      expect(screen.getByText(/service.*10.*%/i)).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText(/per person.*2/i)).toBeInTheDocument()
    })

    it('copy payload matches spec format: Subtotal: X.XX\\nTax (Y%): Z.XX\\n...', async () => {
      setupMocks({ subtotal: '100', people: 2, tax: 8, serviceCharge: 10 })
      renderTool()

      const copyButton = screen.getByRole('button', { name: /copy/i })
      fireEvent.click(copyButton)

      const expectedPayload = [
        'Subtotal: 100.00',
        'Tax (8%): 8.00',
        'Service (10%): 10.00',
        'Total: 118.80',
        'Per person (2): 59.40',
      ].join('\n')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedPayload)
    })
  })

  describe('input change handlers call setStorage', () => {
    it('calls setStorage when subtotal input changes', () => {
      const { setStorage } = setupMocks()
      renderTool()
      const input = screen.getByRole('spinbutton', { name: /bill subtotal/i })
      fireEvent.change(input, { target: { value: '50' } })
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          simple: expect.objectContaining({ subtotal: '50' }),
        }),
      )
    })

    it('calls setStorage when people input changes', () => {
      const { setStorage } = setupMocks({ subtotal: '100' })
      renderTool()
      const input = screen.getByRole('spinbutton', { name: /number of people/i })
      fireEvent.change(input, { target: { value: '4' } })
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          simple: expect.objectContaining({ people: 4 }),
        }),
      )
    })
  })
})
