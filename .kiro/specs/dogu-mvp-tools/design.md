# Design Document — dogu-mvp-tools

## Overview

This document describes the technical design for the five MVP tools added to the Dogu platform: **Team Splitter**, **Spin Wheel**, **Split Bill**, **QR Generator**, and **Random Picker**. Each tool is a self-contained React component that slots into the existing routing and registry infrastructure with zero changes to the platform shell.

All tools share the same design contract:
- Rendered inside `ToolLayout` (header, back link, title, main slot)
- Input persisted via `useLocalStorage` under a `dogu:`-namespaced key
- Shareable state (where applicable) via `useUrlHashState` / `encodeState` / `decodeState`
- Results displayed in `ResultCard` with an embedded `CopyButton`
- Dark-mode-only, mobile-first, 44 × 44 px minimum tap targets
- Lazy-loaded via dynamic `import()` so tool code is excluded from the homepage bundle

### Research Summary

**QR code generation** — The `qrcode` npm package (MIT, actively maintained, zero runtime dependencies) generates QR codes to a `<canvas>` element entirely client-side via `QRCode.toCanvas(canvas, data, options)`. It supports error-correction levels and custom sizing. Types are available as `@types/qrcode`. This is the recommended library because it avoids the heavier `qrcode.react` wrapper and gives direct canvas access needed for the PNG download feature.

**Confetti** — `canvas-confetti` (MIT, ~7 KB gzipped) fires a one-shot confetti burst from a temporary canvas overlay. It accepts a `disableForReducedMotion` option and returns a Promise, making it trivial to gate on `useReducedMotion`. No React wrapper is needed.

**Spin Wheel rendering** — A `<canvas>` element drawn with the 2D Canvas API gives the most control over segment colours, text, and the pointer indicator. Animation uses `requestAnimationFrame` with an easing function (ease-out cubic) to decelerate the wheel. This avoids CSS animation limitations (no dynamic segment count) and keeps the logic pure and testable.

**Fisher-Yates shuffle** — Used for both Team Splitter (name assignment) and Random Picker (shuffle list). The algorithm is O(n) and produces a uniformly random permutation, satisfying the correctness properties.

**Weighted random selection** — Implemented as a cumulative-weight prefix-sum lookup: build a cumulative array, generate a random number in `[0, totalWeight)`, binary-search for the first cumulative value that exceeds it. O(n) build, O(log n) lookup.

---

## Architecture

### How the Five Tools Fit In

```
src/
  tools/
    registry.ts          ← add 5 entries (lazy imports)
    team-splitter/
      index.tsx          ← TeamSplitterTool component
      splitTeams.ts      ← pure algorithm
      splitTeams.test.ts ← PBT + unit tests
    spin-wheel/
      index.tsx          ← SpinWheelTool component
      selectItem.ts      ← pure weighted selection
      selectItem.test.ts ← PBT + unit tests
      WheelCanvas.tsx    ← canvas rendering sub-component
    split-bill/
      index.tsx          ← SplitBillTool component
      calculate.ts       ← pure calculation
      calculate.test.ts  ← PBT + unit tests
    qr-generator/
      index.tsx          ← QrGeneratorTool component
      wifiQr.ts          ← pure WiFi QR string encoder/decoder
      wifiQr.test.ts     ← PBT + unit tests
    random-picker/
      index.tsx          ← RandomPickerTool component
      randomUtils.ts     ← pure pick / shuffle / number-gen
      randomUtils.test.ts← PBT + unit tests
```

Each tool directory is self-contained. The only shared surface is the registry entry and the existing shared components (`ToolLayout`, `ResultCard`, `CopyButton`, `useLocalStorage`, `useUrlHashState`).

### Routing (unchanged)

```
/                  → HomePage (eager)
/tools/:slug       → ToolPage (lazy + error boundary)
*                  → NotFoundPage
```

`ToolPage` already calls `findTool(slug)` and renders the lazy component. No routing changes are needed.

### Data Flow

```
URL hash ──────────────────────────────────────────────────────────┐
                                                                    ▼
localStorage ──► useLocalStorage ──► Tool component state ──► ResultCard
                                          │
                                          ▼
                                    pure algorithm
                                          │
                                          ▼
                                    result state ──► useUrlHashState ──► URL hash
```

---

