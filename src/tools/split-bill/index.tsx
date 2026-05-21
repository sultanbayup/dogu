import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../layouts/ToolLayout'
import { ResultCard } from '../../components/ResultCard'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { calculateBill } from './calculate'
import type { BillResult } from './calculate'

// ─── Types ────────────────────────────────────────────────────────────────────

type BillMode = 'simple' | 'itemized'
type SharedCostMode = 'proportional' | 'equal'

interface LineItem {
  name: string
  price: string // raw string input
}

interface Person {
  name: string
  items: LineItem[]
}

interface SimpleBillStorage {
  subtotal: string
  people: number
  tax: number
  serviceCharge: number
}

interface ItemizedBillStorage {
  persons: Person[]
  tax: number
  serviceCharge: number
  sharedCostMode: SharedCostMode
}

interface SplitBillStorage {
  mode: BillMode
  simple: SimpleBillStorage
  itemized: ItemizedBillStorage
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SUBTOTAL = 999_999_999.99

const DEFAULT_SIMPLE: SimpleBillStorage = {
  subtotal: '',
  people: 2,
  tax: 0,
  serviceCharge: 0,
}

const DEFAULT_PERSON = (): Person => ({
  name: '',
  items: [{ name: '', price: '' }],
})

const DEFAULT_ITEMIZED: ItemizedBillStorage = {
  persons: [DEFAULT_PERSON(), DEFAULT_PERSON()],
  tax: 0,
  serviceCharge: 0,
  sharedCostMode: 'proportional',
}

const DEFAULT_STORAGE: SplitBillStorage = {
  mode: 'simple',
  simple: DEFAULT_SIMPLE,
  itemized: DEFAULT_ITEMIZED,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toFixed(2)
}

function parsePrice(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) || n < 0 ? 0 : n
}

function buildSimpleCopyPayload(result: BillResult, tax: number, sc: number, people: number): string {
  return [
    `Subtotal: ${fmt(result.subtotal)}`,
    `Tax (${tax}%): ${fmt(result.taxAmount)}`,
    `Service (${sc}%): ${fmt(result.serviceChargeAmount)}`,
    `Total: ${fmt(result.total)}`,
    `Per person (${people}): ${fmt(result.perPerson)}`,
  ].join('\n')
}

interface PersonResult {
  name: string
  subtotal: number
  sharedTax: number
  sharedService: number
  total: number
}

function calcItemized(
  persons: Person[],
  taxPct: number,
  scPct: number,
  sharedCostMode: SharedCostMode,
): PersonResult[] {
  const subtotals = persons.map((p) =>
    p.items.reduce((sum, item) => sum + parsePrice(item.price), 0),
  )
  const grandSubtotal = subtotals.reduce((a, b) => a + b, 0)

  return persons.map((p, i) => {
    const sub = subtotals[i]
    let taxShare: number
    let scShare: number

    if (sharedCostMode === 'proportional' && grandSubtotal > 0) {
      const ratio = sub / grandSubtotal
      taxShare = grandSubtotal * (taxPct / 100) * ratio
      scShare = grandSubtotal * (scPct / 100) * ratio
    } else {
      // equal split
      const n = persons.length || 1
      taxShare = (grandSubtotal * (taxPct / 100)) / n
      scShare = (grandSubtotal * (scPct / 100)) / n
    }

    return {
      name: p.name || `Person ${i + 1}`,
      subtotal: sub,
      sharedTax: taxShare,
      sharedService: scShare,
      total: sub + taxShare + scShare,
    }
  })
}

function buildItemizedCopyPayload(results: PersonResult[], tax: number, sc: number): string {
  const lines: string[] = []
  results.forEach((r) => {
    lines.push(`${r.name}:`)
    lines.push(`  Subtotal: ${fmt(r.subtotal)}`)
    lines.push(`  Tax (${tax}%): ${fmt(r.sharedTax)}`)
    lines.push(`  Service (${sc}%): ${fmt(r.sharedService)}`)
    lines.push(`  Total: ${fmt(r.total)}`)
  })
  const grand = results.reduce((s, r) => s + r.total, 0)
  lines.push(`Grand total: ${fmt(grand)}`)
  return lines.join('\n')
}

// ─── Toggle component ─────────────────────────────────────────────────────────

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  ariaLabel?: string
}

