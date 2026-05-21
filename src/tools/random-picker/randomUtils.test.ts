import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { pickRandom, shuffleItems, generateNumber } from './randomUtils'

// Feature: dogu-mvp-tools, Property 8: Random picker index bounds
// Validates: Requirements 16.1
describe('pickRandom', () => {
  it('returns an integer in [0, N-1] for any N in [1, 200]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (n) => {
          const result = pickRandom(n)
          expect(result).toBeGreaterThanOrEqual(0)
          expect(result).toBeLessThan(n)
          expect(Number.isInteger(result)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: dogu-mvp-tools, Property 9: Shuffle permutation correctness
// Validates: Requirements 16.2
describe('shuffleItems', () => {
  it('returns same-length array with same multiset of items', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 50 }),
        (items) => {
          const shuffled = shuffleItems(items)
          expect(shuffled).toHaveLength(items.length)
          expect([...shuffled].sort()).toEqual([...items].sort())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 50 }),
        (items) => {
          const original = [...items]
          shuffleItems(items)
          expect(items).toEqual(original)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: dogu-mvp-tools, Property 10: Random number bounds
// Validates: Requirements 16.3
describe('generateNumber', () => {
  it('returns an integer in [min, max] for valid pairs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -999_999_999, max: 999_999_998 }).chain((min) =>
          fc.tuple(
            fc.constant(min),
            fc.integer({ min: min + 1, max: 999_999_999 })
          )
        ),
        ([min, max]) => {
          const result = generateNumber(min, max)
          expect(result).toBeGreaterThanOrEqual(min)
          expect(result).toBeLessThanOrEqual(max)
          expect(Number.isInteger(result)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