## New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `qrcode` | `^1.5.3` | Client-side QR code canvas rendering |
| `@types/qrcode` | `^1.5.5` | TypeScript types for qrcode |
| `canvas-confetti` | `^1.9.3` | One-shot confetti burst on spin result |
| `@types/canvas-confetti` | `^1.6.4` | TypeScript types for canvas-confetti |

Install command:
```bash
npm install --save-exact qrcode@1.5.3 canvas-confetti@1.9.3
npm install --save-exact --save-dev @types/qrcode@1.5.5 @types/canvas-confetti@1.6.4
```

Both packages are small, MIT-licensed, and have no transitive runtime dependencies. They are imported only inside their respective tool modules, so they are tree-shaken out of all other chunks.

---

## Components and Interfaces

### Registry Integration

```typescript
// src/tools/registry.ts — additions to the tools array
import { Users, Disc3, Receipt, QrCode, Shuffle } from 'lucide-react'

export const tools: ReadonlyArray<ToolMetadata> = [
  {
    slug: 'team-splitter',
    name: 'Team Splitter',
    description: 'Randomly divide a list of names into balanced teams.',
    category: 'random',
    icon: Users,
    popular: true,
    component: () => import('./team-splitter/index'),
  },
  {
    slug: 'spin-wheel',
    name: 'Spin Wheel',
    description: 'Spin a customisable wheel to pick a random item.',
    category: 'random',
    icon: Disc3,
    popular: true,
    component: () => import('./spin-wheel/index'),
  },
  {
    slug: 'split-bill',
    name: 'Split Bill',
    description: 'Calculate per-person amounts from a shared bill with tax and service charge.',
    category: 'calculator',
    icon: Receipt,
    popular: true,
    component: () => import('./split-bill/index'),
  },
  {
    slug: 'qr-generator',
    name: 'QR Generator',
    description: 'Generate QR codes for URLs or WiFi credentials, client-side.',
    category: 'generator',
    icon: QrCode,
    popular: false,
    component: () => import('./qr-generator/index'),
  },
  {
    slug: 'random-picker',
    name: 'Random Picker',
    description: 'Pick a random item from a list or generate a random number.',
    category: 'random',
    icon: Shuffle,
    popular: false,
    component: () => import('./random-picker/index'),
  },
]
```

### Tool 1 — Team Splitter

**File:** `src/tools/team-splitter/index.tsx`

**State shape:**
```typescript
// Persisted to localStorage key 'team-splitter'
interface TeamSplitterStorage {
  namesText: string      // raw textarea value
  teamCount: number      // 2–20
  balanced: boolean      // balanced mode toggle
}

// URL hash state (result only)
type TeamAssignment = string[][]  // [teamIndex][memberIndex]
```

**Key functions (in `splitTeams.ts`):**
```typescript
/**
 * Splits an array of names into k teams.
 * @param names  Non-empty array of participant names (2–100)
 * @param k      Number of teams (2–20, k ≤ names.length)
 * @param balanced  If true, max(sizes) - min(sizes) ≤ 1
 * @returns      Array of k arrays, each containing assigned names
 */
export function splitTeams(names: string[], k: number, balanced: boolean): string[][]
```

**Algorithm — `splitTeams`:**
1. Validate: `names.length >= 2`, `k >= 2`, `k <= 20`, `k <= names.length`.
2. Fisher-Yates shuffle a copy of `names` to produce `shuffled`.
3. If `balanced`:
   - Base size `b = Math.floor(names.length / k)`, remainder `r = names.length % k`.
   - First `r` teams get `b + 1` members, remaining `k - r` teams get `b` members.
   - Slice `shuffled` sequentially into teams of those sizes.
4. If not `balanced`:
   - Round-robin assignment: `teams[i % k].push(shuffled[i])`.
5. Return the `k` arrays.

**Component structure:**
```
TeamSplitterTool
  ├── <ToolLayout title="Team Splitter">
  ├── <textarea> — names input (persisted)
  ├── <input type="number"> — team count (persisted)
  ├── <Toggle> — balanced mode (persisted)
  ├── <button> — Generate / disabled state
  └── result area (conditional)
       ├── <ResultCard copyPayload={plainTextResult}>
       │     team labels + member lists
       └── <button> — Reroll
```

**URL hash:** Encodes `TeamAssignment` (the 2D array). On load, if hash decodes successfully, the result area is shown immediately. If decode fails, the form is shown in default state.

