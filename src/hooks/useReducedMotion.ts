import { useContext } from 'react'
import { MotionContext } from '../components/MotionProvider'

/**
 * Hook to check if the user prefers reduced motion.
 * 
 * Uses the `prefers-reduced-motion: reduce` media query to determine
 * if the user has requested reduced motion preferences.
 * 
 * Components should use this to set transition durations:
 * - When true: `transition: { duration: 0 }`
 * - When false: `transition: { duration: 0.2, ease: 'easeOut' }`
 * 
 * Must be used within a MotionProvider.
 * 
 * @returns boolean - true if user prefers reduced motion, false otherwise
 * @throws Error if used outside of MotionProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const prefersReducedMotion = useReducedMotion()
 *   return (
 *     <motion.div
 *       transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
 *     >
 *       Content
 *     </motion.div>
 *   )
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const context = useContext(MotionContext)
  if (context === undefined) {
    throw new Error('useReducedMotion must be used within a MotionProvider')
  }
  return context.prefersReducedMotion
}
