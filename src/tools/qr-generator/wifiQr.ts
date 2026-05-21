/**
 * WiFi QR code string encoder/decoder.
 *
 * Format: WIFI:T:{auth};S:{escapedSsid};P:{escapedPassword};;
 *
 * Per the ZXing / standard WiFi QR spec, the following characters must be
 * backslash-escaped in field values: \ ; , " :
 */

/**
 * Escapes special characters in a WiFi QR field value.
 * Characters that must be escaped: \ ; , " :
 */
export function escapeWifiField(value: string): string {
  // Order matters: escape backslash first to avoid double-escaping
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/"/g, '\\"')
    .replace(/:/g, '\\:');
}

/**
 * Unescapes backslash-escaped characters in a WiFi QR field value.
 * Reverses the escaping applied by escapeWifiField.
 */
function unescapeWifiField(value: string): string {
  return value
    .replace(/\\:/g, ':')
    .replace(/\\"/g, '"')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Encodes WiFi credentials into the WiFi QR string format.
 * Format: WIFI:T:{auth};S:{escapedSsid};P:{escapedPassword};;
 *
 * For 'nopass' auth type, the P: field contains an empty string.
 */
export function encodeWifiQr(
  ssid: string,
  password: string,
  auth: 'WPA' | 'WEP' | 'nopass',
): string {
  const escapedSsid = escapeWifiField(ssid);
  const escapedPassword = auth === 'nopass' ? '' : escapeWifiField(password);
  return `WIFI:T:${auth};S:${escapedSsid};P:${escapedPassword};;`;
}

/**
 * Parses a WiFi QR string back into its components.
 * Returns null if the string does not match the expected format.
 *
 * Handles backslash-escaped characters in field values.
 */
export function parseWifiQr(
  wifiString: string,
): { ssid: string; password: string; auth: string } | null {
  // Must start with WIFI: and end with ;;
  if (!wifiString.startsWith('WIFI:') || !wifiString.endsWith(';;')) {
    return null;
  }

  // Strip the WIFI: prefix and ;; suffix
  const inner = wifiString.slice('WIFI:'.length, -';;'.length);

  // Parse fields that may contain escaped delimiters.
  // Walk the string manually to handle escaped semicolons correctly.
  const segments: string[] = [];
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && i + 1 < inner.length) {
      // Escaped character — consume both chars as-is
      current += ch + inner[i + 1];
      i++;
    } else if (ch === ';') {
      segments.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }

  const fields: Record<string, string> = {};
  for (const segment of segments) {
    // Each segment is "KEY:value" — split only on the first colon
    // (value may contain escaped colons)
    const colonIdx = segment.indexOf(':');
    if (colonIdx === -1) continue;
    const key = segment.slice(0, colonIdx);
    const value = segment.slice(colonIdx + 1);
    fields[key] = value;
  }

  // Validate required fields
  if (!('T' in fields) || !('S' in fields) || !('P' in fields)) {
    return null;
  }

  const auth = fields['T'];
  if (auth !== 'WPA' && auth !== 'WEP' && auth !== 'nopass') {
    return null;
  }

  const ssid = unescapeWifiField(fields['S']);
  const password = unescapeWifiField(fields['P']);

  return { ssid, password, auth };
}
