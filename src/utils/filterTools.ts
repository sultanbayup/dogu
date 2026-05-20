/**
 * Filters a list of tools by a search query.
 *
 * Behavior:
 * - Trims the query string
 * - If trimmed query is empty, returns input unchanged
 * - Otherwise returns tools whose name or description contains the trimmed
 *   query as a case-insensitive substring
 * - Preserves the input order
 *
 * @param input - Array of tools to filter
 * @param rawQuery - Raw query string (may contain leading/trailing whitespace)
 * @returns Filtered array of tools
 *
 * Requirements: 4.1, 4.5
 */
export function filterTools<T extends { name: string; description: string }>(
  input: ReadonlyArray<T>,
  rawQuery: string,
): ReadonlyArray<T> {
  const trimmedQuery = rawQuery.trim()

  if (trimmedQuery === '') {
    return input
  }

  const lowerQuery = trimmedQuery.toLowerCase()

  return input.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery),
  )
}