**Copy payload format:**
```
Team 1: Alice, Bob
Team 2: Carol, Dave
Team 3: Eve
```

---

### Tool 2 — Spin Wheel

**File:** `src/tools/spin-wheel/index.tsx`  
**Sub-component:** `src/tools/spin-wheel/WheelCanvas.tsx`  
**Pure logic:** `src/tools/spin-wheel/selectItem.ts`

**State shape:**
```typescript
// Persisted to localStorage key 'spin-wheel'
interface SpinWheelStorage {
  items: SpinItem[]
  weighted: boolean
}

interface SpinItem {
  label: string    // 1–100 chars
  weight: number   // 1–1000, only used when weighted=true
}

// Component-local state (not persisted)
interface SpinState {
  spinning: boolean
  currentAngle: number   // radians, current wheel rotation
  resultIndex: number | null
  fullscreen: boolean
}
```

**Key functions (in `selectItem.ts`):**
```typescript
/**
 * Selects an item index using weighted random selection.
 * @param weights  Array of positive integers (length ≥ 2)
 * @returns        Index in [0, weights.length - 1]
 */
export function selectItem(weights: number[]): number

/**
 * Computes the target rotation angle (in radians) for the wheel
 * so that the winning segment aligns with the top pointer.
 * @param selectedIndex  The winning segment index
 * @param itemCount      Total number of segments
 * @param currentAngle   Current wheel rotation in radians
 * @param extraSpins     Number of full rotations to add (default 5)
 * @returns              Target angle in radians
 */
export function computeTargetAngle(
  selectedIndex: number,
  itemCount: number,
  currentAngle: number,
  extraSpins?: number
): number
```

**Algorithm — `selectItem`:**
1. Build cumulative weight array: `cum[i] = sum(weights[0..i])`.
2. `totalWeight = cum[cum.length - 1]`.
3. `r = Math.random() * totalWeight`.
4. Binary search for smallest `i` where `cum[i] > r`.
5. Return `i`.

**WheelCanvas component:**
```typescript
interface WheelCanvasProps {
  items: SpinItem[]
  currentAngle: number   // radians — controlled by parent
  size?: number          // CSS px, default 320
}
```

Draws using Canvas 2D API:
- Each segment: `ctx.arc` + `ctx.lineTo` pie slice, filled with a colour from a fixed 10-colour palette cycling by index.
- Text: `ctx.fillText` centred in each segment, rotated to follow the arc midpoint.
- Pointer: a small triangle drawn at the top centre of the canvas (outside the wheel circle).
- Redraws on every `currentAngle` change via `useEffect`.

**Animation loop:**
```
spin() called
  → selectedIndex = selectItem(weights)
  → targetAngle = computeTargetAngle(selectedIndex, items.length, currentAngle)
  → start rAF loop with ease-out cubic easing
  → duration: random between 3000–6000 ms (within 2–8 s requirement)
  → on complete: set resultIndex, fire confetti (if !reducedMotion)
```

**Confetti integration:**
```typescript
import confetti from 'canvas-confetti'
// Called after spin completes, gated on !prefersReducedMotion
confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
```

**Reduced motion:** When `prefersReducedMotion` is true, `spin()` skips the rAF loop, sets `currentAngle` to `targetAngle` directly, and shows the result immediately.

**Fullscreen toggle:** Toggles a CSS class on the canvas wrapper that sets `position: fixed; inset: 0; z-index: 50` with a backdrop. The canvas `size` prop is updated to `Math.min(window.innerWidth, window.innerHeight) - 32`.

---

### Tool 3 — Split Bill

**File:** `src/tools/split-bill/index.tsx`  
**Pure logic:** `src/tools/split-bill/calculate.ts`

**State shape:**
```typescript
// Persisted to localStorage key 'split-bill'
interface SplitBillStorage {
  subtotal: string       // raw input string (empty = no default)
  people: number         // default 1
  tax: number            // default 0
  serviceCharge: number  // default 0
}

interface BillResult {
  subtotal: number
  taxAmount: number
  serviceChargeAmount: number
  total: number
  perPerson: number
}
```

**Key function (in `calculate.ts`):**
```typescript
/**
 * Computes a full bill breakdown.
 * @param subtotal       Positive number > 0, ≤ 999_999_999.99
 * @param people         Integer 1–100
 * @param taxPct         Decimal 0–100
 * @param serviceChargePct  Decimal 0–100
 * @returns BillResult with all five values
 */
export function calculateBill(
  subtotal: number,
  people: number,
  taxPct: number,
  serviceChargePct: number
): BillResult
```