function Toggle({ id, checked, onChange, label, ariaLabel }: ToggleProps) {
  return (
    <div className="flex items-center gap-3 min-h-[44px]">
      <label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none">
        <span className="relative inline-flex items-center">
          <input
            id={id}
            type="checkbox"
            role="switch"
            aria-label={ariaLabel ?? label}
            aria-checked={checked}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <span aria-hidden="true" className={['block w-11 h-6 rounded-full transition-colors duration-fast', checked ? 'bg-accent' : 'bg-white/20'].join(' ')} />
          <span aria-hidden="true" className={['absolute left-0.5 top-0.5 block w-5 h-5 rounded-full bg-white shadow transition-transform duration-fast', checked ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
        </span>
        <span className="text-sm text-text-secondary">{label}</span>
      </label>
    </div>
  )
}

// ─── Simple mode ──────────────────────────────────────────────────────────────

interface SimpleModeProps {
  data: SimpleBillStorage
  onChange: (data: SimpleBillStorage) => void
}

function SimpleMode({ data, onChange }: SimpleModeProps) {
  const subtotalNum = parseFloat(data.subtotal)
  const subtotalInvalid =
    data.subtotal.trim() === '' || isNaN(subtotalNum) || subtotalNum <= 0 || subtotalNum > MAX_SUBTOTAL
  const peopleInvalid = !Number.isInteger(data.people) || data.people < 1 || data.people > 100
  const isDisabled = subtotalInvalid || peopleInvalid

  const result = useMemo<BillResult | null>(() => {
    if (isDisabled) return null
    return calculateBill(subtotalNum, data.people, data.tax, data.serviceCharge)
  }, [isDisabled, subtotalNum, data.people, data.tax, data.serviceCharge])

  const [hasCalculated, setHasCalculated] = useState(false)
  useEffect(() => { if (result !== null) setHasCalculated(true) }, [result])
  const showResult = hasCalculated && result !== null

  const copyPayload = result ? buildSimpleCopyPayload(result, data.tax, data.serviceCharge, data.people) : ''

  const inputClass = (invalid: boolean) => [
    'w-full min-h-[44px]',
    'bg-bg/60 text-text',
    'border rounded-button px-3 py-2 text-sm',
    invalid ? 'border-red-500 focus-visible:ring-red-500' : 'border-white/10 focus-visible:ring-accent',
    'focus-visible:outline-none focus-visible:ring-2',
  ].join(' ')

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel rounded-card p-5 flex flex-col gap-6">
      {/* Subtotal */}
      <div className="flex flex-col gap-2">
        <label htmlFor="sb-subtotal" className="text-sm font-medium text-text-secondary">Subtotal</label>
        <input
          id="sb-subtotal" type="number" aria-label="Bill subtotal amount"
          min={0.01} max={MAX_SUBTOTAL} step="0.01" placeholder="0.00"
          value={data.subtotal}
          onChange={(e) => onChange({ ...data, subtotal: e.target.value })}
          className={inputClass(subtotalInvalid && data.subtotal !== '')}
        />
        {subtotalInvalid && data.subtotal !== '' && <p role="alert" className="text-xs text-red-400">Enter a positive amount</p>}
        {subtotalInvalid && data.subtotal === '' && <p className="text-xs text-text-secondary/60">Enter a positive amount</p>}
      </div>

      {/* People */}
      <div className="flex flex-col gap-2">
        <label htmlFor="sb-people" className="text-sm font-medium text-text-secondary">Number of people</label>
        <input
          id="sb-people" type="number" aria-label="Number of people splitting the bill (1 to 100)"
          min={1} max={100} step={1}
          value={data.people}
          onChange={(e) => { const n = parseInt(e.target.value, 10); onChange({ ...data, people: isNaN(n) ? 0 : n }) }}
          className={inputClass(peopleInvalid)}
        />
        {peopleInvalid && <p role="alert" className="text-xs text-red-400">Must be 1–100</p>}
      </div>

      {/* Tax */}
      <div className="flex flex-col gap-2">
        <label htmlFor="sb-tax" className="text-sm font-medium text-text-secondary">Tax %</label>
        <input
          id="sb-tax" type="number" aria-label="Tax percentage (0 to 100)"
          min={0} max={100} step="0.01"
          value={data.tax}
          onChange={(e) => { const n = parseFloat(e.target.value); onChange({ ...data, tax: isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) }) }}
          className="w-full min-h-[44px] bg-bg/60 text-text border border-white/10 rounded-button px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {/* Service charge */}
      <div className="flex flex-col gap-2">
        <label htmlFor="sb-service" className="text-sm font-medium text-text-secondary">Service charge %</label>
        <input
          id="sb-service" type="number" aria-label="Service charge percentage (0 to 100)"
          min={0} max={100} step="0.01"
          value={data.serviceCharge}
          onChange={(e) => { const n = parseFloat(e.target.value); onChange({ ...data, serviceCharge: isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) }) }}
          className="w-full min-h-[44px] bg-bg/60 text-text border border-white/10 rounded-button px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {/* Calculate button */}
      <button
        type="button" disabled={isDisabled} aria-label="Calculate bill split" aria-disabled={isDisabled}
        className={['min-h-[44px] min-w-[44px] w-full rounded-button px-4 py-2 text-sm font-medium text-white transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg', isDisabled ? 'bg-accent/40 cursor-not-allowed opacity-50' : 'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer'].join(' ')}
      >
        Calculate
      </button>
      </div>

      {/* Result */}
      {showResult && result && (
        <ResultCard copyPayload={copyPayload}>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Subtotal</span><span className="text-text font-medium">{fmt(result.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Tax ({data.tax}%)</span><span className="text-text">{fmt(result.taxAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Service ({data.serviceCharge}%)</span><span className="text-text">{fmt(result.serviceChargeAmount)}</span></div>
            <div className="border-t border-white/10 my-1" />
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Total</span><span className="text-text font-semibold">{fmt(result.total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Per person ({data.people})</span><span className="text-accent font-bold text-base">{fmt(result.perPerson)}</span></div>
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Itemized mode ────────────────────────────────────────────────────────────

interface ItemizedModeProps {
  data: ItemizedBillStorage
  onChange: (data: ItemizedBillStorage) => void
}

function ItemizedMode({ data, onChange }: ItemizedModeProps) {
  const { persons, tax, serviceCharge, sharedCostMode } = data

  function updatePerson(i: number, updated: Person) {
    const next = persons.map((p, idx) => (idx === i ? updated : p))
    onChange({ ...data, persons: next })
  }

  function addPerson() {
    if (persons.length >= 20) return
    onChange({ ...data, persons: [...persons, DEFAULT_PERSON()] })
  }

  function removePerson(i: number) {
    if (persons.length <= 2) return
    onChange({ ...data, persons: persons.filter((_, idx) => idx !== i) })
  }

  function addItem(personIdx: number) {
    const p = persons[personIdx]
    if (p.items.length >= 20) return
    updatePerson(personIdx, { ...p, items: [...p.items, { name: '', price: '' }] })
  }

  function removeItem(personIdx: number, itemIdx: number) {
    const p = persons[personIdx]
    if (p.items.length <= 1) return
    updatePerson(personIdx, { ...p, items: p.items.filter((_, i) => i !== itemIdx) })
  }

  function updateItem(personIdx: number, itemIdx: number, field: keyof LineItem, value: string) {
    const p = persons[personIdx]
    const newItems = p.items.map((item, i) => i === itemIdx ? { ...item, [field]: value } : item)
    updatePerson(personIdx, { ...p, items: newItems })
  }

  // Validation: at least one person has at least one valid price
  const hasAnyPrice = persons.some((p) => p.items.some((item) => parsePrice(item.price) > 0))

  const results = useMemo(
    () => calcItemized(persons, tax, serviceCharge, sharedCostMode),
    [persons, tax, serviceCharge, sharedCostMode],
  )

  const grandTotal = results.reduce((s, r) => s + r.total, 0)
  const copyPayload = hasAnyPrice ? buildItemizedCopyPayload(results, tax, serviceCharge) : ''

  const sharedLabel = sharedCostMode === 'proportional'
    ? 'Proportional (by order size)'
    : 'Equal (split evenly)'

  const inputBase = 'min-h-[44px] bg-bg/60 text-text border border-white/10 rounded-button px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

  return (
    <div className="flex flex-col gap-6">
      {/* Persons */}
      <div className="flex flex-col gap-4">
        {persons.map((person, pi) => {
          const personSubtotal = person.items.reduce((s, item) => s + parsePrice(item.price), 0)
          return (
            <div key={pi} className="glass-panel rounded-card p-4 flex flex-col gap-3">
              {/* Person header */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Person ${pi + 1} name`}
                  placeholder={`Person ${pi + 1}`}
                  value={person.name}
                  onChange={(e) => updatePerson(pi, { ...person, name: e.target.value })}
                  className={`flex-1 ${inputBase}`}
                  maxLength={50}
                />
                <button
                  type="button"
                  aria-label={`Remove person ${pi + 1}`}
                  disabled={persons.length <= 2}
                  onClick={() => removePerson(pi)}
                  className={['min-h-[44px] min-w-[44px] flex items-center justify-center rounded-button text-text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', persons.length <= 2 ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-400 cursor-pointer'].join(' ')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Line items */}
              <div className="flex flex-col gap-2">
                {person.items.map((item, ii) => (
                  <div key={ii} className="flex gap-2 items-center">
                    <input
                      type="text"
                      aria-label={`Person ${pi + 1} item ${ii + 1} name`}
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(pi, ii, 'name', e.target.value)}
                      className={`flex-1 ${inputBase} placeholder:text-text-secondary/40`}
                      maxLength={80}
                    />
                    <input
                      type="number"
                      aria-label={`Person ${pi + 1} item ${ii + 1} price`}
                      placeholder="0.00"
                      value={item.price}
                      min={0}
                      step="0.01"
                      onChange={(e) => updateItem(pi, ii, 'price', e.target.value)}
                      className={`w-24 ${inputBase} placeholder:text-text-secondary/40`}
                    />
                    <button
                      type="button"
                      aria-label={`Remove item ${ii + 1} from person ${pi + 1}`}
                      disabled={person.items.length <= 1}
                      onClick={() => removeItem(pi, ii)}
                      className={['min-h-[44px] min-w-[44px] flex items-center justify-center rounded-button text-text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', person.items.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-400 cursor-pointer'].join(' ')}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item + subtotal row */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label={`Add item for person ${pi + 1}`}
                  disabled={person.items.length >= 20}
                  onClick={() => addItem(pi)}
                  className={['text-xs text-text-secondary hover:text-text transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-1 py-0.5', person.items.length >= 20 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'].join(' ')}
                >
                  + Add item
                </button>
                {personSubtotal > 0 && (
                  <span className="text-xs text-text-secondary">Subtotal: {fmt(personSubtotal)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add person button */}
      <button
        type="button"
        aria-label="Add a person"
        disabled={persons.length >= 20}
        onClick={addPerson}
        className={['min-h-[44px] min-w-[44px] w-full rounded-button px-4 py-2 text-sm font-medium text-text-secondary bg-surface border border-white/10 border-dashed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg', persons.length >= 20 ? 'opacity-40 cursor-not-allowed' : 'hover:text-text hover:border-white/20 transition-colors duration-fast cursor-pointer'].join(' ')}
      >
        + Add person
      </button>

      {/* Shared costs */}
      <div className="flex flex-col gap-4 glass-panel rounded-card p-4">
        <p className="text-sm font-medium text-text-secondary">Shared costs</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="ib-tax" className="text-xs text-text-secondary">Tax %</label>
            <input
              id="ib-tax" type="number" aria-label="Tax percentage" min={0} max={100} step="0.01"
              value={tax}
              onChange={(e) => { const n = parseFloat(e.target.value); onChange({ ...data, tax: isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) }) }}
              className={`w-full ${inputBase}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ib-service" className="text-xs text-text-secondary">Service %</label>
            <input
              id="ib-service" type="number" aria-label="Service charge percentage" min={0} max={100} step="0.01"
              value={serviceCharge}
              onChange={(e) => { const n = parseFloat(e.target.value); onChange({ ...data, serviceCharge: isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) }) }}
              className={`w-full ${inputBase}`}
            />
          </div>
        </div>

        {/* Shared cost split mode */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary">Split shared costs</p>
          <div className="flex rounded-button border border-white/10 overflow-hidden">
            {(['proportional', 'equal'] as SharedCostMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sharedCostMode === mode}
                onClick={() => onChange({ ...data, sharedCostMode: mode })}
                className={['flex-1 min-h-[44px] px-3 py-2 text-xs font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset', sharedCostMode === mode ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:text-text hover:bg-white/5'].join(' ')}
              >
                {mode === 'proportional' ? 'Proportional' : 'Equal'}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-secondary/60">{sharedLabel}</p>
        </div>
      </div>

      {/* Result */}
      {hasAnyPrice && (
        <ResultCard copyPayload={copyPayload}>
          <div className="flex flex-col gap-3">
            {results.map((r, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-text">{r.name}</p>
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Subtotal</span><span>{fmt(r.subtotal)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Tax ({tax}%)</span><span>{fmt(r.sharedTax)}</span>
                  </div>
                )}
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Service ({serviceCharge}%)</span><span>{fmt(r.sharedService)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-accent">
                  <span>Total</span><span>{fmt(r.total)}</span>
                </div>
                {i < results.length - 1 && <div className="border-t border-white/10 mt-1" />}
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-text">
              <span>Grand total</span><span>{fmt(grandTotal)}</span>
            </div>
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SplitBillTool() {
  const [storage, setStorage] = useLocalStorage<SplitBillStorage>('split-bill', DEFAULT_STORAGE)

  const mode = storage.mode

  return (
    <ToolLayout title="Split Bill">
      <div className="flex flex-col gap-6 max-w-lg w-full animate-slide-up">

        {/* Mode selector */}
        <div className="flex rounded-button border border-white/10 overflow-hidden glass-panel">
          {(['simple', 'itemized'] as BillMode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setStorage({ ...storage, mode: m })}
              className={['flex-1 min-h-[44px] px-4 py-2 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset', mode === m ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:text-text hover:bg-white/5'].join(' ')}
            >
              {m === 'simple' ? 'Simple' : 'Itemized'}
            </button>
          ))}
        </div>

        {mode === 'simple' ? (
          <SimpleMode
            data={storage.simple}
            onChange={(simple) => setStorage({ ...storage, simple })}
          />
        ) : (
          <ItemizedMode
            data={storage.itemized}
            onChange={(itemized) => setStorage({ ...storage, itemized })}
          />
        )}
      </div>
    </ToolLayout>
  )
}
