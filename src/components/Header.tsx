import { Link } from 'react-router-dom'

/**
 * DoguLogo renders the 2×2 grid of squares that forms the Dogu brand mark.
 * Four squares, uniform spacing, identical corner radii, single foreground
 * color, transparent background — per Requirements 15.1 and 15.2.
 */
function DoguLogo() {
  const size = 32        // overall SVG canvas size (px)
  const gap = 4          // gap between squares
  const r = 3            // corner radius for each square
  const sq = (size - gap) / 2  // square side length: (32 - 4) / 2 = 14

  // Top-left, top-right, bottom-left, bottom-right origins
  const squares = [
    { x: 0,        y: 0 },
    { x: sq + gap, y: 0 },
    { x: 0,        y: sq + gap },
    { x: sq + gap, y: sq + gap },
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {squares.map(({ x, y }, i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={sq}
          height={sq}
          rx={r}
          ry={r}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

/**
 * Header is the shared top-of-page component rendered on every page.
 * It displays the Dogu logo linked to the homepage ("/").
 *
 * Keyboard activation (Enter/Space on the link) navigates to "/" because
 * <Link> renders an <a> element, which natively handles both keys.
 *
 * Requirements: 6.1, 15.1, 15.2, 15.5
 */
export function Header() {
  return (
    <header className="w-full px-4 py-3 flex items-center">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-text transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-button min-h-[44px] min-w-[44px] px-1"
        aria-label="Dogu logo — go to home"
      >
        {/* Accessible alt text is provided via aria-label on the link;
            the SVG itself is aria-hidden to avoid double-announcing. */}
        <DoguLogo />
        <span className="sr-only">Dogu logo</span>
      </Link>
    </header>
  )
}

export default Header
