import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import type { Plugin } from 'vite'

/**
 * Removes the Plausible Analytics script tag from index.html in non-production
 * builds (dev and preview). In production, the tag is left as-is.
 * Satisfies Requirement 11.1 (load only in production) and 11.5 (no-op in dev/preview).
 */
function plausibleProductionOnly(): Plugin {
  return {
    name: 'plausible-production-only',
    transformIndexHtml(html, ctx) {
      if (!ctx.server) {
        // Production build — keep the script
        return html
      }
      // Dev / preview server — strip the Plausible script tag
      return html.replace(
        /<script[^>]*plausible\.io[^>]*><\/script>\s*/g,
        ''
      )
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    plausibleProductionOnly(),
    // Bundle visualizer — writes stats.html to project root after every build.
    // Used in CI to inspect chunk sizes and verify the 150 KB gzipped budget
    // (Requirements 14.1, 14.2, 14.3).
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }) as Plugin,
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Dogu',
        short_name: 'Dogu',
        description: 'Tiny tools that just work.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#09090B',
        background_color: '#09090B',
        icons: [
          {
            src: '/icons/favicon-32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@tools': path.resolve(__dirname, './src/tools')
    }
  },
  build: {
    // Warn (but don't fail) when any single chunk exceeds 500 KB uncompressed.
    // The real budget gate is the CI gzip check against stats.html.
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy (Requirements 14.1, 14.2, 14.3, 14.4):
         *
         * - "vendor"  : React, React Router, Framer Motion — stable third-party
         *               code that changes rarely; long cache TTL.
         * - "entry"   : App shell, HomePage, NotFoundPage, and all shared
         *               components/hooks/utils — the initial bundle that must
         *               stay ≤ 150 KB gzipped together with vendor + runtime.
         * - per-tool  : Each tool's implementation is placed under
         *               assets/tools/{slug}.[hash].js so it is only fetched
         *               when the user navigates to /tools/{slug}.
         *
         * The function form of manualChunks receives the module id and lets us
         * inspect the path to assign each module to the right chunk.
         */
        manualChunks(id: string) {
          // Vendor chunk: React ecosystem + animation library
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/framer-motion/')
          ) {
            return 'vendor'
          }

          // Per-tool chunks: any module under src/tools/{slug}/ gets its own
          // chunk named after the slug so it is only loaded on /tools/{slug}.
          // Pattern: src/tools/<slug>/... where slug matches [a-z0-9-]+
          const toolMatch = id.match(/[/\\]src[/\\]tools[/\\]([a-z0-9-]+)[/\\]/)
          if (toolMatch) {
            return `tools/${toolMatch[1]}`
          }

          // Everything else (App, pages, shared components, hooks, utils,
          // styles, registry) falls into the default entry chunk produced
          // by Rollup, keeping the initial bundle cohesive.
        },

        // Place per-tool chunks under assets/tools/{slug}.[hash].js
        // so the Service Worker can apply a targeted StaleWhileRevalidate
        // strategy to the assets/tools/* URL pattern (Requirement 10.4).
        chunkFileNames(chunkInfo) {
          if (chunkInfo.name?.startsWith('tools/')) {
            // chunkInfo.name is e.g. "tools/team-splitter"
            return `assets/${chunkInfo.name}.[hash].js`
          }
          return 'assets/[name].[hash].js'
        },
      },
    },
  },
})
