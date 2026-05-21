import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { escapeWifiField, encodeWifiQr, parseWifiQr } from './wifiQr'

// ---------------------------------------------------------------------------
// Unit tests — escapeWifiField
// ---------------------------------------------------------------------------

describe('escapeWifiField', () => {
  it('leaves plain alphanumeric strings unchanged', () => {
    expect(escapeWifiField('MyNetwork123')).toBe('MyNetwork123')
  })

  it('escapes backslash', () => {
    expect(escapeWifiField('a\\b')).toBe('a\\\\b')
  })

  it('escapes semicolon', () => {
    expect(escapeWifiField('a;b')).toBe('a\\;b')
  })

  it('escapes comma', () => {
    expect(escapeWifiField('a,b')).toBe('a\\,b')
  })

  it('escapes double-quote', () => {
    expect(escapeWifiField('a"b')).toBe('a\\"b')
  })

  it('escapes colon', () => {
    expect(escapeWifiField('a:b')).toBe('a\\:b')
  })

  it('escapes all special chars in one string', () => {
    expect(escapeWifiField('\\;,":')).toBe('\\\\\\;\\,\\"\\:')
  })

  it('does not double-escape an already-escaped backslash', () => {
    // Input: one backslash -> output: two backslashes
    const result = escapeWifiField('\\')
    expect(result).toBe('\\\\')
    // Applying again should produce four backslashes (not three)
    expect(escapeWifiField(result)).toBe('\\\\\\\\')
  })
})

// ---------------------------------------------------------------------------
// Unit tests — encodeWifiQr
// ---------------------------------------------------------------------------

describe('encodeWifiQr', () => {
  it('produces correct format for WPA', () => {
    expect(encodeWifiQr('MySSID', 'MyPass', 'WPA')).toBe(
      'WIFI:T:WPA;S:MySSID;P:MyPass;;',
    )
  })

  it('produces correct format for WEP', () => {
    expect(encodeWifiQr('Net', 'secret', 'WEP')).toBe(
      'WIFI:T:WEP;S:Net;P:secret;;',
    )
  })

  it('produces empty P: field for nopass', () => {
    expect(encodeWifiQr('OpenNet', '', 'nopass')).toBe(
      'WIFI:T:nopass;S:OpenNet;P:;;',
    )
  })

  it('escapes special chars in SSID', () => {
    expect(encodeWifiQr('Net;Work', 'pass', 'WPA')).toBe(
      'WIFI:T:WPA;S:Net\\;Work;P:pass;;',
    )
  })

  it('escapes special chars in password', () => {
    expect(encodeWifiQr('SSID', 'p@ss:word', 'WPA')).toBe(
      'WIFI:T:WPA;S:SSID;P:p@ss\\:word;;',
    )
  })

  it('ignores password for nopass auth type', () => {
    // Even if a password is supplied, nopass should produce empty P:
    expect(encodeWifiQr('SSID', 'ignored', 'nopass')).toBe(
      'WIFI:T:nopass;S:SSID;P:;;',
    )
  })
})

// ---------------------------------------------------------------------------
// Unit tests — parseWifiQr
// ---------------------------------------------------------------------------