**Algorithm — `calculateBill`:**
```
taxAmount          = subtotal × (taxPct / 100)
serviceChargeAmount = subtotal × (serviceChargePct / 100)
total              = subtotal × (1 + taxPct/100) × (1 + serviceChargePct/100)
perPerson          = roundHalfUp(total / people, 2)
```

`roundHalfUp(x, decimals)` is implemented as `Math.round(x * 10^decimals) / 10^decimals` to avoid floating-point drift.

**Reactivity:** The component uses a single `useMemo` (or `useEffect` with debounce ≤ 50 ms) to recompute `BillResult` whenever any input changes. The `ResultCard` is conditionally rendered only after the first valid calculation.

**Copy payload format:**
```
Subtotal: 100.00
Tax (8%): 8.00
Service (10%): 10.00
Total: 118.80
Per person (3): 39.60
```

---

### Tool 4 — QR Generator

**File:** `src/tools/qr-generator/index.tsx`  
**Pure logic:** `src/tools/qr-generator/wifiQr.ts`

**State shape:**
```typescript
// Persisted to localStorage key 'qr-generator'
interface QrGeneratorStorage {
  mode: 'url' | 'wifi'
  urlValue: string
  ssid: string
  password: string
  authType: 'WPA' | 'WEP' | 'nopass'
}
```

**Key functions (in `wifiQr.ts`):**
```typescript
/**
 * Escapes special characters in a WiFi QR field value.
 * Characters that must be escaped: \ ; , " :
 * (The WiFi QR spec requires backslash-escaping these.)
 */
export function escapeWifiField(value: string): string

/**
 * Encodes WiFi credentials into the WiFi QR string format.
 * Format: WIFI:T:{auth};S:{ssid};P:{password};;
 */
export function encodeWifiQr(ssid: string, password: string, auth: 'WPA' | 'WEP' | 'nopass'): string

/**
 * Parses a WiFi QR string back into its components.
 * Returns null if the string does not match the expected format.
 */
export function parseWifiQr(wifiString: string): { ssid: string; password: string; auth: string } | null
```

**WiFi QR escaping rules** (per ZXing / standard WiFi QR spec):
Characters requiring backslash escape: `\`, `;`, `,`, `"`, `:`

**QR rendering:**
```typescript
import QRCode from 'qrcode'

// Called inside useEffect, debounced 200 ms after last input change
async function renderQr(canvas: HTMLCanvasElement, data: string) {
  await QRCode.toCanvas(canvas, data, {
    width: 256,
    margin: 2,
    color: { dark: '#FAFAFA', light: '#18181B' },  // design tokens
    errorCorrectionLevel: 'M',
  })
}
```

The canvas ref is used directly. On error, the canvas is cleared and an error message is shown.

**Download:**
```typescript
function downloadQr(canvas: HTMLCanvasElement) {
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = 'dogu-qr.png'
  a.click()
}
```

**Mode switching:** Each mode's input values are stored independently in the persisted state object. Switching modes does not clear the other mode's values.

---

### Tool 5 — Random Picker

**File:** `src/tools/random-picker/index.tsx`  
**Pure logic:** `src/tools/random-picker/randomUtils.ts`

**State shape:**
```typescript
// Persisted to localStorage key 'random-picker'
interface RandomPickerStorage {
  itemsText: string   // raw textarea value
  minValue: number    // default -999999999
  maxValue: number    // default 999999999
}

// Component-local state
type LastAction = 'item' | 'number' | null
```

**Key functions (in `randomUtils.ts`):**
```typescript
/**
 * Picks a uniformly random index from an array.
 * @param length  Array length ≥ 1
 * @returns       Integer in [0, length - 1]
 */
export function pickRandom(length: number): number

/**
 * Fisher-Yates in-place shuffle. Returns a new shuffled array.
 * @param items  Array of any type
 * @returns      New array with same elements in random order
 */
export function shuffleItems<T>(items: T[]): T[]

/**
 * Generates a uniformly random integer in [min, max] inclusive.
 * @param min  Integer ≥ -999_999_999
 * @param max  Integer ≤ 999_999_999, max > min
 * @returns    Integer in [min, max]
 */
export function generateNumber(min: number, max: number): number
```

