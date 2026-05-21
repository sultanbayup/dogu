# Implementation Plan: Dogu Platform Foundation

## Overview

This plan implements the Dogu Platform foundation — a static React + Vite PWA that hosts a catalog of tiny daily-use web tools. The implementation proceeds bottom-up: project scaffolding and tokens first, then pure utilities and hooks, then shared components, then pages and routing, then PWA shell and analytics, and finally integration wiring. Each task builds on the previous so there is no orphaned code.

## Tasks

- [x] 1. Project scaffolding, tooling, and design tokens
  - [x] 1.1 Initialize Vite + React + TypeScript project with folder structure
    - Run `npm create vite@latest` with React + TypeScript template
    - Create directory structure: `src/components/`, `src/tools/`, `src/pages/`, `src/layouts/`, `src/hooks/`, `src/utils/`, `src/styles/`
    - Install dependencies: `react`, `react-dom`, `react-router-dom`, `framer-motion`, `lucide-react`, `tailwindcss`, `postcss`, `autoprefixer`, `vite-plugin-pwa`
    - Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `fast-check`, `jsdom`, `playwright`
    - Configure `tsconfig.json` with strict mode and path aliases
    - Create `vitest.config.ts` with jsdom environment and setup file
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [x] 1.2 Set up Tailwind CSS with design tokens
    - Create `src/styles/tokens.css` with CSS custom properties: `--color-bg: #09090B`, `--color-surface: #18181B`, `--color-accent: #2563EB`, `--color-text: #FAFAFA`, `--color-text-secondary: #A1A1AA`, `--radius-card: 1rem`, `--radius-button: 0.75rem`, `--motion-duration-fast: 200ms`, `--motion-easing: cubic-bezier(0, 0, 0.2, 1)`, `--font-sans: 'Geist', 'Inter', system-ui, sans-serif`
    - Create `src/styles/global.css` with Tailwind directives, base typography, focus rings, body styles, and `prefers-reduced-motion` overrides that set `transition-duration: 0ms !important` and `animation-duration: 0ms !important`
    - Create `tailwind.config.ts` extending `theme.colors`, `theme.borderRadius`, `theme.fontFamily`, and `theme.transitionDuration` from the CSS custom properties
    - Set `<html class="dark" style="background:#09090B;color:#FAFAFA">` inline in `index.html` for flash-free first paint
    - Preload Geist font with `font-display: swap`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

  - [x] 1.3 Create application entry point and provider shell
    - Create `src/main.tsx` as the React entry point rendering `<App />` into `#root`
    - Create `src/App.tsx` with `BrowserRouter`, `ThemeProvider`, `MotionProvider`, and `AnalyticsProvider` wrapping `<Routes>`
    - Create `src/components/ThemeProvider.tsx` that sets `class="dark"` on `<html>` and exposes token values
    - Create `src/components/MotionProvider.tsx` that wraps Framer Motion's `useReducedMotion` and exposes it via context
    - _Requirements: 5.6, 5.7_

- [ ] 2. Tool Registry and validation
  - [x] 2.1 Implement Tool Registry types and validation
    - Create `src/tools/registry.ts` with `SLUG_PATTERN` regex (`^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`), `ToolCategory` type union, and `ToolMetadata` interface
    - Implement `validateRegistry(entries: ToolMetadata[]): void` that throws descriptive errors for: duplicate slugs (naming both entries), invalid slug format, missing/empty required fields, name > 60 chars, description > 160 chars
    - Implement `findTool(slug: string): ToolMetadata | undefined` as a pure lookup
    - Export `tools` as a `ReadonlyArray<ToolMetadata>` sorted lexicographically by slug, with `validateRegistry` called at module load
    - Start with an empty array (no tools registered yet) — validation still runs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [-] 2.2 Write property test for slug validation (Property 1)
    - **Property 1: Slug validation correctness**
    - Use `fc.string()` for rejection cases and custom `fc.stringOf(fc.constantFrom(...))` constrained to valid slug alphabet + length for acceptance cases
    - Assert `SLUG_PATTERN.test(s)` returns true iff s is 1–64 chars, lowercase a–z/0–9/hyphens only, no leading/trailing hyphen
    - **Validates: Requirements 1.1, 1.6**

  - [-] 2.3 Write property test for registry invariants (Property 2)
    - **Property 2: Registry invariants**
    - Use custom `fc.array(arbitraryToolMetadata())` generator producing valid and intentionally invalid entries
    - Assert `validateRegistry` accepts iff all entries valid, no duplicate slugs, and result is sorted by slug
    - **Validates: Requirements 1.1, 1.5, 1.6, 1.7**

