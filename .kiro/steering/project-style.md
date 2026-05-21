---
inclusion: manual
---

# Dogu — Project Style Guide

## Philosophy

**Japanese utility minimalism.** Every tool does one thing well. No clutter, no onboarding, no accounts. Open the page, use the tool, done.

- Mobile-first, but looks great on desktop too
- Dark mode only — no light mode toggle
- Instant feedback — no loading spinners for local operations
- Offline-capable PWA — tools work without internet

---

## Visual Design

### Colour Palette

| Token | Value | Tailwind class | Use |
|-------|-------|----------------|-----|
| `--color-bg` | `#09090B` | `bg-bg` | Page background |
| `--color-surface` | `#18181B` | `bg-surface` | Cards, inputs, panels |
| `--color-accent` | `#2563EB` | `text-accent`, `bg-accent`, `ring-accent` | Primary actions, highlights |
| `--color-text` | `#FAFAFA` | `text-text` | Primary text |
| `--color-text-secondary` | `#A1A1AA` | `text-text-secondary` | Labels, hints, secondary info |

### Typography

- Font: `'Geist'`, fallback `'Inter'`, then `system-ui, sans-serif`
- Page headings: `text-2xl font-semibold tracking-tight`
- Section headings: `text-base font-semibold text-text`
- Labels: `text-sm font-medium text-text-secondary`
- Body / inputs: `text-sm text-text`
- Hints / captions: `text-xs text-text-secondary`

### Spacing & Radius

- Card radius: `rounded-card` (= `rounded-2xl` = 1rem)
- Button radius: `rounded-button` (= `rounded-xl` = 0.75rem)
- Standard gap between form fields: `gap-6`
- Standard gap within a field group: `gap-2`
- Content max-width: `max-w-2xl mx-auto` (applies to both ToolLayout and HomePage)

### Motion

- All transitions: `transition-colors duration-fast` or `transition-opacity duration-fast`
- `duration-fast` = 200ms
- Respect `prefers-reduced-motion` — skip animations, show results immediately
- Confetti (`canvas-confetti`) is gated on `!prefersReducedMotion`

---

## Component Patterns

### Tool Layout

Every tool renders its own `<ToolLayout title="Tool Name">`. The layout provides:
- `<Header />` (logo, links to `/`)
- Back to home link
- `<h1>` with the tool title
- Centered `<main>` with `max-w-2xl mx-auto`

**Do NOT** add another `ToolLayout` wrapper in `ToolPage.tsx` — that causes double headers.

### Forms

- All inputs: `min-h-[44px]` (44px minimum tap target)
- Every input has either a `<label>` with `htmlFor` or an `aria-label`
- Inline validation messages use `role="alert"` and `text-xs text-red-400`
- Disabled buttons: `opacity-50 cursor-not-allowed`
- Primary action button: `bg-accent text-white rounded-button`
- Secondary action button: `bg-surface border border-white/10 text-text-secondary`

### Result Modals

Team Splitter and Spin Wheel show results in a modal overlay:
- Backdrop: `bg-black/70 backdrop-blur-sm`, click to close
- Panel: `bg-surface border border-white/10 rounded-card p-6`
- Always include a close (×) button and a copy button
- Close on `Escape` key

### Persistence

- All tool inputs persist via `useLocalStorage(key, defaultValue)` under the `dogu:` namespace
- Keys: `team-splitter`, `spin-wheel`, `split-bill`, `qr-generator`
- Team Splitter also uses `useUrlHashState` for shareable result URLs

### Property-Based Tests

All pure algorithm modules have PBT coverage using `fast-check`:
- Tag format: `// Feature: dogu-mvp-tools, Property N: <description>`
- Minimum 100 runs per property: `{ numRuns: 100 }`
- Test files: `*.test.ts` alongside the module

---

## Tool-Specific Notes

### Team Splitter (`src/tools/team-splitter/`)

- `splitTeams(names, k, balanced)` — Fisher-Yates shuffle + balanced/round-robin assignment
- Result shown in modal with confetti on generate
- URL hash encodes the `TeamAssignment` (2D string array) for sharing
- `encodeState` may throw if result is too large — silently skips hash write

### Spin Wheel (`src/tools/spin-wheel/`)

- `WheelCanvas.tsx` — pure presentational canvas component, controlled by `currentAngle` prop
- `selectItem(weights)` — cumulative prefix-sum + binary search
- `computeTargetAngle(selectedIndex, itemCount, currentAngle)` — accounts for the `-π/2` drawing offset
  - Formula: `restAngle = -(selectedIndex + 0.5) * segmentAngle`, then add enough full turns
- Animation: ease-out cubic, 3–6 seconds, `requestAnimationFrame`
- Result modal has three actions: Spin again / Remove & spin again / Remove from list
- "Remove" buttons only shown when ≥ 3 items remain (MIN_ITEMS = 2)

### Split Bill (`src/tools/split-bill/`)

- Two modes: **Simple** (subtotal + people + tax + service) and **Itemized** (per-person line items)
- Itemized shared costs split either **Proportionally** (by order size) or **Equally**
- Storage shape: `{ mode, simple: SimpleBillStorage, itemized: ItemizedBillStorage }`
- `calculateBill` uses `roundHalfUp` (not `toFixed`) to avoid floating-point drift

### QR Generator (`src/tools/qr-generator/`)

- Two modes: **URL** and **WiFi**
- WiFi QR format: `WIFI:T:{auth};S:{ssid};P:{password};;` with backslash-escaping
- Renders to `<canvas>` via `QRCode.toCanvas` (qrcode@1.5.3), debounced 200ms
- Download: `canvas.toDataURL('image/png')` → `<a download="dogu-qr.png">`
