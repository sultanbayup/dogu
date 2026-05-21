# Implementation Plan: dogu-mvp-tools

## Overview

Implement five self-contained MVP tools (Team Splitter, Spin Wheel, Split Bill, QR Generator, Random Picker) for the Dogu platform. Each tool follows the same contract: rendered inside `ToolLayout`, inputs persisted via `useLocalStorage`, results shown in `ResultCard`, lazy-loaded via dynamic `import()`. Pure algorithmic logic is extracted into separate modules and covered by property-based tests using `fast-check`.

## Tasks

- [ ] 1. Install new dependencies and register all five tools in the registry
  - Run `npm install --save-exact qrcode@1.5.3 canvas-confetti@1.9.3` and `npm install --save-exact --save-dev @types/qrcode@1.5.5 @types/canvas-confetti@1.6.4`
  - Add all five `ToolMetadata` entries to `src/tools/registry.ts` with correct slugs, names, descriptions, categories, icons (`Users`, `Disc3`, `Receipt`, `QrCode`, `Shuffle` from `lucide-react`), `popular` flags, and lazy `component` imports pointing to each tool's `index.tsx`
  - Create stub `index.tsx` files (default-exporting a placeholder component) for each of the five tool directories so the lazy imports resolve without errors
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 1.1 Write property test for findTool lookup correctness
    - **Property 11: findTool lookup correctness** — for any slug, `findTool(slug)` returns the matching entry or `undefined`; for every registered entry `e`, `findTool(e.slug) === e`
    - Add to `src/tools/registry.test.ts` (extend existing file)
    - **Validates: Requirements 1.9**