- [ ] 3. Pure utilities
  - [x] 3.1 Implement URL_State_Encoder
    - Create `src/utils/urlState.ts` with `DecodeError` type, `DecodeResult<T>` discriminated union, `encodeState(value: unknown): string`, and `decodeState<T>(encoded: string): DecodeResult<T>`
    - Encoding pipeline: `JSON.stringify → TextEncoder UTF-8 → base64url (no padding, + → -, / → _)`
    - Decoding inverts each step; each failing step yields the corresponding `DecodeError.kind`
    - `encodeState` throws if encoded output exceeds 2,048 characters
    - `decodeState` never throws — always returns a typed result
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [-] 3.2 Write property test for URL_State_Encoder round-trip (Property 3)
    - **Property 3: URL_State_Encoder round-trip**
    - Use `fc.jsonValue()` filtered to ≤ 64 KB serialized size
    - Assert `decodeState(encodeState(value)).ok === true` and `JSON.stringify(decoded.value) === JSON.stringify(value)`, and encoded string ≤ 2048 chars of valid base64url
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [-] 3.3 Write property test for URL_State_Encoder error categorization (Property 4)
    - **Property 4: URL_State_Encoder error categorization**
    - Three generators: random non-base64url strings, valid base64url of random bytes (likely invalid UTF-8), valid base64url of valid UTF-8 non-JSON
    - Assert `decodeState(s)` returns `{ ok: false }` with the correct `error.kind` for each category
    - **Validates: Requirements 9.5**

  - [x] 3.4 Implement filterTools utility
    - Create `filterTools` function in `src/pages/HomePage.tsx` (exported for testing)
    - Accepts `ReadonlyArray<ToolMetadata>` and `rawQuery: string`
    - Trims query; if empty returns input unchanged; otherwise returns subsequence where `name` or `description` contains trimmed query as case-insensitive substring, preserving input order
    - _Requirements: 4.1, 4.5_

  - [-] 3.5 Write property test for search filter (Property 6)
    - **Property 6: Search filter correctness**
    - Use `fc.array(arbitraryToolMetadata())` + `fc.string()` for query
    - Assert: output is subsequence of input, every included element matches, no excluded element matches, empty query returns input unchanged
    - **Validates: Requirements 4.1, 4.5**

- [ ] 4. Hooks
  - [-] 4.1 Implement LocalStorage_Hook
    - Create `src/hooks/useLocalStorage.ts` with `useLocalStorage<T>(key: string, defaultValue: T): [T, (next: T) => void]`
    - Export pure helpers `serializeOrError(value: unknown): string | Error` and `parseOrDefault<T>(raw: string, defaultValue: T): T` for testability
    - Prefix all keys with `dogu:` namespace
    - Throw synchronously if key is empty or > 128 chars
    - On init: attempt `localStorage.getItem`; parse JSON or return default; warn on parse failure
    - Setter: try `JSON.stringify`, then `localStorage.setItem`; on any failure retain value in memory, emit `console.warn`, never throw
    - Handle `SecurityError`, `QuotaExceededError`, missing `localStorage`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [~] 4.2 Write property test for LocalStorage serialize/parse round-trip (Property 5)
    - **Property 5: LocalStorage serialize/parse round-trip**
    - Use `fc.jsonValue()` generator
    - Assert `parseOrDefault(JSON.stringify(v), defaultValue)` deeply equals `v`, and `JSON.parse(serializeOrError(v))` deeply equals `v` when serialization succeeds
    - **Validates: Requirements 8.2, 8.3**

  - [~] 4.3 Implement useUrlHashState hook
    - Create `src/hooks/useUrlHashState.ts` with `useUrlHashState<T>(defaultValue: T): [T, (next: T) => void]`
    - Reads `window.location.hash`, decodes via `decodeState`; on failure returns `defaultValue` and emits `console.warn`
    - Setter encodes via `encodeState` and writes to `window.location.hash`
    - Listens for `hashchange` events to sync state
    - _Requirements: 9.4, 9.6, 9.7_

  - [x] 4.4 Implement useReducedMotion hook
    - Create `src/hooks/useReducedMotion.ts` that wraps Framer Motion's `useReducedMotion` or uses `window.matchMedia('(prefers-reduced-motion: reduce)')` and exposes the boolean via the `MotionProvider` context
    - Components consume this to set `transition: { duration: 0 }` vs `{ duration: 0.2, ease: 'easeOut' }`
    - _Requirements: 5.5, 5.6_

