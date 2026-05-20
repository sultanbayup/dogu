/**
 * URL State Encoder - Pure utility for encoding/decoding JSON state to/from base64url strings
 * 
 * Encoding pipeline: JSON.stringify → TextEncoder UTF-8 → base64url (no padding, + → -, / → _)
 * Decoding inverts each step; each failing step yields the corresponding DecodeError.kind
 */

export type DecodeError =
  | { kind: 'invalid-base64url'; input: string }
  | { kind: 'invalid-utf8'; input: string }
  | { kind: 'invalid-json'; input: string };

export type DecodeResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: DecodeError };

/**
 * Encode a JSON-serializable value to a base64url string.
 * 
 * @param value - Any JSON-serializable value
 * @returns base64url-encoded string (no padding, + → -, / → _)
 * @throws Error if encoded output exceeds 2,048 characters
 */
export function encodeState(value: unknown): string {
  // Step 1: JSON.stringify
  const json = JSON.stringify(value);

  // Step 2: TextEncoder UTF-8
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);

  // Step 3: base64 encode using btoa
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binaryString);

  // Convert to base64url alphabet (no padding, + → -, / → _)
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Check size budget
  if (base64url.length > 2048) {
    throw new Error(`Encoded state exceeds 2,048 character limit: ${base64url.length} characters`);
  }

  return base64url;
}

/**
 * Decode a base64url string to a JSON-serializable value.
 * Never throws - always returns a typed result.
 * 
 * @param encoded - base64url-encoded string (no padding, + → -, / → _)
 * @returns DecodeResult<T> - either { ok: true, value: T } or { ok: false, error: DecodeError }
 */
export function decodeState<T = unknown>(encoded: string): DecodeResult<T> {
  // Step 1: Validate and convert from base64url to base64
  let base64: string;
  try {
    // Convert base64url back to base64 alphabet
    base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Validate base64url characters (before conversion, check original)
    if (!/^[A-Za-z0-9_-]*$/.test(encoded)) {
      return {
        ok: false,
        error: { kind: 'invalid-base64url', input: encoded },
      };
    }
  } catch {
    return {
      ok: false,
      error: { kind: 'invalid-base64url', input: encoded },
    };
  }

  // Step 2: Decode base64 to bytes
  let bytes: Uint8Array;
  try {
    // Use atob to decode base64
    const binaryString = atob(base64);
    bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  } catch {
    return {
      ok: false,
      error: { kind: 'invalid-base64url', input: encoded },
    };
  }

  // Step 3: Decode UTF-8 bytes to string
  let json: string;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    json = decoder.decode(bytes);
  } catch {
    return {
      ok: false,
      error: { kind: 'invalid-utf8', input: encoded },
    };
  }

  // Step 4: Parse JSON
  let value: T;
  try {
    value = JSON.parse(json) as T;
  } catch {
    return {
      ok: false,
      error: { kind: 'invalid-json', input: encoded },
    };
  }

  return {
    ok: true,
    value,
  };
}
