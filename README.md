# Dogu Platform

Dogu (道具 — Japanese for "tools/utility") is a collection of tiny, fast, daily-use web tools. This is the platform foundation — a static React + Vite PWA that hosts a tool catalog and shared infrastructure.

## Project Structure

```
src/
├── components/      # Shared UI components
├── pages/          # Page-level route components
├── layouts/        # Shared layout components
├── hooks/          # Shared React hooks
├── utils/          # Utility functions
├── tools/          # Tool implementations
├── styles/         # Global styles and design tokens
├── test/           # Test setup and utilities
├── App.tsx         # Root component
└── main.tsx        # Entry point
```

## Getting Started

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm run test
npm run test:ui
```

## Features

- ⚡ Vite + React 18 + TypeScript
- 🎨 Tailwind CSS with design tokens
- 🎭 Framer Motion for animations
- 🧪 Vitest + React Testing Library
- 📱 Mobile-first responsive design
- 🔌 PWA with Service Worker
- 📊 Plausible Analytics integration
- 🎯 Lazy-loaded tool chunks

## Requirements

- Node.js 20.19.0 or higher
- npm 10.2.3 or higher

## License

MIT
