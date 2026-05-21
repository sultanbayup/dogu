/**
 * Unit tests for QR Generator component.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 11.8, 11.9, 12.3, 12.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../components/MotionProvider'
import QrGeneratorTool from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useLocalStorage to control state in tests
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(),
}))

// Mock qrcode module — toCanvas resolves by default (success)
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn(),
  },
}))

import { useLocalStorage } from '../../hooks/useLocalStorage'
import QRCode from 'qrcode'

const mockUseLocalStorage = vi.mocked(useLocalStorage)
const mockToCanvas = vi.mocked(QRCode.toCanvas)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QrGeneratorStorage {
  mode: 'url' | 'wifi'
  urlValue: string
  ssid: string
  password: string
  authType: 'WPA' | 'WEP' | 'nopass'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_STORAGE: QrGeneratorStorage = {
  mode: 'url',
  urlValue: '',
  ssid: '',
  password: '',
  authType: 'WPA',
}

function setupMocks(storageState: QrGeneratorStorage = DEFAULT_STORAGE) {
  const setStorage = vi.fn()
  mockUseLocalStorage.mockReturnValue([storageState, setStorage] as ReturnType<typeof useLocalStorage>)
  return { setStorage }
}

function renderTool() {
  return render(
    <MemoryRouter>
      <MotionProvider>
        <QrGeneratorTool />
      </MotionProvider>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QrGeneratorTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    // Default: toCanvas resolves successfully
    mockToCanvas.mockResolvedValue(undefined as never)
  })

  // ── Requirement 11.1 ─────────────────────────────────────────────────────

  describe('renders with correct title', () => {
    it('displays "QR Generator" as the page heading', () => {
      setupMocks()
      renderTool()
      expect(screen.getByRole('heading', { name: 'QR Generator' })).toBeInTheDocument()
    })
  })

  // ── Requirement 11.2 ─────────────────────────────────────────────────────

  describe('URL mode shown by default', () => {
    it('shows URL input when mode is "url"', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url' })
      renderTool()
      expect(screen.getByLabelText(/url to encode/i)).toBeInTheDocument()
    })

    it('does not show WiFi inputs when mode is "url"', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url' })
      renderTool()
      expect(screen.queryByLabelText(/wifi network name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/wifi password/i)).not.toBeInTheDocument()
    })

    it('URL mode button has aria-pressed="true" by default', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url' })
      renderTool()
      const urlButton = screen.getByRole('button', { name: 'URL' })
      expect(urlButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  // ── Requirement 11.3 / 11.4 ──────────────────────────────────────────────

  describe('WiFi inputs shown in WiFi mode', () => {
    it('shows SSID input when mode is "wifi"', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi' })
      renderTool()
      expect(screen.getByLabelText(/wifi network name \(ssid\)/i)).toBeInTheDocument()
    })

    it('shows password input when mode is "wifi"', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi' })
      renderTool()
      expect(screen.getByLabelText(/wifi password/i)).toBeInTheDocument()
    })

    it('shows security type select when mode is "wifi"', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi' })
      renderTool()
      expect(screen.getByLabelText(/wifi security type/i)).toBeInTheDocument()
    })

    it('does not show URL input when mode is "wifi"', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi' })
      renderTool()
      expect(screen.queryByLabelText(/url to encode/i)).not.toBeInTheDocument()
    })

    it('WiFi mode button has aria-pressed="true" when mode is wifi', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi' })
      renderTool()
      const wifiButton = screen.getByRole('button', { name: 'WiFi' })
      expect(wifiButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  // ── Requirement 11.9 ─────────────────────────────────────────────────────

  describe('mode switch preserves values', () => {
    it('calls setStorage with new mode while keeping existing values when switching to WiFi', () => {
      const { setStorage } = setupMocks({
        mode: 'url',
        urlValue: 'https://example.com',
        ssid: 'MyNetwork',
        password: 'secret',
        authType: 'WPA',
      })
      renderTool()
      const wifiButton = screen.getByRole('button', { name: 'WiFi' })
      fireEvent.click(wifiButton)
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'wifi',
          urlValue: 'https://example.com',
          ssid: 'MyNetwork',
          password: 'secret',
          authType: 'WPA',
        }),
      )
    })

    it('calls setStorage with new mode while keeping existing values when switching back to URL', () => {
      const { setStorage } = setupMocks({
        mode: 'wifi',
        urlValue: 'https://example.com',
        ssid: 'MyNetwork',
        password: 'secret',
        authType: 'WPA',
      })
      renderTool()
      const urlButton = screen.getByRole('button', { name: 'URL' })
      fireEvent.click(urlButton)
      expect(setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'url',
          urlValue: 'https://example.com',
          ssid: 'MyNetwork',
          password: 'secret',
          authType: 'WPA',
        }),
      )
    })
  })

  // ── Requirement 12.3 ─────────────────────────────────────────────────────

  describe('download button disabled when no QR is rendered', () => {
    it('download button is disabled in initial state (empty URL)', () => {
      setupMocks({ ...DEFAULT_STORAGE, urlValue: '' })
      renderTool()
      const downloadButton = screen.getByRole('button', { name: /download qr code/i })
      expect(downloadButton).toBeDisabled()
    })

    it('download button is disabled in initial state (empty SSID in WiFi mode)', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi', ssid: '' })
      renderTool()
      const downloadButton = screen.getByRole('button', { name: /download qr code/i })
      expect(downloadButton).toBeDisabled()
    })
  })

  // ── Requirement 11.7 ─────────────────────────────────────────────────────

  describe('prompt shown when URL is empty', () => {
    it('shows "Enter a URL to generate a QR code" when URL input is empty', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', urlValue: '' })
      renderTool()
      expect(screen.getByText(/enter a url to generate a qr code/i)).toBeInTheDocument()
    })

    it('shows prompt when URL is whitespace only', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', urlValue: '   ' })
      renderTool()
      expect(screen.getByText(/enter a url to generate a qr code/i)).toBeInTheDocument()
    })

    it('does not show URL prompt when URL has content', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', urlValue: 'https://example.com' })
      renderTool()
      expect(screen.queryByText(/enter a url to generate a qr code/i)).not.toBeInTheDocument()
    })
  })

  // ── Requirement 11.8 ─────────────────────────────────────────────────────

  describe('prompt shown when SSID is empty in WiFi mode', () => {
    it('shows "Enter a network name (SSID)" when SSID is empty in WiFi mode', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi', ssid: '' })
      renderTool()
      expect(screen.getByText(/enter a network name \(ssid\)/i)).toBeInTheDocument()
    })

    it('shows prompt when SSID is whitespace only in WiFi mode', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi', ssid: '   ' })
      renderTool()
      expect(screen.getByText(/enter a network name \(ssid\)/i)).toBeInTheDocument()
    })

    it('does not show SSID prompt when SSID has content', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'wifi', ssid: 'MyNetwork' })
      renderTool()
      expect(screen.queryByText(/enter a network name \(ssid\)/i)).not.toBeInTheDocument()
    })

    it('does not show SSID prompt in URL mode even when SSID is empty', () => {
      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', ssid: '' })
      renderTool()
      expect(screen.queryByText(/enter a network name \(ssid\)/i)).not.toBeInTheDocument()
    })
  })

  // ── Requirement 12.6 ─────────────────────────────────────────────────────

  describe('inline error on QR encoding failure', () => {
    it('shows inline error when QRCode.toCanvas rejects', async () => {
      vi.useFakeTimers()
      mockToCanvas.mockRejectedValue(new Error('Data too long'))

      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', urlValue: 'https://example.com' })
      renderTool()

      // Advance past the 200ms debounce
      await act(async () => {
        vi.advanceTimersByTime(300)
        // Flush all pending promises
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(
        screen.getByText(/qr code could not be generated/i),
      ).toBeInTheDocument()
    })

    it('download button remains disabled after encoding failure', async () => {
      vi.useFakeTimers()
      mockToCanvas.mockRejectedValue(new Error('Data too long'))

      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', urlValue: 'https://example.com' })
      renderTool()

      await act(async () => {
        vi.advanceTimersByTime(300)
        await Promise.resolve()
        await Promise.resolve()
      })

      const downloadButton = screen.getByRole('button', { name: /download qr code/i })
      expect(downloadButton).toBeDisabled()
    })

    it('does not show error message when encoding succeeds', async () => {
      vi.useFakeTimers()
      mockToCanvas.mockResolvedValue(undefined as never)

      setupMocks({ ...DEFAULT_STORAGE, mode: 'url', urlValue: 'https://example.com' })
      renderTool()

      await act(async () => {
        vi.advanceTimersByTime(300)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(screen.queryByText(/qr code could not be generated/i)).not.toBeInTheDocument()
    })
  })
})
