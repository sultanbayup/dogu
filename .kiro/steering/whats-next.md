---
inclusion: manual
---

# Dogu — What's Next

## Current State (End of Session 2)

- **4 tools live:** Team Splitter, Spin Wheel, Split Bill, QR Generator
- **373 tests passing** across 23 test files
- **No git commits yet** — all files are untracked
- **Not deployed** — build works, PWA manifest ready, but no hosting configured

---

## Immediate Priorities

### 1. First Git Commit

The repo has never been committed. Do this before any further work:

```zsh
wsl -d Ubuntu-24.04 -- zsh -ic "cd /home/sultanbp/repo/dogu && git init && git add . && git commit -m 'feat: initial commit — platform + 4 MVP tools'"
```

### 2. Deploy

The app is a static PWA — deploy to any static host. Recommended options:

| Host | Config file | Notes |
|------|-------------|-------|
| **Vercel** | `vercel.json` ✅ already present | `vercel deploy` or connect GitHub repo |
| **Netlify** | `public/_redirects` ✅ already present | Drag-and-drop `dist/` or connect GitHub |
| **Cloudflare Pages** | `public/_redirects` ✅ already present | Free, fast global CDN |
| **GitHub Pages** | `public/404.html` ✅ already present | Needs `base` in `vite.config.ts` if not root domain |

Build command: `npm run build` → output in `dist/`

---

## New Tools to Build

These are good candidates that fit the "tiny daily-use" philosophy:

### High Priority (popular, simple to implement)

| Tool | Slug | Category | Description |
|------|------|----------|-------------|
| **Tip Calculator** | `tip-calculator` | calculator | Bill + tip % → tip amount + total per person. Simpler than Split Bill. |
| **Password Generator** | `password-generator` | generator | Length, charset options, copy button. Pure client-side. |
| **Pomodoro Timer** | `pomodoro` | utility | 25/5 work-break cycles, notification support. |
| **Unit Converter** | `unit-converter` | converter | Length, weight, temperature. Common conversions only. |
| **Coin Flip / Dice Roll** | `coin-flip` | random | Simple yes/no or 1–6 random. Animated flip/roll. |

### Medium Priority

| Tool | Slug | Category | Description |
|------|------|----------|-------------|
| **Age Calculator** | `age-calculator` | calculator | Date of birth → exact age in years/months/days. |
| **Color Picker** | `color-picker` | utility | HEX ↔ RGB ↔ HSL converter + palette generator. |
| **Word Counter** | `word-counter` | utility | Paste text → word/char/sentence/paragraph counts. |
| **Base64 Encoder** | `base64` | converter | Encode/decode text or files to/from Base64. |
| **JSON Formatter** | `json-formatter` | utility | Paste JSON → pretty-print + validate. |

---

## UX Improvements

### Short-term

- **Tool categories filter** on the homepage — filter by `random`, `calculator`, `generator`, etc.
- **Keyboard shortcut** to focus the search bar (`/` key)
- **Spin Wheel history** — show last N results below the wheel
- **Team Splitter** — allow importing names from a comma-separated paste
- **Split Bill** — add a "tip %" field to the Simple mode

### Medium-term

- **Light mode** — add a theme toggle; the design tokens already support it
- **Tool favourites** — pin tools to the top of the homepage (localStorage)
- **Share button** on more tools — Team Splitter already has URL hash sharing; extend to others
- **PWA install prompt** — show a custom "Add to home screen" banner

---

## Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| First git commit | 🔴 High | Nothing is version-controlled yet |
| Deploy to production | 🔴 High | App is ready but not live |
| React Router v7 migration | 🟡 Medium | Currently on v6 with future flag warnings; v7 is a minor migration |
| `random-picker` cleanup | 🟢 Low | Files still on disk but not registered; either delete or repurpose |
| Split Bill localStorage migration | 🟢 Low | Old flat storage shape is incompatible with new nested shape; add a migration guard in `useLocalStorage` |
| Bundle size audit | 🟢 Low | Run `npm run build` and check `stats.html`; target < 150 KB gzipped per chunk |

---

## How to Add a New Tool (Quick Reference)

1. Create `src/tools/{slug}/index.tsx` — default export, renders `<ToolLayout title="...">`
2. Add pure logic to `src/tools/{slug}/{logic}.ts` with PBT coverage
3. Register in `src/tools/registry.ts` (keep sorted by slug)
4. Run `npm run test -- --run` to verify nothing broke
5. The tool appears on the homepage automatically

See `.kiro/steering/project-style.md` for full style and pattern reference.
