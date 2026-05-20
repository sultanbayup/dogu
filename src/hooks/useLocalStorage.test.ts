import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage, serializeOrError, parseOrDefault } from './useLocalStorage'
import * as fc from 'fast-check'

describe('serializeOrError', () => {
  it('should serialize a simple value to JSON string', () => {
    const result = serializeOrError({ name: 'test', count: 42 })
    expect(result).toBe('{"name":"test","count":42}')
  })

  it('should serialize arrays', () => {
    const result = serializeOrError([1, 2, 3])
    expect(result).toBe('[1,2,3]')
  })

  it('should serialize primitives', () => {
    expect(serializeOrError('hello')).toBe('"hello"')
    expect(serializeOrError(42)).toBe('42')
    expect(serializeOrError(true)).toBe('true')
    expect(serializeOrError(null)).toBe('null')
  })

  it('should return an Error for circular references', () => {
    const circular: any = { a: 1 }
    circular.self = circular
    const result = serializeOrError(circular)
    expect(result).toBeInstanceOf(Error)
  })

  it('should return an Error for non-serializable types', () => {
    // Map is not JSON-serializable (JSON.stringify returns '{}' but loses data,
    // however the real non-serializable case is types that cause stringify to throw
    // or return undefined). Use a circular reference as the canonical example.
    // Note: Date IS serializable (becomes ISO string), so we use a Symbol instead.
    const result = serializeOrError(Symbol('test'))
    expect(result).toBeInstanceOf(Error)
  })

  it('should return an Error for BigInt', () => {
    const result = serializeOrError(BigInt(123))
    expect(result).toBeInstanceOf(Error)
  })

  it('should return an Error for functions', () => {
    const result = serializeOrError(() => {})
    expect(result).toBeInstanceOf(Error)
  })

  it('should return an Error for undefined', () => {
    const result = serializeOrError(undefined)
    expect(result).toBeInstanceOf(Error)
  })
})

describe('parseOrDefault', () => {
  it('should parse valid JSON string', () => {
    const result = parseOrDefault('{"name":"test","count":42}', {})
    expect(result).toEqual({ name: 'test', count: 42 })
  })

  it('should parse arrays', () => {
    const result = parseOrDefault('[1,2,3]', [])
    expect(result).toEqual([1, 2, 3])
  })

  it('should parse primitives', () => {
    expect(parseOrDefault('"hello"', 'default')).toBe('hello')
    expect(parseOrDefault('42', 0)).toBe(42)
    expect(parseOrDefault('true', false)).toBe(true)
    expect(parseOrDefault('null', 'default')).toBe(null)
  })

  it('should return default value for invalid JSON', () => {
    const defaultValue = { fallback: true }
    const result = parseOrDefault('not valid json', defaultValue)
    expect(result).toBe(defaultValue)
  })

  it('should return default value for empty string', () => {
    const defaultValue = { fallback: true }
    const result = parseOrDefault('', defaultValue)
    expect(result).toBe(defaultValue)
  })

  it('should return default value for malformed JSON', () => {
    const defaultValue = []
    const result = parseOrDefault('[1, 2, ', defaultValue)
    expect(result).toBe(defaultValue)
  })
})

