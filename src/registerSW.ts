import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the Service Worker in production only.
 *
 * - Calls registerSW({ immediate: true }) so the SW is registered as soon as
 *   the module is imported, without waiting for the window load event.
 * - onRegisteredSW: no-op — registration success is silent.
 * - onRegisterError: logs a console warning and lets the app continue with
 *   direct network requests (Requirement 10.3).
 * - onNeedRefresh: no-op in MVP — the next full navigation picks up the new
 *   version automatically (Requirements 10.6, 10.7).
 *   Background fetch happens within 60 s of the next page load; if it fails
 *   the prior cache is retained (Requirement 10.8).
 *
 * The SW is never on the critical rendering path; this module is a
 * fire-and-forget side-effect import (Requirement 10.9).
 */
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisterError(error: unknown) {
      console.warn('[SW] Registration failed:', error)
    },
  })
}
