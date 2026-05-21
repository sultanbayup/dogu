---
inclusion: manual
---

# Dogu Platform — Session Notes

## Project Overview

**Repo:** `/home/sultanbp/repo/dogu` (WSL Ubuntu-24.04)
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion + React Router v6 + Vitest + fast-check (PBT)
**Specs:**
- `.kiro/specs/dogu-platform/` — platform foundation (complete)
- `.kiro/specs/dogu-mvp-tools/` — 4 MVP tools (complete)
**Goal:** Static React PWA hosting a catalog of tiny daily-use web tools

---

## Critical: Running Commands

Always use **zsh with the `-i` flag** to load nvm/node. Node is managed by nvm and only available in interactive shells.

```zsh
# Standard pattern for all commands:
wsl -d Ubuntu-24.04 -- zsh -ic "cd /home/sultanbp/repo/dogu && <command>"

# Run tests:
wsl -d Ubuntu-24.04 -- zsh -ic "cd /home/sultanbp/repo/dogu && npm run test -- --run 2>&1"

# Build:
wsl -d Ubuntu-24.04 -- zsh -ic "cd /home/sultanbp/repo/dogu && npm run build 2>&1"

# Write files: use the fs_write tool directly (no WSL needed for writes)
```

**Do NOT use:**
- `wsl bash -c` — bash doesn't load nvm, node not found
- `wsl -e bash -c` — same issue
- heredoc syntax (`<< 'EOF'`) in PowerShell — breaks due to UNC path / CMD interference
- `npm run test` directly from PowerShell — Windows intercepts it

---

## Spec Status

### dogu-platform — COMPLETE

All platform foundation tasks done.

### dogu-mvp-tools — COMPLETE

**4 live tools:**
| Slug | Category | Popular | Notes |
|------|----------|---------|-------|
| `team-splitter` | random | true | Result popup + confetti |
| `spin-wheel` | random | true | Canvas wheel, result popup, remove-from-list |
| `split-bill` | calculator | true | Simple + Itemized modes |
| `qr-generator` | generator | false | URL + WiFi modes |

**Removed:** `random-picker` — redundant with Spin Wheel, removed from registry (files kept on disk).

---

## Current Test Status

**373 tests passing across 23 test files**

```
src/utils/urlState.test.ts                    (31)
src/hooks/useLocalStorage.test.ts             (33)
src/hooks/useUrlHashState.test.ts             (12)
src/hooks/useReducedMotion.test.tsx            (3)
src/tools/registry.test.ts                    (35)
src/App.test.tsx                              (13)
src/components/AnalyticsProvider.test.tsx      (1)
src/components/ThemeProvider.test.tsx          (3)
src/components/MotionProvider.test.tsx         (3)
src/components/SharedComponents.test.tsx      (33)
src/pages/HomePage.test.tsx                   (15)
src/pages/HomePage.test.ts                     (8)
src/pages/pages.test.tsx                      (15)
src/tools/team-splitter/splitTeams.test.ts     (3)
src/tools/team-splitter/index.test.tsx        (23)
src/tools/spin-wheel/selectItem.test.ts        (3)
src/tools/spin-wheel/index.test.tsx           (17)
src/tools/split-bill/calculate.test.ts         (8)
src/tools/split-bill/index.test.tsx           (28)
src/tools/qr-generator/wifiQr.test.ts         (31)
src/tools/qr-generator/index.test.tsx         (23)
src/tools/random-picker/randomUtils.test.ts    (4)
src/tools/random-picker/index.test.tsx        (28)
```

### Expected stderr noise (not failures)
- `Error: useReducedMotion must be used within a MotionProvider`
- `Error: useLocalStorage: key must be non-empty`
- `Error: useLocalStorage: key must be <= 128 characters`
- React Router v6→v7 future flag warnings
- `HTMLCanvasElement.prototype.getContext` — jsdom limitation, not a failure

---

## Architecture Overview

### Entry Point
```
index.html
  └── src/main.tsx          ← React root, imports registerSW
       └── src/App.tsx      ← BrowserRouter > ThemeProvider > MotionProvider
                                > AnalyticsProvider > Routes
```

### Routes
```
/                → src/pages/HomePage.tsx
/tools/:slug     → src/pages/ToolPage.tsx  (lazy + error boundary, NO ToolLayout wrapper)
*                → src/pages/NotFoundPage.tsx
```

**Important:** `ToolPage` does NOT wrap tools in `ToolLayout`. Each tool component renders its own `<ToolLayout>`. This was fixed to prevent double header/title.

### Key Files