- [ ] 2. Implement Team Splitter — pure algorithm
  - [ ] 2.1 Create `src/tools/team-splitter/splitTeams.ts`
    - Implement `splitTeams(names: string[], k: number, balanced: boolean): string[][]`
    - Fisher-Yates shuffle a copy of `names`; if `balanced`, slice into teams of size `floor(N/K)` and `floor(N/K)+1`; if not balanced, round-robin assignment
    - Validate inputs: `names.length >= 2`, `k >= 2`, `k <= 20`, `k <= names.length`; throw on invalid
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3_

  - [ ] 2.2 Write property test for team split partition correctness
    - **Property 1: Team split partition correctness** — every name appears in exactly one team, exactly K non-empty teams returned
    - **Property 2: Balanced mode size invariant** — `max(team.length) - min(team.length) ≤ 1` when `balanced=true`
    - Create `src/tools/team-splitter/splitTeams.test.ts`
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 3. Implement Team Splitter — React component
  - [ ] 3.1 Create `src/tools/team-splitter/index.tsx` (replace stub)
    - Render inside `<ToolLayout title="Team Splitter">`
    - Controlled `<textarea>` for names (one per line, up to 100 names × 50 chars each), `<input type="number">` for team count (2–20), toggle for Balanced Mode (default on)
    - Persist all three fields to localStorage via `useLocalStorage('team-splitter', defaultValue)`
    - Disable generate button when: fewer than 2 valid names, K < 2, K > 20, or K > participant count; show inline validation messages for K out-of-range and K > N
    - On generate: call `splitTeams`, display result in `<ResultCard>` with team labels ("Team 1", "Team 2", …) and comma-separated members; encode result into URL hash via `useUrlHashState`; show Reroll button
    - On page load with valid hash: decode and display result immediately; on decode failure, show default form state
    - Copy payload: plain-text `Team N: member1, member2` lines
    - All interactive controls ≥ 44 × 44 px tap targets; every control has `aria-label` or associated `<label>`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.5, 17.1, 17.2, 17.4_

  - [ ] 3.2 Write property test for team assignment URL round-trip
    - **Property 3: Team assignment URL round-trip** — encoding a `TeamAssignment` with `encodeState` then decoding with `decodeState` recovers the same teams and members (order-insensitive within teams)
    - Add to `src/tools/team-splitter/splitTeams.test.ts`
    - **Validates: Requirements 4.4**

  - [ ] 3.3 Write unit tests for Team Splitter component
    - Test: renders with correct title, generate button disabled with < 2 names, inline validation for K out-of-range, result card appears after generate, reroll button present after result, copy payload format, localStorage persistence (mock hook), URL hash decode on load
    - Create `src/tools/team-splitter/index.test.tsx`
    - _Requirements: 2.1, 2.3, 2.5, 3.3, 3.4, 3.6, 2.7_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Spin Wheel — pure algorithm
  - [ ] 5.1 Create `src/tools/spin-wheel/selectItem.ts`
    - Implement `selectItem(weights: number[]): number` using cumulative-weight prefix-sum + binary search
    - Implement `computeTargetAngle(selectedIndex, itemCount, currentAngle, extraSpins?): number`
    - _Requirements: 5.6, 5.7, 7.1, 7.2, 7.3_

  - [ ] 5.2 Write property test for wheel selection index bounds
    - **Property 4: Wheel selection index bounds** — for any weights array of length N (2–50) with values in [1, 1000], `selectItem(weights)` returns an integer in `[0, N-1]`
    - Create `src/tools/spin-wheel/selectItem.test.ts`
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 6. Implement Spin Wheel — canvas sub-component and React component
  - [ ] 6.1 Create `src/tools/spin-wheel/WheelCanvas.tsx`
    - Accept props: `items: SpinItem[]`, `currentAngle: number`, `size?: number` (default 320)
    - Draw pie segments using Canvas 2D API with a 10-colour cycling palette; label each segment with `ctx.fillText`; draw pointer triangle at top centre
    - Redraw on every `currentAngle` change via `useEffect`
    - _Requirements: 6.3, 6.7_

  - [ ] 6.2 Create `src/tools/spin-wheel/index.tsx` (replace stub)
    - Render inside `<ToolLayout title="Spin Wheel">`
    - List editor: add/edit/remove items (2–50 items, each ≤ 100 chars); Weighted Spin toggle (default off); weight inputs (1–1000 integers) shown per item when weighted mode is on
    - Persist `{ items, weighted }` to localStorage via `useLocalStorage('spin-wheel', defaultValue)`
    - Disable spin button when < 2 valid items or any weight is invalid; show inline validation per item for out-of-range weights
    - On spin: call `selectItem(weights)`, compute `targetAngle`, run `requestAnimationFrame` loop with ease-out cubic easing (3000–6000 ms duration); disable spin button during animation; on complete, set result, fire `canvas-confetti` (gated on `!prefersReducedMotion`)
    - Reduced motion: skip rAF loop, set angle directly, show result immediately
    - Fullscreen toggle: `position: fixed; inset: 0; z-index: 50` with backdrop; resize canvas to `Math.min(window.innerWidth, window.innerHeight) - 32`
    - Display result in `<ResultCard>`; clear previous result when new spin begins
    - All interactive controls ≥ 44 × 44 px; every control has `aria-label` or `<label>`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 17.1, 17.2, 17.4, 17.5_

  - [ ] 6.3 Write unit tests for Spin Wheel component
    - Test: renders with correct title, spin button disabled with < 2 items, inline validation for weight out-of-range, result card appears after spin, previous result cleared on new spin, reduced motion skips animation
    - Create `src/tools/spin-wheel/index.test.tsx`
    - _Requirements: 5.1, 5.3, 5.9, 6.2, 6.6, 6.8, 6.9_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Split Bill — pure algorithm
  - [ ] 8.1 Create `src/tools/split-bill/calculate.ts`
    - Implement `calculateBill(subtotal, people, taxPct, serviceChargePct): BillResult`
    - `taxAmount = subtotal × (taxPct / 100)`, `serviceChargeAmount = subtotal × (serviceChargePct / 100)`, `total = subtotal × (1 + taxPct/100) × (1 + serviceChargePct/100)`, `perPerson = roundHalfUp(total / people, 2)`
    - Implement `roundHalfUp(x, decimals)` as `Math.round(x * 10^decimals) / 10^decimals`
    - Export `BillResult` interface
    - _Requirements: 9.1, 9.2, 10.1, 10.2, 10.3_

  - [ ] 8.2 Write property test for split bill arithmetic correctness
    - **Property 5: Split bill arithmetic correctness** — `|perPerson × people − total| ≤ 0.01 × people`; when tax=0 and serviceCharge=0, `|total − subtotal| < 0.001`; `perPerson > 0`
    - Create `src/tools/split-bill/calculate.test.ts`
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 9. Implement Split Bill — React component
  - [ ] 9.1 Create `src/tools/split-bill/index.tsx` (replace stub)
    - Render inside `<ToolLayout title="Split Bill">`
    - Numeric inputs: subtotal (positive decimal, max 999,999,999.99, starts empty), people (integer 1–100, default 1), tax % (decimal 0–100, default 0), service charge % (decimal 0–100, default 0)
    - Persist all fields to localStorage via `useLocalStorage('split-bill', defaultValue)`
    - Inline validation: subtotal blank/zero/negative → "Enter a positive amount" + disable calculate; people out of range → "Must be 1–100" + disable calculate
    - Recompute `BillResult` via `useMemo` on every input change; show `<ResultCard>` only after first valid calculation; hide `ResultCard` if any input becomes invalid
    - Display: subtotal, tax amount, service charge amount, total, per-person — all formatted to 2 decimal places
    - Copy payload: plain-text listing all five values (e.g. `Subtotal: 100.00\nTax (8%): 8.00\n…`)
    - All interactive controls ≥ 44 × 44 px; every control has `aria-label` or `<label>`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 17.1, 17.2, 17.4, 18.2_

  - [ ] 9.2 Write unit tests for Split Bill component
    - Test: renders with correct title, calculate button disabled when subtotal empty, inline validation messages, result card hidden initially then shown after valid input, result card hidden when input becomes invalid, copy payload format, all values formatted to 2 decimal places
    - Create `src/tools/split-bill/index.test.tsx`
    - _Requirements: 8.1, 8.6, 8.7, 9.3, 9.4, 9.6, 9.7_