- [~] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Shared components
  - [~] 6.1 Implement Header component
    - Create `src/components/Header.tsx` rendering the 2×2-grid logo SVG with accessible alt text ("Dogu logo") and a `<Link to="/">` wrapping the logo
    - Logo: four squares in a 2×2 grid, uniform spacing, identical corner radii, single foreground color, transparent background
    - Keyboard activation (Enter/Space) navigates to `/`
    - _Requirements: 6.1, 15.1, 15.2, 15.5_

  - [~] 6.2 Implement Tool_Layout component
    - Create `src/layouts/ToolLayout.tsx` accepting `{ title: string; children: ReactNode }`
    - Renders `Header`, a back-to-home `<Link to="/">` with clear label, the tool title as a heading, and a `<main>` slot for children
    - _Requirements: 6.2_

  - [~] 6.3 Implement Tool_Card component
    - Create `src/components/ToolCard.tsx` accepting `{ tool: ToolMetadata }`
    - Renders as a `<Link to="/tools/{slug}">` containing the tool icon, display name, and short description
    - Full card is a tap target ≥ 44×44 CSS px with 8px spacing between adjacent cards
    - Apply `rounded-2xl` radius, hover/focus animation gated by `useReducedMotion`
    - _Requirements: 6.3, 13.1, 2.5_

  - [~] 6.4 Implement Search_Bar component
    - Create `src/components/SearchBar.tsx` accepting `{ value: string; onChange: (v: string) => void }`
    - Controlled input with placeholder text in English
    - Emits `onChange` on every keystroke including clear
    - Enforces max 200 character limit by ignoring input beyond that bound
    - _Requirements: 4.7, 6.4_

  - [~] 6.5 Implement Copy_Button component
    - Create `src/components/CopyButton.tsx` accepting `{ payload: string; label?: string; onError?: (e: Error) => void }`
    - Internal state machine: `'idle' | 'copied' | 'error'`
    - Disabled when `payload` is empty or null; minimum tap target 44×44 CSS px
    - On activation: call `navigator.clipboard.writeText(payload)`
    - On success: show "Copied" for 1–3 seconds, then revert to idle
    - On failure: show "Copy failed" for 2–4 seconds, leave clipboard unchanged, then revert to idle
    - While in `copied` or `error` state, ignore repeated activations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 6.5_

  - [~] 6.6 Implement Empty_State and Result_Card components
    - Create `src/components/EmptyState.tsx` accepting `{ message: string; action?: ReactNode }` — centered message with optional action below
    - Create `src/components/ResultCard.tsx` accepting `{ children: ReactNode; copyPayload: string }` — card surface with children + embedded `Copy_Button`
    - _Requirements: 6.6, 6.7_

  - [~] 6.7 Write unit tests for shared components
    - Test Header renders logo with alt text and links to `/`
    - Test Tool_Card renders icon, name, description, links to correct route
    - Test Search_Bar emits onChange on keystroke and enforces 200 char max
    - Test Copy_Button state transitions: idle → copied → idle, idle → error → idle, disabled when payload empty
    - Test Empty_State renders message and optional action
    - Test Result_Card renders children and Copy_Button
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 7.2, 7.3, 7.4_

