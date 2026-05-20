import { describe, it, expect } from 'vitest'
import { filterTools } from '../utils/filterTools'
import type { ToolMetadata } from './HomePage'

// Helper to create test tools
function createTool(overrides: Partial<ToolMetadata> = {}): ToolMetadata {
  return {
    slug: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool',
    category: 'utility',
    icon: null,
    popular: false,
    component: async () => ({ default: null }),
    ...overrides,
  }
}

describe('filterTools', () => {
  describe('empty query', () => {
    it('returns input unchanged when query is empty string', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Tool One' }),
        createTool({ slug: 'tool-2', name: 'Tool Two' }),
      ]
      const result = filterTools(tools, '')
      expect(result).toBe(tools)
    })

    it('returns input unchanged when query is only whitespace', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Tool One' }),
        createTool({ slug: 'tool-2', name: 'Tool Two' }),
      ]
      const result = filterTools(tools, '   ')
      expect(result).toBe(tools)
    })

    it('returns input unchanged when query is tabs and spaces', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Tool One' }),
      ]
      const result = filterTools(tools, '\t  \n  ')
      expect(result).toBe(tools)
    })
  })

  describe('name matching', () => {
    it('filters tools by exact name match', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Team Splitter' }),
        createTool({ slug: 'tool-2', name: 'Spin Wheel' }),
        createTool({ slug: 'tool-3', name: 'Split Bill' }),
      ]
      const result = filterTools(tools, 'Split')
      expect(result).toHaveLength(2)
      expect(result[0].slug).toBe('tool-1')
      expect(result[1].slug).toBe('tool-3')
    })

    it('performs case-insensitive name matching', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Team Splitter' }),
        createTool({ slug: 'tool-2', name: 'Spin Wheel' }),
      ]
      const result = filterTools(tools, 'TEAM')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-1')
    })

    it('matches partial substrings in name', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Team Splitter' }),
        createTool({ slug: 'tool-2', name: 'Spin Wheel' }),
      ]
      const result = filterTools(tools, 'Spl')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-1')
    })
  })

  describe('description matching', () => {
    it('filters tools by description match', () => {
      const tools = [
        createTool({
          slug: 'tool-1',
          name: 'Tool One',
          description: 'Split a team into groups',
        }),
        createTool({
          slug: 'tool-2',
          name: 'Tool Two',
          description: 'Spin a wheel to pick a winner',
        }),
      ]
      const result = filterTools(tools, 'wheel')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-2')
    })

    it('performs case-insensitive description matching', () => {
      const tools = [
        createTool({
          slug: 'tool-1',
          name: 'Tool One',
          description: 'Split a team into groups',
        }),
      ]
      const result = filterTools(tools, 'SPLIT')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-1')
    })
  })

  describe('name or description matching', () => {
    it('matches if query is in name or description', () => {
      const tools = [
        createTool({
          slug: 'tool-1',
          name: 'Team Splitter',
          description: 'Divide people into groups',
        }),
        createTool({
          slug: 'tool-2',
          name: 'Spin Wheel',
          description: 'Split the bill among friends',
        }),
      ]
      const result = filterTools(tools, 'split')
      expect(result).toHaveLength(2)
    })
  })

  describe('order preservation', () => {
    it('preserves input order in filtered results', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Apple' }),
        createTool({ slug: 'tool-2', name: 'Banana' }),
        createTool({ slug: 'tool-3', name: 'Apricot' }),
        createTool({ slug: 'tool-4', name: 'Cherry' }),
      ]
      const result = filterTools(tools, 'ap')
      expect(result).toHaveLength(2)
      expect(result[0].slug).toBe('tool-1')
      expect(result[1].slug).toBe('tool-3')
    })
  })

  describe('no matches', () => {
    it('returns empty array when no tools match', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Team Splitter' }),
        createTool({ slug: 'tool-2', name: 'Spin Wheel' }),
      ]
      const result = filterTools(tools, 'xyz')
      expect(result).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty input array', () => {
      const result = filterTools([], 'query')
      expect(result).toHaveLength(0)
    })

    it('handles query with leading/trailing whitespace', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Team Splitter' }),
      ]
      const result = filterTools(tools, '  Team  ')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-1')
    })

    it('handles special characters in query', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Tool (Beta)' }),
        createTool({ slug: 'tool-2', name: 'Regular Tool' }),
      ]
      const result = filterTools(tools, '(Beta)')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-1')
    })

    it('handles unicode characters', () => {
      const tools = [
        createTool({ slug: 'tool-1', name: 'Café Tool' }),
        createTool({ slug: 'tool-2', name: 'Regular Tool' }),
      ]
      const result = filterTools(tools, 'café')
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('tool-1')
    })
  })
})