describe('useLocalStorage', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
      clear: () => {
        localStorageMock = {}
      },
      length: 0,
      key: () => null
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('key validation', () => {
    it('should throw if key is empty', () => {
      expect(() => {
        renderHook(() => useLocalStorage('', 'default'))
      }).toThrow('key must be non-empty')
    })

    it('should throw if key exceeds 128 characters', () => {
      const longKey = 'a'.repeat(129)
      expect(() => {
        renderHook(() => useLocalStorage(longKey, 'default'))
      }).toThrow('key must be ≤ 128 characters')
    })

    it('should accept key of exactly 128 characters', () => {
      const key128 = 'a'.repeat(128)
      const { result } = renderHook(() => useLocalStorage(key128, 'default'))
      expect(result.current[0]).toBe('default')
    })

    it('should accept key of 1 character', () => {
      const { result } = renderHook(() => useLocalStorage('a', 'default'))
      expect(result.current[0]).toBe('default')
    })
  })

  describe('initialization', () => {
    it('should return default value when key does not exist', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
      expect(result.current[0]).toBe('default')
    })

    it('should parse and return stored JSON value', () => {
      localStorageMock['dogu:test-key'] = JSON.stringify({ count: 42 })
      const { result } = renderHook(() => useLocalStorage('test-key', {}))
      expect(result.current[0]).toEqual({ count: 42 })
    })

    it('should prefix key with "dogu:" namespace', () => {
      localStorageMock['dogu:my-key'] = JSON.stringify('stored-value')
      const { result } = renderHook(() => useLocalStorage('my-key', 'default'))
      expect(result.current[0]).toBe('stored-value')
      expect(localStorageMock['dogu:my-key']).toBeDefined()
      expect(localStorageMock['my-key']).toBeUndefined()
    })

    it('should return default value and warn when stored value is invalid JSON', () => {
      localStorageMock['dogu:test-key'] = 'not valid json'
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
      expect(result.current[0]).toBe('default')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to parse JSON'),
        expect.any(Object)
      )
      warnSpy.mockRestore()
    })

    it('should warn when localStorage is unavailable', () => {
      vi.stubGlobal('localStorage', undefined)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
      expect(result.current[0]).toBe('default')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to read from localStorage'),
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })
  })

  describe('setter', () => {
    it('should update value and write to localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      expect(result.current[0]).toBe('initial')

      act(() => {
        result.current[1]('updated')
      })

      expect(result.current[0]).toBe('updated')
      expect(localStorageMock['dogu:test-key']).toBe('"updated"')
    })

    it('should serialize complex objects', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', {}))

      const obj = { name: 'test', count: 42, nested: { value: true } }
      act(() => {
        result.current[1](obj)
      })

      expect(result.current[0]).toEqual(obj)
      expect(localStorageMock['dogu:test-key']).toBe(JSON.stringify(obj))
    })

    it('should retain previous value and warn when serialization fails', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const circular: any = { a: 1 }
      circular.self = circular

      act(() => {
        result.current[1](circular)
      })

      expect(result.current[0]).toBe('initial')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to serialize value'),
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })

    it('should retain value in memory and warn when localStorage.setItem throws SecurityError', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const securityError = new Error('SecurityError')
      securityError.name = 'SecurityError'
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw securityError
        },
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      })

      act(() => {
        result.current[1]('updated')
      })

      expect(result.current[0]).toBe('updated')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to write to localStorage'),
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })

    it('should retain value in memory and warn when localStorage.setItem throws QuotaExceededError', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const quotaError = new Error('QuotaExceededError')
      quotaError.name = 'QuotaExceededError'
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw quotaError
        },
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      })

      act(() => {
        result.current[1]('updated')
      })

      expect(result.current[0]).toBe('updated')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to write to localStorage'),
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })

    it('should never throw to the calling component', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const circular: any = { a: 1 }
      circular.self = circular

      expect(() => {
        act(() => {
          result.current[1](circular)
        })
      }).not.toThrow()

      vi.restoreAllMocks()
    })

    it('should handle multiple sequential updates', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 0))

      act(() => {
        result.current[1](1)
      })
      expect(result.current[0]).toBe(1)
      expect(localStorageMock['dogu:test-key']).toBe('1')

      act(() => {
        result.current[1](2)
      })
      expect(result.current[0]).toBe(2)
      expect(localStorageMock['dogu:test-key']).toBe('2')

      act(() => {
        result.current[1](3)
      })
      expect(result.current[0]).toBe(3)
      expect(localStorageMock['dogu:test-key']).toBe('3')
    })
  })

  describe('property-based tests', () => {
    it('should round-trip JSON-serializable values (Property 5)', () => {
      fc.assert(
        fc.property(fc.jsonValue(), (value) => {
          const { result } = renderHook(() => useLocalStorage('test-key', null))

          act(() => {
            result.current[1](value)
          })

          // Verify the value is stored and can be retrieved
          const stored = localStorageMock['dogu:test-key']
          expect(stored).toBeDefined()
          expect(JSON.parse(stored)).toEqual(value)
          expect(result.current[0]).toEqual(value)
        })
      )
    })

    it('should parse and serialize consistently (Property 5)', () => {
      fc.assert(
        fc.property(fc.jsonValue(), (value) => {
          const serialized = serializeOrError(value)
          if (serialized instanceof Error) {
            // Skip non-serializable values
            return true
          }

          const parsed = parseOrDefault(serialized, null)
          expect(JSON.stringify(parsed)).toBe(JSON.stringify(value))
        })
      )
    })

    it('should handle edge cases for keys', () => {
      fc.assert(
        fc.property(fc.string().filter((s) => s.length > 0 && s.length <= 128), (key) => {
          const { result } = renderHook(() => useLocalStorage(key, 'default'))
          expect(result.current[0]).toBe('default')
        })
      )
    })
  })
})
