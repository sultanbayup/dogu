import { useState, useEffect, useCallback } from 'react'
import { encodeState, decodeState } from '../utils/urlState'

/**
 * React hook for reading and writing JSON-serializable state to the URL hash.
 *
 * - Reads window.location.hash on mount and decodes via decodeState
 * - On decode failure, returns defaultValue and emits console.warn
 * - Setter encodes via encodeState and writes to window.location.hash
 * - Listens for hashchange events to sync state when the hash changes externally
 *
 * @param defaultValue - The default value if hash is absent or decoding fails
 * @returns A tuple of [currentValue, setter]
 */
export function useUrlHashState<T>(defaultValue: T): [T, (next: T) => void] {
  const readFromHash = useCallback((): T => {
    const raw = window.location.hash.slice(1) // strip leading '#'
    if (!raw) {
      return defaultValue
    }
    const result = decodeState<T>(raw)
    if (result.ok) {
      return result.value
    }
    console.warn(
      'useUrlHashState: failed to decode URL hash state',
      { kind: result.error.kind, input: result.error.input }
    )
    return defaultValue
  }, [defaultValue])

  const [value, setValue] = useState<T>(() => readFromHash())

  // Listen for hashchange events to sync state
  useEffect(() => {
    const handleHashChange = () => {
      setValue(readFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [readFromHash])

  const setter = useCallback((next: T) => {
    const encoded = encodeState(next)
    window.location.hash = encoded
    setValue(next)
  }, [])

  return [value, setter]
}