- [ ] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement QR Generator — pure WiFi QR encoder
  - [ ] 11.1 Create `src/tools/qr-generator/wifiQr.ts`
    - Implement `escapeWifiField(value: string): string` — backslash-escape `\`, `;`, `,`, `"`, `:`
    - Implement `encodeWifiQr(ssid, password, auth): string` — produces `WIFI:T:{auth};S:{escapedSsid};P:{escapedPassword};;`; for `nopass`, `P:` field is empty string
    - Implement `parseWifiQr(wifiString): { ssid, password, auth } | null` — parses and unescapes fields; returns `null` on format mismatch
    - _Requirements: 12.4, 12.5, 13.1, 13.2, 13.3_

  - [ ] 11.2 Write property test for WiFi QR encoding correctness
    - **Property 6: WiFi QR string encoding correctness** — output matches `WIFI:T:{auth};S:...;P:...;;` pattern with all special chars escaped; `nopass` produces empty `P:` field
    - **Property 7: WiFi QR string round-trip** — `parseWifiQr(encodeWifiQr(ssid, password, auth))` recovers original values
    - Create `src/tools/qr-generator/wifiQr.test.ts`
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ] 12. Implement QR Generator — React component
  - [ ] 12.1 Create `src/tools/qr-generator/index.tsx` (replace stub)
    - Render inside `<ToolLayout title="QR Generator">`
    - Mode selector: "URL" (default) / "WiFi"; URL mode shows single URL text input; WiFi mode shows SSID, password, and auth type select (WPA/WEP/nopass, default WPA)
    - Persist `{ mode, urlValue, ssid, password, authType }` to localStorage via `useLocalStorage('qr-generator', defaultValue)`; switching modes preserves each mode's values independently
    - Disable QR generation and show prompt when URL input is empty (URL mode) or SSID is empty (WiFi mode)
    - Render QR code to `<canvas>` via `QRCode.toCanvas(canvas, data, { width: 256, margin: 2, color: { dark: '#FAFAFA', light: '#18181B' }, errorCorrectionLevel: 'M' })`; debounce re-render 200 ms after last input change; canvas ≥ 256 × 256 CSS px
    - On QR encoding failure: clear canvas, show inline error "QR code could not be generated — try shorter input", disable download button
    - Download button: `canvas.toDataURL('image/png')` → `<a download="dogu-qr.png">`; disabled when no QR rendered
    - All interactive controls ≥ 44 × 44 px; every control has `aria-label` or `<label>`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 17.1, 17.2, 17.4, 18.1_

  - [ ] 12.2 Write unit tests for QR Generator component
    - Test: renders with correct title, URL mode shown by default, WiFi inputs shown in WiFi mode, mode switch preserves values, download button disabled when no QR, prompt shown when URL empty, prompt shown when SSID empty in WiFi mode, inline error on encoding failure
    - Create `src/tools/qr-generator/index.test.tsx`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 11.8, 11.9, 12.3, 12.6_