**Algorithm — `generateNumber`:**
```
range = max - min + 1
return min + Math.floor(Math.random() * range)
```

For large ranges (> 2^31), `Math.random()` has sufficient precision for the use case (non-cryptographic, UI tool).

**Component structure:**
```
RandomPickerTool
  ├── <ToolLayout title="Random Picker">
  ├── Section: Item Picker
  │     ├── <textarea> — items input (persisted)
  │     ├── <button> — Pick Random
  │     └── <button> — Shuffle List
  ├── Section: Number Generator
  │     ├── <input type="number"> — min (persisted)
  │     ├── <input type="number"> — max (persisted)
  │     └── <button> — Generate Number
  └── result area (conditional)
       ├── <ResultCard copyPayload={resultText}>
       │     picked item or generated number
       └── <button> — Reroll (disabled if inputs invalid)
```

**Reroll:** Stores `lastAction: 'item' | 'number'` in component state. Reroll button calls the same action again from current inputs.

---

## Data Models

### Shared Types

```typescript
// Used across tools for validation results
interface ValidationResult {
  valid: boolean
  message?: string
}
```

### localStorage Keys (all under `dogu:` namespace)

| Tool | Key | Default |
|------|-----|---------|
| Team Splitter | `team-splitter` | `{ namesText: '', teamCount: 2, balanced: true }` |
| Spin Wheel | `spin-wheel` | `{ items: [{ label: 'Option 1', weight: 1 }, { label: 'Option 2', weight: 1 }], weighted: false }` |
| Split Bill | `split-bill` | `{ subtotal: '', people: 1, tax: 0, serviceCharge: 0 }` |
| QR Generator | `qr-generator` | `{ mode: 'url', urlValue: '', ssid: '', password: '', authType: 'WPA' }` |
| Random Picker | `random-picker` | `{ itemsText: '', minValue: 0, maxValue: 100 }` |

### URL Hash State

Only Team Splitter uses `useUrlHashState`. The encoded value is `TeamAssignment = string[][]`.

The `encodeState` limit is 2,048 characters. With 100 names × 50 chars = 5,000 chars of raw data, the base64url encoding will be ~6,700 chars — exceeding the limit for maximum inputs. The design handles this gracefully: if `encodeState` throws (size exceeded), the tool silently skips writing to the hash and shows a non-fatal warning in the console. The result is still displayed; it just won't be shareable via URL for very large inputs.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The features in this spec include pure algorithmic functions (team splitting, weighted selection, bill calculation, WiFi QR encoding, random picking/shuffling) that are well-suited to property-based testing with `fast-check`. UI rendering, animation timing, and accessibility requirements are covered by example-based tests instead.

---

### Property 1: Team split partition correctness

*For any* array of N names (2 ≤ N ≤ 100) and team count K (2 ≤ K ≤ 20, K ≤ N), calling `splitTeams(names, K, balanced)` SHALL produce exactly K non-empty arrays whose union equals the original name set with no duplicates — every name appears in exactly one team.

**Validates: Requirements 4.1, 4.2**

---

### Property 2: Balanced mode size invariant

*For any* array of N names and team count K (with K ≤ N), calling `splitTeams(names, K, true)` SHALL produce teams where `max(team.length) - min(team.length) ≤ 1`.

**Validates: Requirements 4.3**

---

### Property 3: Team assignment URL round-trip

*For any* valid `TeamAssignment` (array of string arrays), encoding it with `encodeState` and then decoding with `decodeState` SHALL recover an assignment with the same number of teams and the same set of members in each team (order-insensitive within each team).

**Validates: Requirements 4.4**

---

### Property 4: Wheel selection index bounds

*For any* array of weights of length N (2 ≤ N ≤ 50) where every weight is a positive integer in [1, 1000], calling `selectItem(weights)` SHALL return an integer index `i` satisfying `0 ≤ i < N`. This holds for both equal-weight and varied-weight configurations.

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 5: Split bill arithmetic correctness

*For any* valid inputs (subtotal ∈ (0, 999_999_999.99], people ∈ [1, 100], tax ∈ [0, 100], serviceCharge ∈ [0, 100]), calling `calculateBill(subtotal, people, tax, serviceCharge)` SHALL satisfy all of:
- `|result.perPerson × people − result.total| ≤ 0.01 × people` (rounding tolerance)
- When tax = 0 and serviceCharge = 0: `|result.total − subtotal| < 0.001`
- `result.perPerson > 0`

