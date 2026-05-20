import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { MotionProvider } from './components/MotionProvider'
import { AnalyticsProvider } from './components/AnalyticsProvider'
import HomePage from './pages/HomePage'
import ToolPage from './pages/ToolPage'
import NotFoundPage from './pages/NotFoundPage'

/**
 * Localization strategy (Requirements 17.1, 17.2, 17.3):
 * - All platform-level UI text (Homepage wordmark/tagline, Header aria-labels,
 *   SearchBar placeholder, EmptyState messages, NotFoundPage copy, ToolLayout
 *   back-link label) is hard-coded in English. No translation framework is
 *   bundled for the platform in this MVP.
 * - Individual tools registered in the Tool_Registry may render locale-specific
 *   data (currency formats, rank labels, share text, etc.) entirely within their
 *   own implementation without requiring any changes to platform source code.
 */

function App() {
  return (
    /*
     * BrowserRouter (React Router v6) preserves the URL hash on client-side
     * navigations that stay within the same route (e.g. repeated navigations
     * to /tools/:slug while the slug does not change). The hash is cleared
     * automatically when the user navigates to a different route (e.g. from
     * /tools/:slug back to /). This satisfies Requirement 9.4 without any
     * additional configuration.
     */
    <BrowserRouter>
      <ThemeProvider>
        <MotionProvider>
          <AnalyticsProvider>
            {/*
             * min-w-[320px]: retain 320px minimum layout on sub-320px viewports (Req 13.6).
             * overflow-x-hidden: prevent horizontal scroll on 320–1920px viewports (Req 13.2).
             */}
            <div className="min-w-[320px] overflow-x-hidden">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/tools/:slug" element={<ToolPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </div>
          </AnalyticsProvider>
        </MotionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
