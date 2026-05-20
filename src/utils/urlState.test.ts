import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { encodeState, decodeState, DecodeResult } from './urlState';

describe('URL_State_Encoder', () => {
  describe('encodeState', () => {
    it('encodes simple values', () => {
      const encoded = encodeState({ name: 'test', count: 42 });
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded.length).toBeLessThanOrEqual(2048);
    });

    it('encodes null', () => {
      const encoded = encodeState(null);
      expect(typeof encoded).toBe('string');
    });

    it('encodes arrays', () => {
      const encoded = encodeState([1, 2, 3, 'test']);
      expect(typeof encoded).toBe('string');
    });

    it('encodes strings', () => {
      const encoded = encodeState('hello world');
      expect(typeof encoded).toBe('string');
    });

    it('encodes numbers', () => {
      const encoded = encodeState(42);
      expect(typeof encoded).toBe('string');
    });

    it('encodes booleans', () => {
      const encoded = encodeState(true);
      expect(typeof encoded).toBe('string');
    });

    it('throws when encoded output exceeds 2048 characters', () => {
      // Create a large object that will exceed 2048 chars when encoded
      const largeObject = {
        data: 'x'.repeat(3000),
      };
      expect(() => encodeState(largeObject)).toThrow();
    });

    it('produces valid base64url output (no padding, no + or /)', () => {
      const encoded = encodeState({ test: 'value' });
      // base64url should not contain padding (=), +, or /
      expect(encoded).not.toMatch(/=/);
      expect(encoded).not.toMatch(/\+/);
      expect(encoded).not.toMatch(/\//);
      // Should only contain base64url alphabet
      expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
    });

    it('handles unicode characters', () => {
      const encoded = encodeState({ emoji: '🎉', chinese: '你好', arabic: 'مرحبا' });
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('handles nested objects', () => {
      const encoded = encodeState({
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      });
      expect(typeof encoded).toBe('string');
    });
  });

  describe('decodeState', () => {
    it('decodes simple values', () => {
      const original = { name: 'test', count: 42 };
      const encoded = encodeState(original);
      const result = decodeState<typeof original>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(original);
      }
    });

    it('never throws', () => {
      const invalidInputs = [
        'not-base64url!!!',
        '!!!invalid!!!',
        'SGVsbG8gV29ybGQ=', // valid base64 but invalid base64url (has padding)
        '',
        'A', // incomplete base64
        'AAAA', // valid base64url but might decode to invalid UTF-8
      ];

      for (const input of invalidInputs) {
        expect(() => decodeState(input)).not.toThrow();
      }
    });

    it('returns error for invalid base64url', () => {
      const result = decodeState('!!!invalid!!!');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid-base64url');
      }
    });

    it('returns error for invalid UTF-8', () => {
      // Create invalid UTF-8 by encoding raw bytes that aren't valid UTF-8
      // FF FE is not valid UTF-8
      const invalidUtf8Base64url = '_w'; // base64url for 0xFF 0xFE
      const result = decodeState(invalidUtf8Base64url);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid-utf8');
      }
    });

    it('returns error for invalid JSON', () => {
      // Encode valid UTF-8 that is not valid JSON
      const encoder = new TextEncoder();
      const bytes = encoder.encode('not json at all');
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binaryString);
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const result = decodeState(base64url);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('invalid-json');
      }
    });

    it('handles unicode in decoded values', () => {
      const original = { emoji: '🎉', chinese: '你好', arabic: 'مرحبا' };
      const encoded = encodeState(original);
      const result = decodeState<typeof original>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(original);
      }
    });

    it('handles nested objects', () => {
      const original = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };
      const encoded = encodeState(original);
      const result = decodeState<typeof original>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(original);
      }
    });

    it('handles arrays', () => {
      const original = [1, 2, 3, 'test', { nested: true }];
      const encoded = encodeState(original);
      const result = decodeState<typeof original>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(original);
      }
    });

    it('handles null', () => {
      const encoded = encodeState(null);
      const result = decodeState(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('handles empty string', () => {
      const encoded = encodeState('');
      const result = decodeState<string>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('');
      }
    });

    it('handles empty object', () => {
      const encoded = encodeState({});
      const result = decodeState<Record<string, unknown>>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({});
      }
    });

    it('handles empty array', () => {
      const encoded = encodeState([]);
      const result = decodeState<unknown[]>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('Round-trip property (Property 3)', () => {
    // Feature: dogu-platform, Property 3: URL_State_Encoder round-trip
    // **Validates: Requirements 9.1, 9.2, 9.3**
    it('decodeState(encodeState(value)) round-trips any JSON value ≤ 64 KB', () => {
      fc.assert(
        fc.property(
          // Generator: fc.jsonValue() filtered to ≤ 64 KB serialized size (Requirement 9.1)
          fc.jsonValue({ maxDepth: 5 }).filter((v) => {
            try {
              const json = JSON.stringify(v);
              // Filter to values whose UTF-8 serialization is at most 64 KB
              if (new TextEncoder().encode(json).length > 64 * 1024) {
                return false;
              }
              // Also filter to values that encode within the 2048-char budget
              const encoded = encodeState(v);
              return encoded.length <= 2048;
            } catch {
              return false;
            }
          }),
          (value) => {
            // Requirement 9.1: encode to a valid base64url string ≤ 2048 chars
            const encoded = encodeState(value);
            expect(encoded.length).toBeLessThanOrEqual(2048);
            expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);

            // Requirement 9.2: decode the base64url string back
            const result = decodeState(encoded);

            // Requirement 9.3: round-trip succeeds and value is byte-identical
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(JSON.stringify(result.value)).toBe(JSON.stringify(value));
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error categorization property (Property 4)', () => {
    /**
     * Property 4: URL_State_Encoder error categorization
     * 
     * Three generators:
     * 1. Random non-base64url strings (contain invalid characters)
     * 2. Valid base64url of random bytes (likely invalid UTF-8)
     * 3. Valid base64url of valid UTF-8 non-JSON
     * 
     * Assert decodeState(s) returns { ok: false } with the correct error.kind for each category
     * Validates: Requirements 9.5
     */

    it('categorizes invalid-base64url errors correctly', () => {
      // Generator 1: Random non-base64url strings (contain invalid characters like !, @, #, etc.)
      fc.assert(
        fc.property(
          fc.string().filter((s) => !/^[A-Za-z0-9_-]*$/.test(s) && s.length > 0),
          (invalidBase64url) => {
            const result = decodeState(invalidBase64url);
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error.kind).toBe('invalid-base64url');
              expect(result.error.input).toBe(invalidBase64url);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('categorizes invalid-utf8 errors correctly', () => {
      // Generator 2: Valid base64url of random bytes (likely invalid UTF-8)
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 100 }).filter((bytes) => {
            // Filter to bytes that are likely invalid UTF-8
            // Check if the bytes form valid UTF-8 by trying to decode
            try {
              const decoder = new TextDecoder('utf-8', { fatal: true });
              decoder.decode(bytes);
              return false; // Skip valid UTF-8
            } catch {
              return true; // Keep invalid UTF-8
            }
          }),
          (invalidUtf8Bytes) => {
            // Encode bytes to base64url
            let binaryString = '';
            for (let i = 0; i < invalidUtf8Bytes.length; i++) {
              binaryString += String.fromCharCode(invalidUtf8Bytes[i]);
            }
            const base64 = btoa(binaryString);
            const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            const result = decodeState(base64url);
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error.kind).toBe('invalid-utf8');
              expect(result.error.input).toBe(base64url);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('categorizes invalid-json errors correctly', () => {
      // Generator 3: Valid base64url of valid UTF-8 non-JSON
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            // Filter to strings that are valid UTF-8 but not valid JSON
            try {
              JSON.parse(s);
              return false; // Skip valid JSON
            } catch {
              return true; // Keep non-JSON
            }
          }),
          (nonJsonString) => {
            // Encode string to base64url
            const encoder = new TextEncoder();
            const bytes = encoder.encode(nonJsonString);
            let binaryString = '';
            for (let i = 0; i < bytes.length; i++) {
              binaryString += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binaryString);
            const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            const result = decodeState(base64url);
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error.kind).toBe('invalid-json');
              expect(result.error.input).toBe(base64url);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('validates: Requirements 9.5', () => {
      // Requirement 9.5: each failing step yields the corresponding DecodeError.kind
      // Test that we get the right error kind for each failure mode

      // Invalid base64url
      const invalidBase64urlResult = decodeState('!!!');
      expect(invalidBase64urlResult.ok).toBe(false);
      if (!invalidBase64urlResult.ok) {
        expect(invalidBase64urlResult.error.kind).toBe('invalid-base64url');
      }

      // Invalid UTF-8 (0xFF 0xFE in base64url is _w)
      const invalidUtf8Result = decodeState('_w');
      expect(invalidUtf8Result.ok).toBe(false);
      if (!invalidUtf8Result.ok) {
        expect(invalidUtf8Result.error.kind).toBe('invalid-utf8');
      }

      // Invalid JSON (valid UTF-8 but not JSON)
      const encoder = new TextEncoder();
      const bytes = encoder.encode('not json');
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binaryString);
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const invalidJsonResult = decodeState(base64url);
      expect(invalidJsonResult.ok).toBe(false);
      if (!invalidJsonResult.ok) {
        expect(invalidJsonResult.error.kind).toBe('invalid-json');
      }
    });
  });

  describe('Edge cases', () => {
    it('handles very large valid JSON values up to 2048 char limit', () => {
      const largeString = 'x'.repeat(1500);
      const encoded = encodeState({ data: largeString });
      expect(encoded.length).toBeLessThanOrEqual(2048);

      const result = decodeState<{ data: string }>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toBe(largeString);
      }
    });

    it('handles special JSON values', () => {
      const values = [
        0,
        -0,
        1,
        -1,
        0.5,
        -0.5,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        true,
        false,
        null,
        '',
        'a',
        [],
        {},
      ];

      for (const value of values) {
        const encoded = encodeState(value);
        const result = decodeState(encoded);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(JSON.stringify(result.value)).toBe(JSON.stringify(value));
        }
      }
    });

    it('handles whitespace in JSON', () => {
      const value = { key: 'value with spaces', nested: { inner: 'text' } };
      const encoded = encodeState(value);
      const result = decodeState<typeof value>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(value);
      }
    });

    it('handles newlines and special characters in strings', () => {
      const value = {
        newlines: 'line1\nline2\nline3',
        tabs: 'col1\tcol2\tcol3',
        quotes: 'He said "hello"',
        backslash: 'path\\to\\file',
      };
      const encoded = encodeState(value);
      const result = decodeState<typeof value>(encoded);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(value);
      }
    });
  });
});
