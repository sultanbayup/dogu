/**
 * Splits an array of names into k teams using a Fisher-Yates shuffle.
 *
 * @param names     Non-empty array of participant names (length ≥ 2)
 * @param k         Number of teams (2 ≤ k ≤ 20, k ≤ names.length)
 * @param balanced  If true, team sizes differ by at most 1 (max - min ≤ 1);
 *                  if false, names are assigned round-robin
 * @returns         Array of k arrays, each containing assigned names
 * @throws          Error if any validation constraint is violated
 */
export function splitTeams(names: string[], k: number, balanced: boolean): string[][] {
  // Validate inputs
  if (names.length < 2) {
    throw new Error('At least 2 names are required.')
  }
  if (k < 2) {
    throw new Error('Number of teams must be at least 2.')
  }
  if (k > 20) {
    throw new Error('Number of teams cannot exceed 20.')
  }
  if (k > names.length) {
    throw new Error('Number of teams cannot exceed the number of names.')
  }

  // Fisher-Yates shuffle on a copy of names
  const shuffled = [...names]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }

  // Initialise k empty teams
  const teams: string[][] = Array.from({ length: k }, () => [])

  if (balanced) {
    // Slice sequentially: first r teams get b+1 members, rest get b members
    const b = Math.floor(shuffled.length / k)
    const r = shuffled.length % k
    let cursor = 0
    for (let i = 0; i < k; i++) {
      const size = i < r ? b + 1 : b
      teams[i] = shuffled.slice(cursor, cursor + size)
      cursor += size
    }
  } else {
    // Round-robin assignment
    for (let i = 0; i < shuffled.length; i++) {
      teams[i % k].push(shuffled[i])
    }
  }

  return teams
}
