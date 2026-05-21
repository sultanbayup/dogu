/**
 * Picks a uniformly random index from an array.
 * @param length  Array length ≥ 1
 * @returns       Integer in [0, length - 1]
 */
export function pickRandom(length: number): number {
  return Math.floor(Math.random() * length);
}

/**
 * Fisher-Yates shuffle. Returns a new shuffled array (does not mutate input).
 * @param items  Array of any type
 * @returns      New array with same elements in random order
 */
export function shuffleItems<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates a uniformly random integer in [min, max] inclusive.
 * @param min  Integer ≥ -999_999_999
 * @param max  Integer ≤ 999_999_999, max > min
 * @returns    Integer in [min, max]
 */
export function generateNumber(min: number, max: number): number {
  const range = max - min + 1;
  return min + Math.floor(Math.random() * range);
}
