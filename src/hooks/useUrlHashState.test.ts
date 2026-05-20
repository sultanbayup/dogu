import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUrlHashState } from './useUrlHashState'
import { encodeState } from '../utils/urlState'
import * as fc from 'fast-check'

describe('useUrlHashState', () => {
  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = ''
  })

  afterEach(() => {
    window.location.hash = ''
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should return defaultValue when hash is empty', () => {
      window.location.hash = ''
      const { result } = renderHook(() => useUrlHashState('default'))
      expect(result.current[0]).toBe('default')
    })

    it('should decode and return value from hash on mount', () => {
      const encoded = encodeState({ count: 42 })
      window.location.hash = encoded
      const { result } = renderHook(() => useUrlHashState({ count: 0 }))
      expect(result.current[0]).toEqual({ count: 42 })
    })

    it('should return defaultValue and warn when hash is invalid base64url', () => {
      window.location.hash = '!!!invalid!!!'
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result } = renderHook(() => useUrlHashState('default'))
      expect(result.current[0]).toBe('default')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to decode URL hash state'),
        expect.objectContaining({ kind: expect.any(String) })
      )
    })

    it('should return defaultValue and warn when hash decodes to invalid JSON', () => {
      // Manually craft a base64url that decodes to non-JSON UTF-8
      // 'hello' is valid base64url but not valid JSON
      const notJson = btoa('not-json-at-all').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      window.location.hash = notJson
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result } = renderHook(() => useUrlHashState('default'))
      expect(result.current[0]).toBe('default')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to decode URL hash state'),
        expect.objectContaining({ kind: expect.any(String) })
      )
    })
  })

  describe('setter', () => {
    it('should encode value and write to window.location.hash', () => {
      const { result } = renderHook(() => useUrlHashState('initial'))

      act(() => {
        result.current[1]('updated')
      })

      expect(result.current[0]).toBe('updated')
      expect(window.location.hash).toBe('#' + encodeState('updated'))
    })

    it('should update state with complex objects', () => {
      const { result } = renderHook(() => useUrlHashState<{ name: string; count: number } | null>(null))
      const obj = { name: 'test', count: 42 }

      act(() => {
        result.current[1](obj)
      })

      expect(result.current[0]).toEqual(obj)
      expect(window.location.hash).toBe('#' + encodeState(obj))
    })

    it('should handle multiple sequential updates', () => {
      const { result } = renderHook(() => useUrlHashState(0))

      act(() => { result.current[1](1) })
      expect(result.current[0]).toBe(1)

      act(() => { result.current[1](2) })
      expect(result.current[0]).toBe(2)

      act(() => { result.current[1](3) })
      expect(result.current[0]).toBe(3)
    })
  })

  describe('hashchange event', () => {
    it('should sync state when hashchange event fires', () => {
      const { result } = renderHook(() => useUrlHashState('initial'))
      expect(result.current[0]).toBe('initial')

      const encoded = encodeState('from-hash-change')
      act(() => {
        window.location.hash = encoded
        window.dispatchEvent(new Event('hashchange'))
      })

      expect(result.current[0]).toBe('from-hash-change')
    })

    it('should return defaultValue and warn when hashchange fires with invalid hash', () => {
      const encoded = encodeState('valid')
      window.location.hash = encoded
      const { result } = renderHook(() => useUrlHashState('default'))
      expect(result.current[0]).toBe('valid')

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      act(() => {
        window.location.hash = '!!!bad!!!'
        window.dispatchEvent(new Event('hashchange'))
      })

      expect(result.current[0]).toBe('default')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to decode URL hash state'),
        expect.any(Object)
      )
    })

    it('should remove hashchange listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderHook(() => useUrlHashState('initial'))
      unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))
    })
  })

  describe('property-based tests', () => {
    it('should round-trip JSON-serializable values through the hash (Validates: Requirements 9.4, 9.6)', () => {
      fc.assert(
        fc.property(fc.jsonValue(), (value) => {
          // Reset hash
          window.location.hash = ''
          const { result } = renderHook(() => useUrlHashState<unknown>(null))

          act(() => {
            result.current[1](value)
          })

          // The stored hash should decode back to the same value
          const hashContent = window.location.hash.slice(1)
          expect(hashContent).toBeTruthy()
          expect(result.current[0]).toEqual(value)
        })
      )
    })

    it('should always return defaultValue for invalid hashes (Validates: Requirements 9.7)', () => {
      fc.assert(
        fc.property(
          // Generate strings that are NOT valid base64url (contain invalid chars)
          fc.string({ minLength: 1 }).filter(s => /[^A-Za-z0-9_-]/.test(s)),
          (invalidHash) => {
            window.location.hash = invalidHash
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const defaultValue = 'fallback'
            const { result } = renderHook(() => useUrlHashState(defaultValue))
            const returnedValue = result.current[0]
            warnSpy.mockRestore()
            // Should return defaultValue when hash is invalid
            expect(returnedValue).toBe(defaultValue)
          }
        )
      )
    })
  })
})
