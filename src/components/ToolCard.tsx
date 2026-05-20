import { Link } from 'react-router-dom'
import { ToolMetadata } from '../tools/registry'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface ToolCardProps {
  tool: ToolMetadata
}

/**
 * ToolCard renders a single tool as a tappable card linking to its route.
 *
 * - Full card is a `<Link>` so the entire surface is a tap target (≥ 44×44 CSS px)
 * - 8px gap between adjacent cards is handled by the parent grid (gap-2)
 * - `rounded-2xl` radius per design spec
 * - Hover/focus scale animation is gated by `useReducedMotion`
 *
 * Requirements: 6.3, 13.1, 2.5
 */
export function ToolCard({ tool }: ToolCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const Icon = tool.icon

  return (
    <Link
      to={`/tools/${tool.slug}`}
      className={[
        // Layout — min 44×44 tap target, internal padding
        'flex flex-col gap-3 p-4 min-h-[44px] min-w-[44px]',
        // Surface and shape
        'bg-surface rounded-2xl',
        // Border for subtle definition on dark background
        'border border-white/5',
        // Text color inheritance
        'text-text no-underline',
        // Focus ring for keyboard navigation
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        // Hover/focus animation — only when motion is allowed
        prefersReducedMotion
          ? 'transition-none'
          : 'transition-transform duration-fast ease-out hover:scale-[1.02] focus-visible:scale-[1.02]',
      ].join(' ')}
      aria-label={`${tool.name}: ${tool.description}`}
    >
      {/* Icon */}
      <span className="text-accent" aria-hidden="true">
        <Icon size={24} strokeWidth={1.75} />
      </span>

      {/* Tool name */}
      <span className="font-semibold text-sm leading-snug text-text">
        {tool.name}
      </span>

      {/* Short description */}
      <span className="text-xs leading-relaxed text-text-secondary line-clamp-2">
        {tool.description}
      </span>
    </Link>
  )
}

export default ToolCard
