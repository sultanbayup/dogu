/**
 * Lightweight className utility.
 *
 * Joins truthy class strings and filters out falsy values (false, null,
 * undefined, empty string). No external dependency needed — the project
 * doesn't use clsx/tailwind-merge, and this covers all current use cases.
 *
 * Usage:
 *   cn('base-class', condition && 'conditional-class', 'another-class')
 *   cn(['array', 'of', 'classes'])
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ')
}