- [ ] 7. Pages and routing
  - [~] 7.1 Implement HomePage
    - Create `src/pages/HomePage.tsx` with state for search query
    - Render: Dogu wordmark, tagline "Tiny tools that just work.", Search_Bar, Popular section (tools with `popular: true`, hidden when query non-empty), All Tools grid (filtered by query, lexicographic by slug)
    - Responsive grid: 1–2 columns below 768px, 3–4 columns at 768px+
    - Empty_State when no tools match query or registry is empty
    - Retry control if registry retrieval fails
    - All primary content visible without scroll on 320×568 viewport
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 13.2, 13.3, 13.4, 15.4_

  - [~] 7.2 Implement ToolPage with lazy loading
    - Create `src/pages/ToolPage.tsx` that reads `:slug` from URL params
    - Look up slug in registry via `findTool`; if not found render `NotFoundPage`
    - Wrap tool component in `React.lazy` with `withTimeout(tool.component, 10_000)` using `Promise.race`
    - Render inside `Tool_Layout` with `Suspense` fallback as `DelayedSpinner` (shows after 200ms)
    - Error boundary catches timeout/network errors, renders "Tool failed to load" with Retry button
    - Create `src/components/DelayedSpinner.tsx` and `src/components/ChunkLoadError.tsx`
    - _Requirements: 2.2, 2.3, 14.4, 14.5, 14.6_

  - [~] 7.3 Implement NotFoundPage
    - Create `src/pages/NotFoundPage.tsx` rendering inside the same shell (Header + Theme)
    - Display "404" indicator, explanation "We couldn't find that page.", and a link "Back to Dogu home" navigating to `/` via client-side navigation
    - _Requirements: 12.1, 12.2, 12.3_

  - [~] 7.4 Wire up React Router routes
    - In `src/App.tsx`, define routes: `<Route path="/" element={<HomePage />} />`, `<Route path="/tools/:slug" element={<ToolPage />} />`, `<Route path="*" element={<NotFoundPage />} />`
    - Ensure client-side navigation pushes history entries (back/forward works without full reload)
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [~] 7.5 Write unit tests for pages and routing
    - Test HomePage renders wordmark, tagline, search bar, tool cards
    - Test ToolPage renders NotFoundPage for unknown slug
    - Test ToolPage renders tool layout for known slug
    - Test NotFoundPage renders 404 indicator and home link
    - Test router matches correct components to paths
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 12.1_

- [~] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. PWA shell
  - [~] 9.1 Create Web App Manifest and icons
    - Create `public/manifest.webmanifest` with name "Dogu", short_name "Dogu", description "Tiny tools that just work.", start_url "/", theme_color "#09090B", background_color "#09090B", display "standalone"
    - Add icons array: 32×32 PNG favicon, 192×192 PNG, 512×512 PNG, 512×512 maskable PNG
    - Create placeholder icon files (or SVG-derived PNGs) in `public/icons/`
    - Link manifest from `index.html` `<link rel="manifest" href="/manifest.webmanifest">`
    - Add favicon link in `index.html`
    - _Requirements: 10.1, 15.3_

  - [~] 9.2 Implement Service Worker with vite-plugin-pwa
    - Configure `vite-plugin-pwa` in `vite.config.ts` with `injectManifest` mode
    - Create `src/sw.ts` with Workbox precache for app shell (index.html, entry JS, vendor chunk, platform CSS, logo, manifest)
    - Add `StaleWhileRevalidate` runtime cache strategy for `assets/tools/*` chunks
    - Add navigation handler: serve precached shell for navigation requests; for `/tools/{slug}` where chunk is not cached, serve `public/offline.html`
    - Create `public/offline.html` with same dark theme styling, "unavailable offline" message, and link to `/`
    - _Requirements: 10.2, 10.4, 10.5_

  - [~] 9.3 Implement Service Worker registration and update lifecycle
    - Create `src/registerSW.ts` imported by `main.tsx`
    - Call `registerSW({ immediate: true })` only when `import.meta.env.PROD` is true
    - On registration failure: log `console.warn` with reason, continue without SW
    - Update lifecycle: background fetch within 60s of next page load, activate on next full navigation, retain prior cache on failed update
    - _Requirements: 10.3, 10.6, 10.7, 10.8, 10.9_

