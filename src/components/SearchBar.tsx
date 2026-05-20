import { Search } from 'lucide-react'

/**
 * SearchBar is a controlled input component used to filter tools on the Homepage.
 *
 * Behavior:
 * - Emits `onChange` on every keystroke, including when the input is cleared.
 * - Enforces a 200-character maximum by silently ignoring input beyond that bound.
 * - Placeholder text is in English per the platform localization strategy.
 *
 * Requirements: 4.7, 6.4, 17.1
 */
export interface SearchBarProps {
  value: string
  onChange: (v: string) => void
}

const MAX_LENGTH = 200

export function SearchBar({ value, onChange }: SearchBarProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    // Enforce 200-character limit by ignoring input beyond that bound (Req 4.7)
    if (raw.length <= MAX_LENGTH) {
      onChange(raw)
    }
  }

  return (
    <div className="relative w-full">
      {/* Search icon — decorative, hidden from assistive technology */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
        size={18}
        aria-hidden="true"
        focusable={false}
      />

      <input
        type="search"
        role="searchbox"
        aria-label="Search tools"
        placeholder="Search tools…"
        value={value}
        onChange={handleChange}
        maxLength={MAX_LENGTH}
        className={[
          'w-full',
          // Minimum 44px tap target height (Req 13.1)
          'min-h-[44px]',
          'bg-surface text-text placeholder:text-text-secondary',
          'pl-10 pr-4 py-3',
          'rounded-button border border-white/10',
          'text-sm leading-none',
          'outline-none',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent',
          'transition-[border-color,box-shadow] duration-fast ease-out',
          // Suppress the browser's built-in "×" clear button on type="search"
          // so clearing still fires onChange through the controlled value path.
          '[&::-webkit-search-cancel-button]:appearance-none',
        ].join(' ')}
      />
    </div>
  )
}

export default SearchBar
