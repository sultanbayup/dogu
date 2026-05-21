import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateBill } from './calculate'

// Feature: dogu-mvp-tools, Property 5: Split bill arithmetic correctness

// fc.float requires 32-bit float bounds; use Math.fround to convert doubles
const MIN_SUBTOTAL = Math.fround(0.01)
const MAX_SUBTOTAL = Math.fround(999_999_999)
const MAX_PCT = Math.fround(100)

describe('calculateBill — property tests', () => {
  /**
   * Validates: Requirements 10.1, 10.2, 10.3
   *
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('rounding tolerance: |perPerson × people − total| ≤ 0.01 × people and perPerson > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }).chain((people) =>
          fc.tuple(
            // Ensure subtotal/people >= 0.01 so perPerson rounds to >= 0.01 > 0
            // Use integer cents (subtotal = cents/100) to avoid float precision issues
            fc.integer({ min: people, max: 99_999_999_999 }).map((cents) => cents / 100),
            fc.constant(people),
            fc.float({ min: 0, max: MAX_PCT, noNaN: true }),
            fc.float({ min: 0, max: MAX_PCT, noNaN: true }),
          ),
        ),
        ([subtotal, people, tax, serviceCharge]) => {
          const r = calculateBill(subtotal, people, tax, serviceCharge)
          expect(Math.abs(r.perPerson * people - r.total)).toBeLessThanOrEqual(0.01 * people)
          expect(r.perPerson).toBeGreaterThan(0)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('zero-charge identity: when tax=0 and serviceCharge=0, |total − subtotal| < 0.001', () => {
    fc.assert(
      fc.property(
        fc.float({ min: MIN_SUBTOTAL, max: MAX_SUBTOTAL, noNaN: true }),
        fc.integer({ min: 1, max: 100 }),
        (subtotal, people) => {
          const r = calculateBill(subtotal, people, 0, 0)
          expect(Math.abs(r.total - subtotal)).toBeLessThan(0.001)
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('calculateBill — unit tests', () => {
  it('computes correct breakdown for subtotal=100, people=3, tax=8, serviceCharge=10', () => {
    // taxAmount = 100 × 0.08 = 8.00
    // serviceChargeAmount = 100 × 0.10 = 10.00
    // total = 100 × 1.08 × 1.10 = 118.80
    // perPerson = roundHalfUp(118.80 / 3, 2) = roundHalfUp(39.6, 2) = 39.60
    const r = calculateBill(100, 3, 8, 10)
    expect(r.subtotal).toBe(100)
    expect(r.taxAmount).toBeCloseTo(8.0, 5)
    expect(r.serviceChargeAmount).toBeCloseTo(10.0, 5)
    expect(r.total).toBeCloseTo(118.8, 5)
    expect(r.perPerson).toBe(39.6)
  })

  it('computes correct breakdown for subtotal=50, people=2, tax=0, serviceCharge=0', () => {
    const r = calculateBill(50, 2, 0, 0)
    expect(r.subtotal).toBe(50)
    expect(r.taxAmount).toBe(0)
    expect(r.serviceChargeAmount).toBe(0)
    expect(r.total).toBe(50)
    expect(r.perPerson).toBe(25)
  })

  it('rounds perPerson correctly when total does not divide evenly', () => {
    // subtotal=10, people=3, tax=0, serviceCharge=0
    // total = 10, perPerson = roundHalfUp(10/3, 2) = roundHalfUp(3.3333..., 2) = 3.33
    const r = calculateBill(10, 3, 0, 0)
    expect(r.perPerson).toBe(3.33)
  })

  it('handles single person correctly', () => {
    const r = calculateBill(200, 1, 10, 5)
    // total = 200 × 1.10 × 1.05 = 231.00
    expect(r.total).toBeCloseTo(231.0, 5)
    expect(r.perPerson).toBeCloseTo(231.0, 2)
  })

  it('handles maximum people (100) correctly', () => {
    const r = calculateBill(1000, 100, 0, 0)
    expect(r.perPerson).toBe(10)
  })

  it('perPerson is positive when subtotal is large enough relative to people', () => {
    // 1.00 / 100 = 0.01 → rounds to 0.01 > 0
    const r = calculateBill(1.0, 100, 0, 0)
    expect(r.perPerson).toBeGreaterThan(0)
    expect(r.perPerson).toBe(0.01)
  })
})
