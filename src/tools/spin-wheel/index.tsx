import { useCallback, useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { ToolLayout } from '../../layouts/ToolLayout'
import { CopyButton } from '../../components/CopyButton'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import WheelCanvas, { type SpinItem } from './WheelCanvas'
import { selectItem, computeTargetAngle } from './selectItem'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpinWheelStorage {
  items: SpinItem[]
  weighted: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ITEMS: SpinItem[] = [
  { label: 'Option 1', weight: 1 },
  { label: 'Option 2', weight: 1 },
]

const DEFAULT_STORAGE: SpinWheelStorage = {
  items: DEFAULT_ITEMS,
  weighted: false,
}

const MIN_ITEMS = 2
const MAX_ITEMS = 50
const MAX_LABEL_LENGTH = 100
const MIN_WEIGHT = 1
const MAX_WEIGHT = 1000
const MIN_DURATION = 3000
const MAX_DURATION = 6000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidLabel(label: string): boolean {
  const trimmed = label.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_LABEL_LENGTH
}

function isValidWeight(weight: number): boolean {
  return Number.isInteger(weight) && weight >= MIN_WEIGHT && weight <= MAX_WEIGHT
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpinWheelTool() {
  const prefersReducedMotion = useReducedMotion()

  // Persisted state
  const [storage, setStorage] = useLocalStorage<SpinWheelStorage>(
    'spin-wheel',
    DEFAULT_STORAGE,
  )

  // Local (non-persisted) state
  const [spinning, setSpinning] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [resultIndex, setResultIndex] = useState<number | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // rAF handle for cleanup
  const rafRef = useRef<number | null>(null)

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────────

  const { items, weighted } = storage

  // Validate each item
  const itemValidations = items.map((item) => ({
    labelValid: isValidLabel(item.label),
    weightValid: isValidWeight(item.weight),
  }))

  const validItemCount = itemValidations.filter((v) => v.labelValid).length
  const hasInvalidWeight = weighted && itemValidations.some((v) => v.labelValid && !v.weightValid)
  const tooFewItems = validItemCount < MIN_ITEMS

  const isSpinDisabled = spinning || tooFewItems || hasInvalidWeight

  // Canvas size
  const canvasSize = fullscreen
    ? Math.min(window.innerWidth, window.innerHeight) - 32
    : 320

  // ── Item list handlers ──────────────────────────────────────────────────────

  const handleLabelChange = useCallback(
    (index: number, value: string) => {
      const newItems = items.map((item, i) =>
        i === index ? { ...item, label: value } : item,
      )
      setStorage({ ...storage, items: newItems })
    },
    [items, storage, setStorage],
  )

  const handleWeightChange = useCallback(
    (index: number, value: string) => {
      const parsed = parseInt(value, 10)
      const newItems = items.map((item, i) =>
        i === index ? { ...item, weight: isNaN(parsed) ? 0 : parsed } : item,
      )
      setStorage({ ...storage, items: newItems })
    },
    [items, storage, setStorage],
  )

  const handleAddItem = useCallback(() => {
    if (items.length >= MAX_ITEMS) return
    const newItems = [...items, { label: `Option ${items.length + 1}`, weight: 1 }]
    setStorage({ ...storage, items: newItems })
  }, [items, storage, setStorage])

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (items.length <= MIN_ITEMS) return
      const newItems = items.filter((_, i) => i !== index)
      setStorage({ ...storage, items: newItems })
    },
    [items, storage, setStorage],
  )

  const handleWeightedToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStorage({ ...storage, weighted: e.target.checked })
    },
    [storage, setStorage],
  )

  // ── Spin handler ────────────────────────────────────────────────────────────

  const handleSpin = useCallback(() => {
    if (isSpinDisabled) return

    // Clear previous result
    setResultIndex(null)
    setSpinning(true)

    // Build weights array (use 1 for all if not weighted)
    const weights = items.map((item) => (weighted ? item.weight : 1))

    const selectedIndex = selectItem(weights)
    const targetAngle = computeTargetAngle(selectedIndex, items.length, currentAngle)

    if (prefersReducedMotion) {
      // Skip animation — set angle directly and show result immediately
      setCurrentAngle(targetAngle)
      setResultIndex(selectedIndex)
      setSpinning(false)
      return
    }

    // rAF animation loop
    const duration = MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION)
    const startAngle = currentAngle
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const easedT = easeOutCubic(t)
      const angle = startAngle + (targetAngle - startAngle) * easedT

      setCurrentAngle(angle)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        setCurrentAngle(targetAngle)
        setResultIndex(selectedIndex)
        setSpinning(false)

        // Fire confetti (gated on reduced motion — already checked above)
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [isSpinDisabled, items, weighted, currentAngle, prefersReducedMotion])

  // ── Fullscreen toggle ───────────────────────────────────────────────────────

  const handleFullscreenToggle = useCallback(() => {
    setFullscreen((prev) => !prev)
  }, [])

  // ── Result display ──────────────────────────────────────────────────────────

  const resultItem = resultIndex !== null ? items[resultIndex] : null
  const copyPayload = resultItem ? resultItem.label : ''

  // Modal open state
  const [resultModalOpen, setResultModalOpen] = useState(false)

  // Open modal when result arrives
  useEffect(() => {
    if (resultItem !== null) {
      setResultModalOpen(true)
    }
  }, [resultIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!resultModalOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setResultModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [resultModalOpen])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ToolLayout title="Spin Wheel">
      <div className="flex flex-col gap-6 max-w-lg w-full animate-slide-up">

        {/* Wheel canvas area */}
        <div className="flex flex-col items-center gap-3">
          {/* Canvas wrapper — fullscreen overlay when active */}
          <div
            className={[
              fullscreen
                ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 backdrop-blur-sm'
                : 'relative',
            ].join(' ')}
          >
            {fullscreen && (
              /* Backdrop close area */
              <div
                className="absolute inset-0"
                aria-hidden="true"
                onClick={handleFullscreenToggle}
              />
            )}

            <div className={fullscreen ? 'relative z-10 flex flex-col items-center gap-4' : ''}>
              <WheelCanvas
                items={items.length >= MIN_ITEMS ? items : DEFAULT_ITEMS}
                currentAngle={currentAngle}
                size={canvasSize}
              />

              {/* Fullscreen spin button (shown inside fullscreen overlay) */}
              {fullscreen && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSpinDisabled}
                    aria-label="Spin the wheel"
                    onClick={handleSpin}
                    className={[
                      'min-h-[44px] min-w-[44px]',
                      'rounded-button px-6 py-2',
                      'text-sm font-medium text-white',
                      'transition-opacity duration-fast',
                      isSpinDisabled
                        ? 'bg-accent/40 cursor-not-allowed opacity-50'
                        : 'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                    ].join(' ')}
                  >
                    Spin
                  </button>

                  <button
                    type="button"
                    aria-label="Exit fullscreen"
                    onClick={handleFullscreenToggle}
                    className={[
                      'min-h-[44px] min-w-[44px]',
                      'rounded-button px-4 py-2',
                      'text-sm font-medium text-text-secondary',
                      'bg-surface border border-white/10',
                      'hover:text-text hover:border-white/20 transition-colors duration-fast',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                      'cursor-pointer',
                    ].join(' ')}
                  >
                    Exit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Controls row (below canvas, outside fullscreen) */}
          <div className="flex gap-3 w-full">
            {/* Spin button */}
            <button
              type="button"
              disabled={isSpinDisabled}
              aria-label="Spin the wheel"
              onClick={handleSpin}
              className={[
                'flex-1 min-h-[44px] min-w-[44px]',
                'rounded-button px-4 py-2',
                'text-sm font-medium text-white',
                'transition-opacity duration-fast',
                isSpinDisabled
                  ? 'bg-accent/40 cursor-not-allowed opacity-50'
                  : 'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              ].join(' ')}
            >
              {spinning ? 'Spinning…' : 'Spin'}
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={handleFullscreenToggle}
              className={[
                'min-h-[44px] min-w-[44px] px-3',
                'rounded-button',
                'text-sm font-medium text-text-secondary',
                'bg-surface border border-white/10',
                'hover:text-text hover:border-white/20 transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                'cursor-pointer',
              ].join(' ')}
            >
              {/* Fullscreen icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                {fullscreen ? (
                  /* Compress icon */
                  <>
                    <path d="M6 2v4H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 16v-4H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 16v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : (
                  /* Expand icon */
                  <>
                    <path d="M2 6V2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 6V2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 12v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Result modal */}
        {resultModalOpen && resultItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Spin result"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-hidden="true"
              onClick={() => setResultModalOpen(false)}
            />
            {/* Panel */}
            <div className="relative z-10 w-full max-w-sm bg-surface border border-white/10 rounded-card p-6 flex flex-col gap-4 items-center text-center">
              <div className="flex items-center justify-between w-full">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Result</p>
                <div className="flex items-center gap-2">
                  <CopyButton payload={copyPayload} />
                  <button
                    type="button"
                    aria-label="Close result"
                    onClick={() => setResultModalOpen(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-button text-text-secondary hover:text-text transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-3xl font-bold text-text break-words w-full">{resultItem.label}</p>
              <div className="flex flex-col gap-2 w-full">
                {/* Spin again — keep item in list */}
                <button
                  type="button"
                  aria-label="Spin again"
                  onClick={() => { setResultModalOpen(false); handleSpin() }}
                  className={[
                    'min-h-[44px] min-w-[44px] w-full',
                    'rounded-button px-4 py-2',
                    'text-sm font-medium text-white',
                    'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
                    'transition-opacity duration-fast',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  ].join(' ')}
                >
                  Spin again
                </button>
                {/* Remove from list, then spin again */}
                {items.length > MIN_ITEMS && (
                  <button
                    type="button"
                    aria-label={`Remove "${resultItem.label}" from the list and spin again`}
                    onClick={() => {
                      if (resultIndex !== null) {
                        handleRemoveItem(resultIndex)
                      }
                      setResultModalOpen(false)
                      // Spin after state update settles
                      setTimeout(() => handleSpin(), 0)
                    }}
                    className={[
                      'min-h-[44px] min-w-[44px] w-full',
                      'rounded-button px-4 py-2',
                      'text-sm font-medium text-red-400',
                      'bg-surface border border-red-400/30',
                      'hover:bg-red-400/10 hover:border-red-400/60 transition-colors duration-fast cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
                    ].join(' ')}
                  >
                    Remove from list &amp; spin again
                  </button>
                )}
                {/* Just remove, don't spin */}
                {items.length > MIN_ITEMS && (
                  <button
                    type="button"
                    aria-label={`Remove "${resultItem.label}" from the list`}
                    onClick={() => {
                      if (resultIndex !== null) {
                        handleRemoveItem(resultIndex)
                      }
                      setResultModalOpen(false)
                    }}
                    className={[
                      'min-h-[44px] min-w-[44px] w-full',
                      'rounded-button px-4 py-2',
                      'text-sm font-medium text-text-secondary',
                      'bg-surface border border-white/10',
                      'hover:text-text hover:border-white/20 transition-colors duration-fast cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    ].join(' ')}
                  >
                    Remove from list
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weighted spin toggle */}
        <div className="flex items-center gap-3 min-h-[44px]">
          <label
            htmlFor="sw-weighted"
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <span className="relative inline-flex items-center">
              <input
                id="sw-weighted"
                type="checkbox"
                role="switch"
                aria-label="Weighted Spin — assign different probabilities to each item"
                aria-checked={weighted}
                checked={weighted}
                onChange={handleWeightedToggle}
                className="sr-only"
              />
              {/* Visual track */}
              <span
                aria-hidden="true"
                className={[
                  'block w-11 h-6 rounded-full transition-colors duration-fast',
                  weighted ? 'bg-accent' : 'bg-white/20',
                ].join(' ')}
              />
              {/* Thumb */}
              <span
                aria-hidden="true"
                className={[
                  'absolute left-0.5 top-0.5 block w-5 h-5 rounded-full bg-white shadow transition-transform duration-fast',
                  weighted ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </span>
            <span className="text-sm text-text-secondary">Weighted Spin</span>
          </label>
        </div>

        {/* Item list editor */}
        <div className="flex flex-col gap-3 glass-panel rounded-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">
              Items
              <span className="ml-1 text-text-secondary/60 font-normal">
                ({items.length}/{MAX_ITEMS})
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item, index) => {
              const validation = itemValidations[index]
              const showWeightError = weighted && validation.labelValid && !validation.weightValid

              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center">
                    {/* Label input */}
                    <input
                      type="text"
                      aria-label={`Item ${index + 1} label`}
                      value={item.label}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      maxLength={MAX_LABEL_LENGTH}
                      placeholder={`Option ${index + 1}`}
                      className={[
                        'flex-1 min-h-[44px]',
                        'bg-bg/60 text-text placeholder:text-text-secondary/40',
                        'border rounded-button px-3 py-2 text-sm',
                        'border-white/10',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      ].join(' ')}
                    />

                    {/* Weight input (shown when weighted mode is on) */}
                    {weighted && (
                      <input
                        type="number"
                        aria-label={`Item ${index + 1} weight (1 to 1000)`}
                        value={item.weight}
                        min={MIN_WEIGHT}
                        max={MAX_WEIGHT}
                        onChange={(e) => handleWeightChange(index, e.target.value)}
                        className={[
                          'w-20 min-h-[44px]',
                          'bg-bg/60 text-text',
                          'border rounded-button px-3 py-2 text-sm',
                          showWeightError
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : 'border-white/10 focus-visible:ring-accent',
                          'focus-visible:outline-none focus-visible:ring-2',
                        ].join(' ')}
                      />
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      disabled={items.length <= MIN_ITEMS}
                      onClick={() => handleRemoveItem(index)}
                      className={[
                        'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        'rounded-button',
                        'text-text-secondary transition-colors duration-fast',
                        items.length <= MIN_ITEMS
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:text-red-400 cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      ].join(' ')}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Inline weight validation */}
                  {showWeightError && (
                    <p role="alert" className="text-xs text-red-400 pl-1">
                      Weight must be an integer between 1 and 1000
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add item button */}
          <button
            type="button"
            aria-label="Add a new item to the wheel"
            disabled={items.length >= MAX_ITEMS}
            onClick={handleAddItem}
            className={[
              'min-h-[44px] min-w-[44px] w-full',
              'rounded-button px-4 py-2',
              'text-sm font-medium text-text-secondary',
              'bg-surface border border-white/10 border-dashed',
              items.length >= MAX_ITEMS
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:text-text hover:border-white/20 transition-colors duration-fast cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            ].join(' ')}
          >
            + Add item
          </button>
        </div>
      </div>
    </ToolLayout>
  )
}
