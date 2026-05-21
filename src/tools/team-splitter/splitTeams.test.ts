import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { splitTeams } from './splitTeams'
import { encodeState, decodeState } from '../../utils/urlState'

/**
 * Validates: Requirements 4.1, 4.2, 4.3
 */
describe('splitTeams property tests', () => {
  // Feature: dogu-mvp-tools, Property 1: Team split partition correctness
  it('every name appears in exactly one team', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 100 })
          .chain(names =>
            fc.tuple(
              fc.constant(names),
              fc.integer({ min: 2, max: Math.min(20, names.length) }),
              fc.boolean(),
            ),
          ),
        ([names, k, balanced]) => {
          const teams = splitTeams(names, k, balanced)
          const allMembers = teams.flat()
          expect(teams).toHaveLength(k)
          expect(allMembers.sort()).toEqual([...names].sort())
          teams.forEach(t => expect(t.length).toBeGreaterThanOrEqual(1))
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: dogu-mvp-tools, Property 2: Balanced mode size invariant
  it('balanced mode: max size - min size ≤ 1', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 100 })
          .chain(names =>
            fc.tuple(
              fc.constant(names),
              fc.integer({ min: 2, max: Math.min(20, names.length) }),
            ),
          ),
        ([names, k]) => {
          const teams = splitTeams(names, k, true)
          const sizes = teams.map(t => t.length)
          expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Validates: Requirements 4.4
 */
describe('team assignment URL round-trip', () => {
  // Feature: dogu-mvp-tools, Property 3: Team assignment URL round-trip
  // Validates: Requirements 4.4
  it('team assignment URL round-trip recovers same teams and members', () => {
    fc.assert(
      fc.property(
        // Generate a valid TeamAssignment: array of arrays of strings
        fc.array(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          { minLength: 2, maxLength: 20 },
        ),
        assignment => {
          let encoded: string
          try {
            // encodeState may throw if encoded string exceeds 2048 characters
            encoded = encodeState(assignment)
          } catch {
            // Expected behavior for very large inputs — skip assertion
            return
          }
          const decoded = decodeState<string[][]>(encoded)
          expect(decoded.ok).toBe(true)
          if (decoded.ok) {
            expect(decoded.value).toHaveLength(assignment.length)
            for (let i = 0; i < assignment.length; i++) {
              expect([...decoded.value[i]].sort()).toEqual([...assignment[i]].sort())
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