- [ ] 10. Static hosting fallback configurations
  - [~] 10.1 Create SPA fallback files for static hosts
    - Create `public/404.html` for GitHub Pages: script stores `location.pathname + location.search` in `sessionStorage` and redirects to `/`; `index.html` reads `sessionStorage` on boot and replays path with `history.replaceState`
    - Create `public/_redirects` for Netlify/Cloudflare Pages: `/*  /index.html  200`
    - Create `vercel.json` with rewrites entry mapping `(.*)` → `/index.html`
    - _Requirements: 2.4_

- [ ] 11. Analytics
  - [~] 11.1 Implement Analytics_Module
    - Add Plausible `<script defer data-domain="dogu.app" src="https://plausible.io/js/script.js">` to `index.html`, conditionally included only in production builds (gate with build-time template or `import.meta.env.PROD` check)
    - Create `src/components/AnalyticsProvider.tsx` that listens to `useLocation` from React Router and calls `window.plausible('pageview')` on route changes
    - If `window.plausible` is undefined (script blocked/failed), the call is a no-op
    - No cookies, no PII, no user identifiers passed
    - No-op in development and preview modes
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 12. Branding and responsive polish
  - [~] 12.1 Create logo SVG and branding assets
    - Create `src/assets/logo.svg` — four squares in 2×2 grid, uniform spacing, identical corner radii, single foreground color (#FAFAFA), transparent background
    - Derive favicon (32×32 PNG) and PWA icons (192×192, 512×512, 512×512 maskable) from the logo
    - Ensure Header renders logo with `alt="Dogu logo"`
    - _Requirements: 15.1, 15.2, 15.3_

  - [~] 12.2 Apply mobile-first responsive layout
    - Ensure all tap targets ≥ 44×44 CSS px with ≥ 8px spacing between adjacent targets
    - No horizontal scrolling on viewports 320–1920px wide
    - Below 320px: retain 320px minimum layout, allow horizontal scroll
    - Homepage grid: 1–2 columns below 768px, 3–4 columns at 768px+
    - All primary actions visible without overflow hiding
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ] 13. Performance budget enforcement
  - [~] 13.1 Configure build splitting and performance checks
    - Configure Vite's `rollupOptions` to split: entry chunk (app + HomePage + NotFoundPage + shared), vendor chunk (React, React Router, Framer Motion), per-tool chunks under `assets/tools/{slug}.[hash].js`
    - Add `rollup-plugin-visualizer` or equivalent size check to CI
    - Verify initial bundle (entry + vendor + runtime) ≤ 150 KB gzipped
    - Ensure tool chunks are only fetched on navigation to `/tools/{slug}`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 14. Localization and final wiring
  - [~] 14.1 Ensure platform UI text is English and tools can embed locale data
    - Verify all platform-level UI text (Homepage, Header, Search_Bar placeholder, Empty_State messages, Not_Found_Page, Tool_Layout) is in English
    - Ensure tool components can render locale-specific data without platform changes
    - No translation framework bundled
    - _Requirements: 17.1, 17.2, 17.3_

  - [~] 14.2 Wire URL hash preservation in router
    - Ensure Router preserves URL hash on client-side navigations within the same Tool_Page route
    - Clear hash on navigation to a different route
    - _Requirements: 9.4_

- [~] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, matching the design document's stack
- All pure utilities (URL_State_Encoder, filterTools, serialize/parse helpers) are implemented before the components that consume them
- The Tool_Registry starts empty — individual tools will be added in separate specs

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "3.4", "4.4"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.5", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"] },
    { "id": 6, "tasks": ["6.7", "7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "7.5"] },
    { "id": 8, "tasks": ["9.1", "10.1", "11.1", "12.1"] },
    { "id": 9, "tasks": ["9.2", "9.3", "12.2"] },
    { "id": 10, "tasks": ["13.1", "14.1", "14.2"] }
  ]
}
```
