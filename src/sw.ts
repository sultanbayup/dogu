/// <reference lib="webworker" />
/**
 * Service Worker — injectManifest mode (vite-plugin-pwa)
 *
 * Workbox injects the precache manifest into `self.__WB_MANIFEST` at build time.
 * This file is the hand-written routing layer on top of that manifest.
 *
 * Satisfies Requirements 10.2, 10.4, 10.5.
 */

import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  type PrecacheEntry,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

// Augment the ServiceWorkerGlobalScope to include the Workbox-injected manifest.
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<PrecacheEntry | string>
  }
}

declare const self: ServiceWorkerGlobalScope

// Take control of all clients immediately on activation (Requirement 10.7).
clientsClaim()

// ─── Precache ────────────────────────────────────────────────────────────────
// Workbox replaces `self.__WB_MANIFEST` with the list of app-shell assets at
// build time: index.html, entry JS chunk, vendor chunk, platform CSS, logo SVG,
// and manifest.webmanifest (Requirement 10.2).
precacheAndRoute(self.__WB_MANIFEST)

// Remove stale precache entries from previous SW versions (Requirement 10.8).
cleanupOutdatedCaches()

// ─── Runtime cache: tool chunks ──────────────────────────────────────────────
// Cache tool implementation chunks under assets/tools/* with StaleWhileRevalidate
// so they are available offline after one online visit (Requirement 10.4).
registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/tools/'),
  new StaleWhileRevalidate({
    cacheName: 'tool-chunks',
  })
)

// ─── Navigation handler ──────────────────────────────────────────────────────
// For navigation requests (HTML page loads), serve the precached app shell
// (index.html) so the SPA router can take over.
//
// Exception: if the request is for /tools/{slug} and that tool's chunk is NOT
// in the runtime cache, serve the precached offline.html fallback instead of
// the shell — the shell would render a spinner that never resolves offline
// (Requirement 10.5).

const TOOL_ROUTE_RE = /^\/tools\/([^/]+)\/?$/

async function isToolChunkCached(slug: string): Promise<boolean> {
  const cache = await caches.open('tool-chunks')
  const keys = await cache.keys()
  // Tool chunks are named assets/tools/{slug}.[hash].js
  return keys.some(req => req.url.includes(`/assets/tools/${slug}`))
}

const shellHandler = createHandlerBoundToURL('/index.html')

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  if (request.mode !== 'navigate') return

  const url = new URL(request.url)
  const toolMatch = TOOL_ROUTE_RE.exec(url.pathname)

  if (toolMatch) {
    const slug = toolMatch[1]
    event.respondWith(
      isToolChunkCached(slug).then(cached => {
        if (cached) {
          // Chunk is cached — serve the shell; the SPA will hydrate normally.
          return shellHandler({ event, request, url, params: undefined })
        }
        // Chunk not cached — serve the offline fallback page.
        return caches.match('/offline.html').then(
          res => res ?? fetch('/offline.html')
        )
      })
    )
    return
  }

  // All other navigations (/, /404, etc.) — serve the precached shell.
  event.respondWith(
    shellHandler({ event, request, url, params: undefined }).catch(
      () => fetch(request)
    )
  )
})

// Register the NavigationRoute for Workbox's internal routing (used by
// workbox-routing's router; the manual fetch listener above handles the
// offline-fallback logic, so this is a no-op for navigations already handled).
const navigationRoute = new NavigationRoute(shellHandler, {
  // Exclude /offline.html itself from the shell redirect to avoid a loop.
  denylist: [/^\/offline\.html/],
})
registerRoute(navigationRoute)
