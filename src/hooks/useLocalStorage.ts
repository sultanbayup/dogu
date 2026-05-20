import { useState } from 'react'

const NAMESPACE = 'dogu:'
const MAX_KEY_LENGTH = 128

/**
 * Serialize a value to JSON string or return an Error if serialization fails.
 * Pure function for testability.
 *
 * Note: JSON.stringify returns `undefined` (not a string) for functions,
 * `undefined`, and symbols — these are treated as serialization failures.
 */
export function serializeOrError(value: unknown): string | Error {
  try {
    const result = JSON.stringify(value)
    if (result === undefined) {
      return new Error(`Value of type "${typeof value}" is not JSON-serializable`)
    }
    return result
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Parse a JSON string to a value of type T, or return the default value if parsing fails.
 * Pure function for testability.
 */
export function parseOrDefault<T>(raw: string, defaultValue: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

/**
 * React hook for reading and writing JSON-serializable values to localStorage.
 * - Prefixes all keys with 'dogu:' namespace
 * - Throws synchronously if key is empty or > 128 chars
 * - On init: attempts localStorage.getItem; parses JSON or returns default; warns on parse failure
 * - Setter: tries JSON.stringify, then localStorage.setItem; on any failure retains value in memory, emits console.warn, never throws
 * - Handles SecurityError, QuotaExceededError, missing localStorage
 *
 * @param key - The storage key (1–128 characters, non-empty)
 * @param defaultValue - The default value if key doesn't exist or parse fails
 * @returns A tuple of [currentValue, setter]
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (next: T) => void] {
  // Validate key synchronously on every render
  if (!key || key.length === 0) {
    throw new Error('useLocalStorage: key must be non-empty')
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new Error(`useLocalStorage: key must be ≤ ${MAX_KEY_LENGTH} characters`)
  }

  const prefixedKey = NAMESPACE + key
  const [value, setValue] = useState<T>(() => {
    // Initialize from localStorage on first render
    try {
      // Check if localStorage is available; if not, warn and return default
      if (typeof window === 'undefined' || !window.localStorage) {
        throw new Error('localStorage unavailable')
      }

      const stored = window.localStorage.getItem(prefixedKey)

      if (stored === null) {
        return defaultValue
      }

      const parsed = parseOrDefault(stored, defaultValue)
      if (parsed === defaultValue && stored !== JSON.stringify(defaultValue)) {
        // Parse failed; warn
        console.warn(
          `useLocalStorage: failed to parse JSON for key "${key}"`,
          { stored }
        )
      }
      return parsed
    } catch (error) {
      // localStorage unavailable or other error on read
      console.warn(
        `useLocalStorage: failed to read from localStorage for key "${key}"`,
        error instanceof Error ? error : new Error(String(error))
      )
      return defaultValue
    }
  })

  const setter = (next: T) => {
    // Try to serialize
    const serialized = serializeOrError(next)
    if (serialized instanceof Error) {
      // Serialization failed; warn and retain current value
      console.warn(
        `useLocalStorage: failed to serialize value for key "${key}"`,
        serialized
      )
      return
    }

    // Try to write to localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(prefixedKey, serialized)
      } else {
        throw new Error('localStorage unavailable')
      }
    } catch (error) {
      // localStorage write failed (SecurityError, QuotaExceededError, etc.)
      // Retain value in memory but warn
      const errorName =
        error instanceof Error ? error.name : 'unknown error'
      console.warn(
        `useLocalStorage: failed to write to localStorage for key "${key}": ${errorName}`,
        error
      )
      // Don't return early; still update in-memory state
    }

    // Always update in-memory state
    setValue(next)
  }

  return [value, setter]
}