describe('parseWifiQr', () => {
  it('parses a valid WPA string', () => {
    const result = parseWifiQr('WIFI:T:WPA;S:MySSID;P:MyPass;;')
    expect(result).toEqual({ ssid: 'MySSID', password: 'MyPass', auth: 'WPA' })
  })

  it('parses a valid WEP string', () => {
    const result = parseWifiQr('WIFI:T:WEP;S:Net;P:secret;;')
    expect(result).toEqual({ ssid: 'Net', password: 'secret', auth: 'WEP' })
  })

  it('parses a valid nopass string with empty password', () => {
    const result = parseWifiQr('WIFI:T:nopass;S:OpenNet;P:;;')
    expect(result).toEqual({ ssid: 'OpenNet', password: '', auth: 'nopass' })
  })

  it('unescapes special chars in SSID', () => {
    const result = parseWifiQr('WIFI:T:WPA;S:Net\\;Work;P:pass;;')
    expect(result).toEqual({ ssid: 'Net;Work', password: 'pass', auth: 'WPA' })
  })

  it('unescapes special chars in password', () => {
    const result = parseWifiQr('WIFI:T:WPA;S:SSID;P:p@ss\\:word;;')
    expect(result).toEqual({ ssid: 'SSID', password: 'p@ss:word', auth: 'WPA' })
  })

  it('returns null for a string not starting with WIFI:', () => {
    expect(parseWifiQr('http://example.com')).toBeNull()
  })

  it('returns null for a string not ending with ;;', () => {
    expect(parseWifiQr('WIFI:T:WPA;S:SSID;P:pass;')).toBeNull()
  })

  it('returns null for an unknown auth type', () => {
    expect(parseWifiQr('WIFI:T:WPA2;S:SSID;P:pass;;')).toBeNull()
  })

  it('returns null for a missing S field', () => {
    expect(parseWifiQr('WIFI:T:WPA;P:pass;;')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseWifiQr('')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

/** Characters that must be backslash-escaped in WiFi QR fields */
const SPECIAL_CHARS = ['\\', ';', ',', '"', ':']

/** Arbitrary for non-empty SSID / password strings (printable ASCII) */
const nonEmptyPrintableString = fc.string({ minLength: 1, maxLength: 64 }).filter(
  s => s.length > 0,
)

/** Arbitrary for valid auth types */
const authTypeArb = fc.constantFrom<'WPA' | 'WEP' | 'nopass'>('WPA', 'WEP', 'nopass')

// ---------------------------------------------------------------------------
// Property 6: WiFi QR string encoding correctness
// Feature: dogu-mvp-tools, Property 6: WiFi QR string encoding correctness
// ---------------------------------------------------------------------------

describe('Property 6: WiFi QR string encoding correctness', () => {
  /**
   * **Validates: Requirements 13.1, 13.3**
   *
   * For any non-empty SSID, password, and auth type in { 'WPA', 'WEP', 'nopass' },
   * encodeWifiQr produces a string that:
   *   - starts with 'WIFI:T:' and ends with ';;'
   *   - has every special char in the original SSID/password preceded by a backslash
   *   - has an empty P: field when auth is 'nopass'
   */

  it('output starts with WIFI:T: and ends with ;;', () => {
    fc.assert(
      fc.property(nonEmptyPrintableString, nonEmptyPrintableString, authTypeArb, (ssid, password, auth) => {
        const result = encodeWifiQr(ssid, password, auth)
        expect(result.startsWith('WIFI:T:')).toBe(true)
        expect(result.endsWith(';;')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('special chars in SSID are backslash-escaped in output', () => {
    fc.assert(
      fc.property(
        // Generate SSIDs that contain at least one special character
        fc.tuple(
          fc.constantFrom(...SPECIAL_CHARS),
          fc.string({ minLength: 0, maxLength: 30 }),
          fc.string({ minLength: 0, maxLength: 30 }),
        ).map(([special, prefix, suffix]) => prefix + special + suffix),
        nonEmptyPrintableString,
        authTypeArb,
        (ssid, password, auth) => {
          const result = encodeWifiQr(ssid, password, auth)
          // Extract the S: field value (between S: and the next unescaped ;)
          const sFieldMatch = result.match(/;S:((?:[^;\\]|\\.)*)/)
          expect(sFieldMatch).not.toBeNull()
          const sField = sFieldMatch![1]
          // Every special char in the original SSID must appear escaped in the S field
          for (const ch of SPECIAL_CHARS) {
            const occurrences = ssid.split(ch).length - 1
            if (occurrences > 0) {
              const escapedPattern = '\\\\' + (ch === '\\' ? '\\\\' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              const escapedCount = (sField.match(new RegExp(escapedPattern, 'g')) ?? []).length
              expect(escapedCount).toBeGreaterThanOrEqual(occurrences)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('nopass auth produces empty P: field', () => {
    fc.assert(
      fc.property(nonEmptyPrintableString, nonEmptyPrintableString, (ssid, password) => {
        const result = encodeWifiQr(ssid, password, 'nopass')
        // The P: field must be empty -- followed immediately by ;;
        expect(result).toContain(';P:;;')
      }),
      { numRuns: 100 },
    )
  })

  it('output contains auth type in T: field', () => {
    fc.assert(
      fc.property(nonEmptyPrintableString, nonEmptyPrintableString, authTypeArb, (ssid, password, auth) => {
        const result = encodeWifiQr(ssid, password, auth)
        expect(result).toContain(`WIFI:T:${auth};`)
      }),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 7: WiFi QR string round-trip
// Feature: dogu-mvp-tools, Property 7: WiFi QR string round-trip
// ---------------------------------------------------------------------------

describe('Property 7: WiFi QR string round-trip', () => {
  /**
   * **Validates: Requirements 13.2**
   *
   * For any non-empty SSID, password, and valid auth type,
   * parseWifiQr(encodeWifiQr(ssid, password, auth)) recovers the original
   * SSID, password, and auth type.
   *
   * For 'nopass', the password is always stored as empty string regardless
   * of the input password, so we verify the recovered password is ''.
   */

  it('round-trip recovers original SSID, password, and auth for WPA/WEP', () => {
    fc.assert(
      fc.property(
        nonEmptyPrintableString,
        nonEmptyPrintableString,
        fc.constantFrom<'WPA' | 'WEP'>('WPA', 'WEP'),
        (ssid, password, auth) => {
          const encoded = encodeWifiQr(ssid, password, auth)
          const parsed = parseWifiQr(encoded)
          expect(parsed).not.toBeNull()
          expect(parsed!.ssid).toBe(ssid)
          expect(parsed!.password).toBe(password)
          expect(parsed!.auth).toBe(auth)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('round-trip for nopass recovers SSID and empty password', () => {
    fc.assert(
      fc.property(nonEmptyPrintableString, nonEmptyPrintableString, (ssid, password) => {
        const encoded = encodeWifiQr(ssid, password, 'nopass')
        const parsed = parseWifiQr(encoded)
        expect(parsed).not.toBeNull()
        expect(parsed!.ssid).toBe(ssid)
        expect(parsed!.password).toBe('')
        expect(parsed!.auth).toBe('nopass')
      }),
      { numRuns: 100 },
    )
  })

  it('round-trip is stable for SSIDs/passwords containing all special chars', () => {
    fc.assert(
      fc.property(
        // Generate strings that include every special character
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s + '\\;,":'),
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s + ':;,"\\'),
        fc.constantFrom<'WPA' | 'WEP'>('WPA', 'WEP'),
        (ssid, password, auth) => {
          const encoded = encodeWifiQr(ssid, password, auth)
          const parsed = parseWifiQr(encoded)
          expect(parsed).not.toBeNull()
          expect(parsed!.ssid).toBe(ssid)
          expect(parsed!.password).toBe(password)
          expect(parsed!.auth).toBe(auth)
        },
      ),
      { numRuns: 100 },
    )
  })
})
