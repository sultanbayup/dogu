import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { filterTools } from '../utils/filterTools'
import type { ToolMetadata } from './HomePage'

/**
 * Arbitrary generator for ToolMetadata
 * Generates valid tool metadata for property-based testing
 */
function arbitraryToolMetadata(): fc.Arbitrary<ToolMetadata> {
  const safeString = (min: number, max: number) =>
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
      { minLength: min, maxLength: max }
    );
  return fc.record({
    slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,62}[a-z0-9]$/).filter(s => s.length >= 1),
    name: safeString(1, 60),
    description: safeString(1, 160),
    category: fc.constantFrom('random', 'calculator', 'generator', 'converter', 'utility'),
    icon: fc.constant(null),
    popular: fc.boolean(),
    component: fc.constant(() => Promise.resolve({ default: null }))
  })
}

describe('filterTools - Property 6: Search filter correctness', () => {
  /**
   * Property 6: Search filter correctness
   * 
   * Validates: Requirements 4.1, 4.5
   * 
   * Assertions:
   * 1. Output is a subsequence of input (same order, subset of elements)
   * 2. Every included element matches the query (name or description contains query as case-insensitive substring)
   * 3. No excluded element matches the query (if an element is not in output, it doesn't match)
   * 4. Empty query returns input unchanged
   */
  it('should satisfy search filter correctness properties', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryToolMetadata()),
        fc.string(),
        (tools, query) => {
          const result = filterTools(tools, query)
          const trimmedQuery = query.trim()

          // Property 1: Output is a subsequence of input
          // Check that result elements appear in the same order in the input
          let inputIndex = 0
          for (const resultTool of result) {
            let found = false
            while (inputIndex < tools.length) {
              if (tools[inputIndex] === resultTool) {
                found = true
                inputIndex++
                break
              }
              inputIndex++
            }
            expect(found).toBe(true)
          }

          // Property 2: Every included element matches the query
          // If query is non-empty, every result element should have name or description containing query
          if (trimmedQuery !== '') {
            const lowerQuery = trimmedQuery.toLowerCase()
            for (const tool of result) {
              const nameMatches = tool.name.toLowerCase().includes(lowerQuery)
              const descriptionMatches = tool.description.toLowerCase().includes(lowerQuery)
              expect(nameMatches || descriptionMatches).toBe(true)
            }
          }

          // Property 3: No excluded element matches the query
          // If query is non-empty, every tool NOT in result should not match
          if (trimmedQuery !== '') {
            const lowerQuery = trimmedQuery.toLowerCase()
            const resultSet = new Set(result)
            for (const tool of tools) {
              if (!resultSet.has(tool)) {
                const nameMatches = tool.name.toLowerCase().includes(lowerQuery)
                const descriptionMatches = tool.description.toLowerCase().includes(lowerQuery)
                expect(nameMatches || descriptionMatches).toBe(false)
              }
            }
          }

          // Property 4: Empty query returns input unchanged (same reference)
          if (trimmedQuery === '') {
            expect(result).toBe(tools)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Unit test: Empty query returns input unchanged
   */
  it('should return input unchanged when query is empty', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'utility',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      }
    ]

    expect(filterTools(tools, '')).toEqual(tools)
    expect(filterTools(tools, '   ')).toEqual(tools)
  })

  /**
   * Unit test: Filters by name substring (case-insensitive)
   */
  it('should filter by name substring (case-insensitive)', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'team-splitter',
        name: 'Team Splitter',
        description: 'Split teams randomly',
        category: 'random',
        icon: null,
        popular: true,
        component: () => Promise.resolve({ default: null })
      },
      {
        slug: 'spin-wheel',
        name: 'Spin Wheel',
        description: 'Spin a wheel',
        category: 'random',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      }
    ]

    const result = filterTools(tools, 'team')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('team-splitter')
  })

  /**
   * Unit test: Filters by description substring (case-insensitive)
   */
  it('should filter by description substring (case-insensitive)', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'team-splitter',
        name: 'Team Splitter',
        description: 'Split teams randomly',
        category: 'random',
        icon: null,
        popular: true,
        component: () => Promise.resolve({ default: null })
      },
      {
        slug: 'spin-wheel',
        name: 'Spin Wheel',
        description: 'Spin a wheel',
        category: 'random',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      }
    ]

    const result = filterTools(tools, 'spin')
    expect(result).toHaveLength(1) // Only 'Spin Wheel' has 'spin' in name or description
    expect(result[0].slug).toBe('spin-wheel')
  })

  /**
   * Unit test: Case-insensitive matching
   */
  it('should perform case-insensitive matching', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'utility',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      }
    ]

    expect(filterTools(tools, 'TEST')).toHaveLength(1)
    expect(filterTools(tools, 'TeSt')).toHaveLength(1)
    expect(filterTools(tools, 'test')).toHaveLength(1)
  })

  /**
   * Unit test: No matches returns empty array
   */
  it('should return empty array when no tools match', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'team-splitter',
        name: 'Team Splitter',
        description: 'Split teams randomly',
        category: 'random',
        icon: null,
        popular: true,
        component: () => Promise.resolve({ default: null })
      }
    ]

    const result = filterTools(tools, 'nonexistent')
    expect(result).toHaveLength(0)
  })

  /**
   * Unit test: Preserves order of input
   */
  it('should preserve the order of input tools', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'alpha',
        name: 'Alpha Tool',
        description: 'First tool',
        category: 'utility',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      },
      {
        slug: 'beta',
        name: 'Beta Tool',
        description: 'Second tool',
        category: 'utility',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      },
      {
        slug: 'gamma',
        name: 'Gamma Tool',
        description: 'Third tool',
        category: 'utility',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      }
    ]

    const result = filterTools(tools, 'tool')
    expect(result.map(t => t.slug)).toEqual(['alpha', 'beta', 'gamma'])
  })

  /**
   * Unit test: Whitespace trimming
   */
  it('should trim whitespace from query', () => {
    const tools: ToolMetadata[] = [
      {
        slug: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: 'utility',
        icon: null,
        popular: false,
        component: () => Promise.resolve({ default: null })
      }
    ]

    expect(filterTools(tools, '  test  ')).toHaveLength(1)
    expect(filterTools(tools, '\ttest\n')).toHaveLength(1)
  })
})