- [ ] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement Random Picker — pure utilities
  - [ ] 14.1 Create `src/tools/random-picker/randomUtils.ts`
    - Implement `pickRandom(length: number): number` — returns `Math.floor(Math.random() * length)`
    - Implement `shuffleItems<T>(items: T[]): T[]` — Fisher-Yates shuffle returning a new array
    - Implement `generateNumber(min: number, max: number): number` — returns `min + Math.floor(Math.random() * (max - min + 1))`
    - _Requirements: 15.1, 15.2, 16.1, 16.2, 16.3_

  - [ ] 14.2 Write property tests for random picker utilities
    - **Property 8: Random picker index bounds** — `pickRandom(N)` returns integer in `[0, N-1]` for N ∈ [1, 200]
    - **Property 9: Shuffle permutation correctness** — `shuffleItems(items)` returns same-length array with same multiset of items
    - **Property 10: Random number bounds** — `generateNumber(min, max)` returns integer in `[min, max]` for valid pairs
    - Create `src/tools/random-picker/randomUtils.test.ts`
    - **Validates: Requirements 16.1, 16.2, 16.3**

- [ ] 15. Implement Random Picker — React component
  - [ ] 15.1 Create `src/tools/random-picker/index.tsx` (replace stub)
    - Render inside `<ToolLayout title="Random Picker">`
    - Item Picker section: controlled `<textarea>` (one item per line, up to 200 items × 200 chars each); "Pick Random" button (disabled when < 1 valid item); "Shuffle List" button (replaces textarea content with shuffled order)
    - Number Generator section: min and max `<input type="number">` (integers −999,999,999 to 999,999,999); "Generate Number" button; inline validation "Min must be less than max" when min ≥ max; disable generate number button when invalid
    - Persist `{ itemsText, minValue, maxValue }` to localStorage via `useLocalStorage('random-picker', defaultValue)`
    - On pick: call `pickRandom`, display item in `<ResultCard>`; on generate number: call `generateNumber`, display integer in `<ResultCard>`
    - Reroll button in result area: re-runs same action (`lastAction: 'item' | 'number'`) from current inputs; disabled if current inputs are invalid
    - Copy payload: item text for picked item; decimal string with no leading zeros for generated number
    - All interactive controls ≥ 44 × 44 px; every control has `aria-label` or `<label>`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 17.1, 17.2, 17.4_

  - [ ] 15.2 Write unit tests for Random Picker component
    - Test: renders with correct title, pick button disabled with no items, shuffle replaces textarea content, result card shows picked item, result card shows generated number, reroll button present after result, reroll disabled when inputs invalid, copy payload format for item and number
    - Create `src/tools/random-picker/index.test.tsx`
    - _Requirements: 14.1, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each tool is complete
- Property tests validate universal correctness properties using `fast-check` (already installed at `^3.14.0`)
- Unit tests validate specific examples, edge cases, and component behaviour
- Stub `index.tsx` files created in task 1 allow the registry to load without errors before each tool is fully implemented
- The design uses TypeScript throughout; all code should be `.ts` / `.tsx`
- Run tests with: `wsl -d Ubuntu-24.04 -- zsh -ic "cd /home/sultanbp/repo/dogu && npm run test -- --run 2>&1"`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "5.1", "8.1", "11.1", "14.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "5.2", "8.2", "11.2", "14.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "6.1", "9.1", "12.1", "15.1"] },
    { "id": 4, "tasks": ["6.2", "9.2", "12.2", "15.2"] },
    { "id": 5, "tasks": ["6.3"] }
  ]
}
```