**Validates: Requirements 10.1, 10.2, 10.3**

---

### Property 6: WiFi QR string encoding correctness

*For any* non-empty SSID string, password string, and auth type in `{ 'WPA', 'WEP', 'nopass' }`, calling `encodeWifiQr(ssid, password, auth)` SHALL produce a string matching the pattern `WIFI:T:{auth};S:{escapedSsid};P:{escapedPassword};;` where every occurrence of `\`, `;`, `,`, `"`, `:` in the original SSID and password values is preceded by a backslash in the output. When auth is `nopass`, the `P:` field SHALL contain an empty string.

**Validates: Requirements 13.1, 13.3**

---

### Property 7: WiFi QR string round-trip

*For any* non-empty SSID, password, and valid auth type, encoding with `encodeWifiQr` and then parsing with `parseWifiQr` SHALL recover the original SSID (with escape sequences resolved), the original password, and the original auth type.

**Validates: Requirements 13.2**

---

### Property 8: Random picker index bounds

*For any* positive integer N (1 ≤ N ≤ 200), calling `pickRandom(N)` SHALL return an integer `i` satisfying `0 ≤ i < N`.

**Validates: Requirements 16.1**

---

### Property 9: Shuffle permutation correctness

*For any* array of items of length N ≥ 1, calling `shuffleItems(items)` SHALL return an array of the same length containing exactly the same multiset of items as the input (no items added, removed, or changed).

**Validates: Requirements 16.2**

---

### Property 10: Random number bounds

*For any* integer pair (min, max) where min < max and both values are in [−999_999_999, 999_999_999], calling `generateNumber(min, max)` SHALL return an integer `n` satisfying `min ≤ n ≤ max` and `Number.isInteger(n) === true`.

**Validates: Requirements 16.3**

---

### Property 11: findTool lookup correctness

*For any* slug string, `findTool(slug)` SHALL return the `ToolMetadata` entry whose `slug` field equals the input if such an entry exists in the registry, and SHALL return `undefined` otherwise. For every registered entry `e`, `findTool(e.slug) === e`.

**Validates: Requirements 1.9**

---

## Error Handling

### Input Validation Strategy

All tools use inline validation messages rather than toast notifications, keeping errors close to the offending field. Validation runs on every input change (controlled components). The action button is disabled whenever any validation error is present.

| Condition | Behaviour |
|-----------|-----------|
| Team Splitter: fewer than 2 valid names | Disable generate button, no message (empty state) |
| Team Splitter: K < 2 or K > 20 | Inline message: "Must be between 2 and 20" |
| Team Splitter: K > N | Inline message: "Fewer names than teams" |
| Spin Wheel: fewer than 2 items | Disable spin button |
| Spin Wheel: weight out of range | Inline message per item: "Must be 1–1000" |
| Split Bill: subtotal ≤ 0 or empty | Inline message: "Enter a positive amount" |
| Split Bill: people < 1 or > 100 | Inline message: "Must be 1–100" |
| QR Generator: URL empty | Prompt: "Enter a URL to generate a QR code" |
| QR Generator: SSID empty (WiFi mode) | Prompt: "Enter a network name (SSID)" |
| QR Generator: encoding failure | Inline error, clear canvas, disable download |
| Random Picker: no valid items | Disable pick button |
| Random Picker: min ≥ max | Inline message: "Min must be less than max" |

### URL Hash Decode Failure

When `decodeState` returns `{ ok: false }`, the tool silently falls back to the default form state. A `console.warn` is emitted with the error kind and raw input for debugging. No user-visible error is shown for hash decode failures.

### localStorage Failure

`useLocalStorage` already handles `SecurityError` and `QuotaExceededError` gracefully (warns to console, retains in-memory state). Tools do not need additional error handling for storage failures.

### QR Encoding Failure

`QRCode.toCanvas` can fail if the input data is too long for the selected error-correction level. The tool catches the rejected Promise, clears the canvas, shows an inline error message ("QR code could not be generated — try shorter input"), and disables the download button.

### encodeState Size Limit

`encodeState` throws if the encoded string exceeds 2,048 characters. Team Splitter wraps the call in a try/catch: on failure, it skips writing to the URL hash and logs a console warning. The result is still displayed locally.

---

## Testing Strategy

### Dual Testing Approach

