import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ToolLayout } from '../../layouts/ToolLayout'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { encodeWifiQr } from './wifiQr'

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

const DEFAULT_STORAGE: QrGeneratorStorage = {
  mode: 'url',
  urlValue: '',
  ssid: '',
  password: '',
  authType: 'WPA',
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

async function renderQr(canvas: HTMLCanvasElement, data: string): Promise<void> {
  await QRCode.toCanvas(canvas, data, {
    width: 256,
    margin: 2,
    color: { dark: '#FAFAFA', light: '#18181B' },
    errorCorrectionLevel: 'M',
  })
}

function downloadQr(canvas: HTMLCanvasElement): void {
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = 'dogu-qr.png'
  a.click()
}

function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QrGeneratorTool() {
  const [stored, setStored] = useLocalStorage<QrGeneratorStorage>(
    'qr-generator',
    DEFAULT_STORAGE,
  )

  // Destructure for convenience
  const { mode, urlValue, ssid, password, authType } = stored

  // QR render state
  const [hasQr, setHasQr] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const isUrlMode = mode === 'url'
  const isWifiMode = mode === 'wifi'

  const urlTrimmed = urlValue.trim()
  const ssidTrimmed = ssid.trim()

  const isInputEmpty = isUrlMode ? urlTrimmed === '' : ssidTrimmed === ''

  // The data string to encode
  const qrData: string | null = (() => {
    if (isInputEmpty) return null
    if (isUrlMode) return urlTrimmed
    return encodeWifiQr(ssidTrimmed, password, authType)
  })()

  // ---------------------------------------------------------------------------
  // QR rendering (debounced)
  // ---------------------------------------------------------------------------

  const triggerRender = useCallback((data: string) => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const canvas = canvasRef.current
      if (!canvas) return

      renderQr(canvas, data)
        .then(() => {
          setHasQr(true)
          setQrError(null)
        })
        .catch(() => {
          clearCanvas(canvas)
          setHasQr(false)
          setQrError('QR code could not be generated — try shorter input')
        })
    }, 200)
  }, [])

  // Re-render whenever qrData changes
  useEffect(() => {
    if (qrData === null) {
      // Clear canvas when there's no valid input
      const canvas = canvasRef.current
      if (canvas) clearCanvas(canvas)
      setHasQr(false)
      setQrError(null)
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      return
    }
    triggerRender(qrData)
  }, [qrData, triggerRender])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleModeChange(newMode: 'url' | 'wifi') {
    setStored({ ...stored, mode: newMode })
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStored({ ...stored, urlValue: e.target.value })
  }

  function handleSsidChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStored({ ...stored, ssid: e.target.value })
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStored({ ...stored, password: e.target.value })
  }

  function handleAuthTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStored({ ...stored, authType: e.target.value as 'WPA' | 'WEP' | 'nopass' })
  }

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas || !hasQr) return
    downloadQr(canvas)
  }

  // ---------------------------------------------------------------------------
  // Shared input class
  // ---------------------------------------------------------------------------

  const inputClass =
    'w-full min-h-[44px] px-3 py-2 bg-bg/60 border border-white/10 rounded-button ' +
    'text-text placeholder-text-secondary text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
    'transition-colors duration-fast'

  const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ToolLayout title="QR Generator" contentWidth="max-w-sm">
      <div className="max-w-sm mx-auto w-full space-y-6 animate-slide-up">

        {/* Mode selector */}
        <fieldset>
          <legend className="sr-only">QR code mode</legend>
          <div
            role="group"
            aria-label="QR code mode"
            className="flex rounded-button border border-white/10 overflow-hidden"
          >
            <button
              type="button"
              aria-pressed={isUrlMode}
              onClick={() => handleModeChange('url')}
              className={
                'flex-1 min-h-[44px] px-4 py-2 text-sm font-medium transition-colors duration-fast ' +
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset ' +
                (isUrlMode
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-secondary hover:text-text hover:bg-white/5')
              }
            >
              URL
            </button>
            <button
              type="button"
              aria-pressed={isWifiMode}
              onClick={() => handleModeChange('wifi')}
              className={
                'flex-1 min-h-[44px] px-4 py-2 text-sm font-medium transition-colors duration-fast ' +
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset ' +
                (isWifiMode
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-secondary hover:text-text hover:bg-white/5')
              }
            >
              WiFi
            </button>
          </div>
        </fieldset>

        {/* URL mode inputs */}
        {isUrlMode && (
          <div>
            <label htmlFor="qr-url-input" className={labelClass}>
              URL
            </label>
            <input
              id="qr-url-input"
              type="url"
              value={urlValue}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              aria-label="URL to encode as QR code"
              className={inputClass}
            />
            {isInputEmpty && (
              <p className="mt-2 text-sm text-text-secondary" role="status">
                Enter a URL to generate a QR code
              </p>
            )}
          </div>
        )}

        {/* WiFi mode inputs */}
        {isWifiMode && (
          <div className="space-y-4">
            <div>
              <label htmlFor="qr-ssid-input" className={labelClass}>
                Network name (SSID)
              </label>
              <input
                id="qr-ssid-input"
                type="text"
                value={ssid}
                onChange={handleSsidChange}
                placeholder="My WiFi Network"
                aria-label="WiFi network name (SSID)"
                className={inputClass}
              />
              {isInputEmpty && (
                <p className="mt-2 text-sm text-text-secondary" role="status">
                  Enter a network name (SSID)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="qr-password-input" className={labelClass}>
                Password
              </label>
              <input
                id="qr-password-input"
                type="text"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Network password"
                aria-label="WiFi password"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="qr-auth-type-select" className={labelClass}>
                Security type
              </label>
              <select
                id="qr-auth-type-select"
                value={authType}
                onChange={handleAuthTypeChange}
                aria-label="WiFi security type"
                className={inputClass + ' cursor-pointer'}
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (open network)</option>
              </select>
            </div>
          </div>
        )}

        {/* QR canvas */}
        <div className="flex flex-col items-center gap-4 glass-panel rounded-card p-6">
          <div
            className={
              'rounded-card overflow-hidden ' +
              (isInputEmpty ? 'opacity-0 pointer-events-none' : '')
            }
            aria-hidden={isInputEmpty}
          >
            <canvas
              ref={canvasRef}
              aria-label="Generated QR code"
              style={{ width: '256px', height: '256px', display: 'block' }}
            />
          </div>

          {/* Encoding error */}
          {qrError && (
            <p className="text-sm text-red-400" role="alert">
              {qrError}
            </p>
          )}

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!hasQr}
            aria-label="Download QR code as PNG"
            aria-disabled={!hasQr}
            className={
              'min-h-[44px] min-w-[44px] px-6 py-2 rounded-button text-sm font-medium ' +
              'bg-accent text-white border border-accent ' +
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
              'transition-colors duration-fast ' +
              'disabled:opacity-40 disabled:cursor-not-allowed ' +
              (!hasQr ? '' : 'hover:opacity-90 active:opacity-75')
            }
          >
            Download PNG
          </button>
        </div>

      </div>
    </ToolLayout>
  )
}