| File | Purpose |
|------|---------|
| `src/tools/registry.ts` | Tool registry — `tools[]`, `validateRegistry`, `findTool`, `SLUG_PATTERN` |
| `src/utils/urlState.ts` | Base64url encode/decode for URL hash state |
| `src/utils/filterTools.ts` | Tool search/filter logic |
| `src/utils/cn.ts` | Lightweight className utility |
| `src/utils/withTimeout.ts` | Wraps a lazy import factory with a Promise.race timeout |
| `src/utils/themeTokens.ts` | Reads CSS custom property token values at runtime |
| `src/hooks/useLocalStorage.ts` | localStorage hook, `dogu:` namespace |
| `src/hooks/useUrlHashState.ts` | URL hash state hook using urlState encoder |
| `src/hooks/useReducedMotion.ts` | Reads from MotionContext, throws if outside provider |
| `src/components/Header.tsx` | Logo (inline SVG 2×2 grid) + Link to `/` |
| `src/components/ToolCard.tsx` | Card link to `/tools/{slug}` |
| `src/components/SearchBar.tsx` | Controlled input, 200 char max |
| `src/components/CopyButton.tsx` | idle/copied/error state machine, clipboard API |
| `src/components/EmptyState.tsx` | Centered message + optional action |
| `src/components/ResultCard.tsx` | Card surface + embedded CopyButton |
| `src/components/DelayedSpinner.tsx` | Shows spinner after 200ms delay |
| `src/components/ChunkLoadError.tsx` | Error fallback with Retry button |
| `src/components/ToolErrorBoundary.tsx` | Class error boundary for lazy tool chunks |
| `src/layouts/ToolLayout.tsx` | Header + back link + title + centered main slot |
| `src/pages/HomePage.tsx` | Wordmark, tagline, SearchBar, Popular grid, All Tools grid |
| `src/pages/ToolPage.tsx` | Lazy loads tool via withTimeout + ToolErrorBoundary (no ToolLayout) |
| `src/pages/NotFoundPage.tsx` | 404 + "Back to Dogu home" link |

### Tool File Structure

Each tool lives in `src/tools/{slug}/`:
```
src/tools/team-splitter/
  index.tsx          ← React component (renders own ToolLayout)
  splitTeams.ts      ← pure algorithm
  splitTeams.test.ts ← PBT + unit tests
  index.test.tsx     ← component tests

src/tools/spin-wheel/
  index.tsx
  WheelCanvas.tsx    ← canvas sub-component
  selectItem.ts      ← pure weighted selection + angle computation
  selectItem.test.ts
  index.test.tsx

src/tools/split-bill/
  index.tsx          ← Simple + Itemized modes
  calculate.ts       ← pure calculation
  calculate.test.ts
  index.test.tsx

src/tools/qr-generator/
  index.tsx          ← URL + WiFi modes
  wifiQr.ts          ← pure WiFi QR encoder/decoder
  wifiQr.test.ts
  index.test.tsx
```

---

## Design Tokens

```css
--color-bg: #09090B
--color-surface: #18181B
--color-accent: #2563EB
--color-text: #FAFAFA
--color-text-secondary: #A1A1AA
--radius-card: 1rem        (rounded-card / rounded-2xl)
--radius-button: 0.75rem   (rounded-button)
--motion-duration-fast: 200ms
--font-sans: 'Geist', 'Inter', system-ui, sans-serif
```

Dark mode only. `<html class="dark">` set in `index.html`.
Tailwind classes: `bg-bg`, `bg-surface`, `text-text`, `text-text-secondary`, `text-accent`, `rounded-card`, `rounded-button`, `duration-fast`, `ring-accent`.

---

## Adding a New Tool

1. Create `src/tools/{slug}/index.tsx` — default export, renders own `<ToolLayout title="...">`
2. Register it in `src/tools/registry.ts` (keep array sorted by slug):

```ts
import { Heart } from 'lucide-react'

{
  slug: 'my-tool',
  name: 'My Tool',
  description: 'Does X.',
  category: 'utility',   // 'random' | 'calculator' | 'generator' | 'converter' | 'utility'
  icon: Heart,
  popular: false,
  component: () => import('./my-tool/index'),
}
```

The tool automatically appears on the homepage, gets its own route at `/tools/my-tool`, and is lazy-loaded with a 10s timeout + error boundary.

---

## Known Issues / Notes

- **No commits yet** — repo has an empty git history, all files are untracked
- **React Router v6→v7 warnings** — future flag warnings in test output, benign
- **`useLocalStorage.test.ts` TS errors** — pre-existing TypeScript errors in test files, tests pass fine
- **`random-picker` files** — still on disk at `src/tools/random-picker/` but not registered; tests still run and pass
- **Split Bill localStorage** — storage shape changed from flat `{ subtotal, people, tax, serviceCharge }` to nested `{ mode, simple: {...}, itemized: {...} }`. Users with old localStorage data will get the default state on first load.