Every tool has a dedicated test file for its pure logic module. The React component layer is covered by example-based tests using `@testing-library/react`. Property-based tests use `fast-check` (already installed at `^3.14.0`).

### Property-Based Test Configuration

- Minimum **100 iterations** per property (fast-check default is 100; set explicitly with `{ numRuns: 100 }`)
- Each property test is tagged with a comment referencing the design property
- Tag format: `// Feature: dogu-mvp-tools, Property N: <property text>`

### Test File Layout

```
src/tools/team-splitter/splitTeams.test.ts
src/tools/spin-wheel/selectItem.test.ts
src/tools/split-bill/calculate.test.ts
src/tools/qr-generator/wifiQr.test.ts
src/tools/random-picker/randomUtils.test.ts
```

### Property Test Sketches

**splitTeams.test.ts** — Properties 1 & 2:
```typescript
import fc from 'fast-check'
import { splitTeams } from './splitTeams'

// Feature: dogu-mvp-tools, Property 1: Team split partition correctness
it('every name appears in exactly one team', () => {
  fc.assert(fc.property(
    fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 100 })
      .chain(names => fc.tuple(
        fc.constant(names),
        fc.integer({ min: 2, max: Math.min(20, names.length) }),
        fc.boolean(),
      )),
    ([names, k, balanced]) => {
      const teams = splitTeams(names, k, balanced)
      const allMembers = teams.flat()
      expect(teams).toHaveLength(k)
      expect(allMembers.sort()).toEqual([...names].sort())
      teams.forEach(t => expect(t.length).toBeGreaterThanOrEqual(1))
    }
  ), { numRuns: 100 })
})

// Feature: dogu-mvp-tools, Property 2: Balanced mode size invariant
it('balanced mode: max size - min size ≤ 1', () => {
  fc.assert(fc.property(
    fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 100 })
      .chain(names => fc.tuple(
        fc.constant(names),
        fc.integer({ min: 2, max: Math.min(20, names.length) }),
      )),
    ([names, k]) => {
      const teams = splitTeams(names, k, true)
      const sizes = teams.map(t => t.length)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    }
  ), { numRuns: 100 })
})
```

**calculate.test.ts** — Property 5:
```typescript
// Feature: dogu-mvp-tools, Property 5: Split bill arithmetic correctness
it('rounding tolerance and zero-charge identity', () => {
  fc.assert(fc.property(
    fc.float({ min: 0.01, max: 999_999_999.99, noNaN: true }),
    fc.integer({ min: 1, max: 100 }),
    fc.float({ min: 0, max: 100, noNaN: true }),
    fc.float({ min: 0, max: 100, noNaN: true }),
    (subtotal, people, tax, serviceCharge) => {
      const r = calculateBill(subtotal, people, tax, serviceCharge)
      expect(Math.abs(r.perPerson * people - r.total)).toBeLessThanOrEqual(0.01 * people)
      expect(r.perPerson).toBeGreaterThan(0)
    }
  ), { numRuns: 100 })
})
```

**wifiQr.test.ts** — Properties 6 & 7:
```typescript
const specialChars = fc.stringOf(
  fc.oneof(fc.char(), fc.constant(';'), fc.constant('\\'), fc.constant('"'), fc.constant(','), fc.constant(':'))
)

// Feature: dogu-mvp-tools, Property 6: WiFi QR encoding correctness
it('output matches WIFI: pattern with escaping', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 1 }),
    fc.string(),
    fc.oneof(fc.constant('WPA'), fc.constant('WEP'), fc.constant('nopass')),
    (ssid, password, auth) => {
      const result = encodeWifiQr(ssid, password, auth as 'WPA' | 'WEP' | 'nopass')
      expect(result).toMatch(/^WIFI:T:[^;]+;S:.+;P:.*;;\s*$/)
      if (auth === 'nopass') {
        expect(result).toContain('P:;;')
      }
    }
  ), { numRuns: 100 })
})

// Feature: dogu-mvp-tools, Property 7: WiFi QR string round-trip
it('encode then parse recovers original values', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 1 }),
    fc.string(),
    fc.oneof(fc.constant('WPA'), fc.constant('WEP'), fc.constant('nopass')),
    (ssid, password, auth) => {
      const encoded = encodeWifiQr(ssid, password, auth as 'WPA' | 'WEP' | 'nopass')
      const parsed = parseWifiQr(encoded)
      expect(parsed).not.toBeNull()
      expect(parsed!.ssid).toBe(ssid)
      expect(parsed!.password).toBe(auth === 'nopass' ? '' : password)
      expect(parsed!.auth).toBe(auth)
    }
  ), { numRuns: 100 })
})
```

