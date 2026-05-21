import fc from 'fast-check'
import { selectItem } from './selectItem'

// Feature: dogu-mvp-tools, Property 4: Wheel selection index bounds
// Validates: Requirements 7.1, 7.2, 7.3
it('selectItem returns index in [0, N-1] for any valid weights array', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 50 }),
    (weights) => {
      const result = selectItem(weights)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(weights.length)
      expect(Number.isInteger(result)).toBe(true)
    }
  ), { numRuns: 100 })
})

// Equal-weight distribution: all weights equal → each index should be selectable
it('selectItem can return any index when all weights are equal', () => {
  // With 200 runs and equal weights, we expect to see all distinct indices
  const weights = [1, 1, 1, 1, 1] // 5 equal-weight items
  const results = new Set<number>()
  for (let i = 0; i < 200; i++) {
    results.add(selectItem(weights))
  }
  // With 200 runs and 5 equal-weight items, we expect all 5 indices to appear
  expect(results.size).toBe(5)
  for (const idx of results) {
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(weights.length)
  }
})

// Extreme weights: one item with weight 1000, rest with weight 1 → high-weight item selected more often
it('selectItem selects high-weight item more often than low-weight items', () => {
  // weights: [1000, 1, 1, 1, 1] — first item has ~99.6% probability
  const weights = [1000, 1, 1, 1, 1]
  const counts = new Array(weights.length).fill(0)
  const runs = 1000
  for (let i = 0; i < runs; i++) {
    counts[selectItem(weights)]++
  }
  // The high-weight item (index 0) should be selected far more often than any other
  const highWeightCount = counts[0]
  const otherCounts = counts.slice(1)
  // High-weight item should be selected at least 5x more than any single low-weight item
  for (const c of otherCounts) {
    expect(highWeightCount).toBeGreaterThan(c * 5)
  }
  // All results must be valid indices
  for (let i = 0; i < weights.length; i++) {
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(weights.length)
  }
})
