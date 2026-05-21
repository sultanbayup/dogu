import { useCallback, useMemo, useState } from 'react'
import { ToolLayout } from '../../layouts/ToolLayout'
import { ResultCard } from '../../components/ResultCard'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { pickRandom, shuffleItems, generateNumber } from './randomUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RandomPickerStorage {
  itemsText: string
  minValue: number
  maxValue: number
}

type LastAction = 'item' | 'number' | null

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_STORAGE: RandomPickerStorage = {
  itemsText: '',
  minValue: 0,
  maxValue: 100,
}

const MIN_BOUND = -999_999_999
const MAX_BOUND = 999_999_999

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the textarea value into a list of valid (non-empty, trimmed) items. */
function parseItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 200)
    .map((item) => item.slice(0, 200))
}

/** Format a number as a decimal string with no leading zeros. */
function formatNumber(n: number): string {
  return String(n)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RandomPickerTool() {
  // Persisted form state
  const [storage, setStorage] = useLocalStorage<RandomPickerStorage>(
    'random-picker',
    DEFAULT_STORAGE,
  )

  // Component-local state
  const [result, setResult] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<LastAction>(null)

  // ── Derived values ──────────────────────────────────────────────────────────

  const validItems = useMemo(() => parseItems(storage.itemsText), [storage.itemsText])
  const hasValidItems = validItems.length >= 1

  const minValue = storage.minValue
  const maxValue = storage.maxValue

  const isNumberInvalid = minValue >= maxValue
  const isPickDisabled = !hasValidItems
  const isGenerateDisabled = isNumberInvalid

  // Reroll is disabled if the last action's inputs are now invalid
  const isRerollDisabled =
    lastAction === 'item' ? isPickDisabled
    : lastAction === 'number' ? isGenerateDisabled
    : true

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleItemsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setStorage({ ...storage, itemsText: e.target.value })
    },
    [storage, setStorage],
  )

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10)
      setStorage({ ...storage, minValue: isNaN(parsed) ? 0 : parsed })
    },
    [storage, setStorage],
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10)
      setStorage({ ...storage, maxValue: isNaN(parsed) ? 100 : parsed })
    },
    [storage, setStorage],
  )

  const doPick = useCallback(() => {
    if (!hasValidItems) return
    const idx = pickRandom(validItems.length)
    setResult(validItems[idx])
    setLastAction('item')
  }, [hasValidItems, validItems])

  const doGenerate = useCallback(() => {
    if (isNumberInvalid) return
    const n = generateNumber(minValue, maxValue)
    setResult(formatNumber(n))
    setLastAction('number')
  }, [isNumberInvalid, minValue, maxValue])

  const handleShuffle = useCallback(() => {
    if (validItems.length === 0) return
    const shuffled = shuffleItems(validItems)
    setStorage({ ...storage, itemsText: shuffled.join('\n') })
  }, [validItems, storage, setStorage])

  const handleReroll = useCallback(() => {
    if (lastAction === 'item') doPick()
    else if (lastAction === 'number') doGenerate()
  }, [lastAction, doPick, doGenerate])

  // ── Copy payload ─────────────────────────────────────────────────────────────

  // For items: the item text itself
  // For numbers: the decimal string (already formatted by formatNumber)
  const copyPayload = result ?? ''

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ToolLayout title="Random Picker">
      <div className="flex flex-col gap-8 max-w-lg">

        {/* ── Item Picker section ─────────────────────────────────────────── */}
        <section aria-labelledby="rp-item-picker-heading" className="flex flex-col gap-4">
          <h2
            id="rp-item-picker-heading"
            className="text-base font-semibold text-text"
          >
            Item Picker
          </h2>

          {/* Items textarea */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="rp-items"
              className="text-sm font-medium text-text-secondary"
            >
              Items
              <span className="ml-1 text-text-secondary/60 font-normal">
                (one per line, up to 200)
              </span>
            </label>
            <textarea
              id="rp-items"
              aria-label="Items to pick from, one per line"
              value={storage.itemsText}
              onChange={handleItemsChange}
              rows={6}
              placeholder={"Apple\nBanana\nCherry\nDate"}
              className={[
                'w-full min-h-[44px] resize-y',
                'bg-surface text-text placeholder:text-text-secondary/40',
                'border border-white/10 rounded-card',
                'px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              ].join(' ')}
            />
            {validItems.length > 0 && (
              <p className="text-xs text-text-secondary">
                {validItems.length} item{validItems.length !== 1 ? 's' : ''} detected
              </p>
            )}
          </div>

          {/* Pick Random + Shuffle List buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isPickDisabled}
              aria-label="Pick a random item from the list"
              onClick={doPick}
              className={[
                'flex-1 min-h-[44px] min-w-[44px]',
                'rounded-button px-4 py-2',
                'text-sm font-medium text-white',
                'transition-opacity duration-fast',
                isPickDisabled
                  ? 'bg-accent/40 cursor-not-allowed opacity-50'
                  : 'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              ].join(' ')}
            >
              Pick Random
            </button>

            <button
              type="button"
              aria-label="Shuffle the list order"
              onClick={handleShuffle}
              className={[
                'flex-1 min-h-[44px] min-w-[44px]',
                'rounded-button px-4 py-2',
                'text-sm font-medium',
                'bg-surface border border-white/10 text-text-secondary',
                'hover:text-text hover:border-white/20 transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                'cursor-pointer',
              ].join(' ')}
            >
              Shuffle List
            </button>
          </div>
        </section>

        {/* ── Number Generator section ────────────────────────────────────── */}
        <section aria-labelledby="rp-number-gen-heading" className="flex flex-col gap-4">
          <h2
            id="rp-number-gen-heading"
            className="text-base font-semibold text-text"
          >
            Number Generator
          </h2>

          {/* Min / Max inputs */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label
                htmlFor="rp-min"
                className="text-sm font-medium text-text-secondary"
              >
                Min
              </label>
              <input
                id="rp-min"
                type="number"
                aria-label="Minimum value (inclusive)"
                min={MIN_BOUND}
                max={MAX_BOUND}
                value={minValue}
                onChange={handleMinChange}
                className={[
                  'w-full min-h-[44px]',
                  'bg-surface text-text',
                  'border rounded-button px-3 py-2 text-sm',
                  isNumberInvalid
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-white/10 focus-visible:ring-accent',
                  'focus-visible:outline-none focus-visible:ring-2',
                ].join(' ')}
              />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label
                htmlFor="rp-max"
                className="text-sm font-medium text-text-secondary"
              >
                Max
              </label>
              <input
                id="rp-max"
                type="number"
                aria-label="Maximum value (inclusive)"
                min={MIN_BOUND}
                max={MAX_BOUND}
                value={maxValue}
                onChange={handleMaxChange}
                className={[
                  'w-full min-h-[44px]',
                  'bg-surface text-text',
                  'border rounded-button px-3 py-2 text-sm',
                  isNumberInvalid
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-white/10 focus-visible:ring-accent',
                  'focus-visible:outline-none focus-visible:ring-2',
                ].join(' ')}
              />
            </div>
          </div>

          {/* Inline validation message */}
          {isNumberInvalid && (
            <p role="alert" className="text-xs text-red-400">
              Min must be less than max
            </p>
          )}

          {/* Generate Number button */}
          <button
            type="button"
            disabled={isGenerateDisabled}
            aria-label="Generate a random number between min and max"
            onClick={doGenerate}
            className={[
              'min-h-[44px] min-w-[44px] w-full',
              'rounded-button px-4 py-2',
              'text-sm font-medium text-white',
              'transition-opacity duration-fast',
              isGenerateDisabled
                ? 'bg-accent/40 cursor-not-allowed opacity-50'
                : 'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            ].join(' ')}
          >
            Generate Number
          </button>
        </section>

        {/* ── Result area ─────────────────────────────────────────────────── */}
        {result !== null && (
          <div className="flex flex-col gap-4">
            <ResultCard copyPayload={copyPayload}>
              <p className="text-lg font-semibold text-text break-words">
                {result}
              </p>
            </ResultCard>

            {/* Reroll button */}
            <button
              type="button"
              disabled={isRerollDisabled}
              aria-label="Reroll — run the same action again with current inputs"
              onClick={handleReroll}
              className={[
                'min-h-[44px] min-w-[44px] w-full',
                'rounded-button px-4 py-2',
                'text-sm font-medium',
                isRerollDisabled
                  ? 'bg-surface border border-white/10 text-text-secondary/40 cursor-not-allowed opacity-50'
                  : 'bg-surface border border-white/10 text-text-secondary hover:text-text hover:border-white/20 cursor-pointer',
                'transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              ].join(' ')}
            >
              Reroll
            </button>
          </div>
        )}

      </div>
    </ToolLayout>
  )
}