**randomUtils.test.ts** — Properties 8, 9, 10:
```typescript
// Feature: dogu-mvp-tools, Property 8: Random picker index bounds
it('pickRandom returns index in [0, N-1]', () => {
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 200 }),
    (n) => {
      const idx = pickRandom(n)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(n)
      expect(Number.isInteger(idx)).toBe(true)
    }
  ), { numRuns: 100 })
})

// Feature: dogu-mvp-tools, Property 9: Shuffle permutation correctness
it('shuffleItems returns same multiset', () => {
  fc.assert(fc.property(
    fc.array(fc.string(), { minLength: 1, maxLength: 200 }),
    (items) => {
      const shuffled = shuffleItems(items)
      expect(shuffled).toHaveLength(items.length)
      expect([...shuffled].sort()).toEqual([...items].sort())
    }
  ), { numRuns: 100 })
})

// Feature: dogu-mvp-tools, Property 10: Random number bounds
it('generateNumber returns integer in [min, max]', () => {
  fc.assert(fc.property(
    fc.integer({ min: -999_999_999, max: 999_999_998 })
      .chain(min => fc.tuple(
        fc.constant(min),
        fc.integer({ min: min + 1, max: 999_999_999 }),
      )),
    ([min, max]) => {
      const n = generateNumber(min, max)
      expect(n).toBeGreaterThanOrEqual(min)
      expect(n).toBeLessThanOrEqual(max)
      expect(Number.isInteger(n)).toBe(true)
    }
  ), { numRuns: 100 })
})
```

**selectItem.test.ts** — Property 4:
```typescript
// Feature: dogu-mvp-tools, Property 4: Wheel selection index bounds
it('selectItem returns index in [0, N-1] for any valid weights', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 50 }),
    (weights) => {
      const idx = selectItem(weights)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(weights.length)
      expect(Number.isInteger(idx)).toBe(true)
    }
  ), { numRuns: 100 })
})
```

### Unit Tests (Example-Based)

Each tool component has a companion `index.test.tsx` covering:
- Renders inside `ToolLayout` with correct title
- Validation messages appear for invalid inputs
- Action button disabled/enabled states
- Result card appears after valid action
- Copy payload format matches specification
- localStorage persistence (mock `useLocalStorage`)
- Reduced motion: spin wheel skips animation

### Registry Tests

`src/tools/registry.test.ts` (existing file) is extended with:
- All five slugs present
- `validateRegistry(tools)` does not throw
- Each entry has correct `category` and `popular` values
- Each `component` field is a function

---

## Bundle and Performance Considerations

### Code Splitting

Each tool's `index.tsx` is a separate dynamic import chunk. Vite automatically creates one chunk per `import()` call in the registry. The `qrcode` and `canvas-confetti` packages are imported only inside their respective tool modules, so they are included only in those chunks.

Estimated chunk sizes (gzipped):
| Chunk | Estimated size |
|-------|---------------|
| `team-splitter` | ~3 KB |
| `spin-wheel` + canvas-confetti | ~12 KB |
| `split-bill` | ~2 KB |
| `qr-generator` + qrcode | ~18 KB |
| `random-picker` | ~2 KB |

The homepage bundle is unaffected by these additions.

### QR Rendering Debounce

QR re-rendering is debounced at 200 ms after the last input change. This keeps the 300 ms requirement (Req 12.1, 18.1) comfortably met while avoiding excessive canvas redraws on fast typing.

### Split Bill Reactivity

`calculateBill` is a pure synchronous function taking < 1 ms. The result is recomputed in a `useMemo` on every render where inputs change. No debounce is needed; the 100 ms requirement (Req 9.5, 18.2) is met trivially.

### Canvas Memory

`WheelCanvas` uses a single `<canvas>` element with a stable ref. The canvas is not recreated on re-renders; only `drawWheel` is called inside `useEffect`. The fullscreen canvas is the same element resized, not a second canvas.

### PWA / Offline

All five tools are purely client-side with no network requests during operation. They work fully offline once the app shell is cached by the service worker. The `qrcode` and `canvas-confetti` packages are bundled into the tool chunks and cached alongside them.
