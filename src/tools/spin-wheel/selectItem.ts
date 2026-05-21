/**
 * Pure weighted random selection and wheel angle computation for the Spin Wheel tool.
 */

/**
 * Selects an item index using weighted random selection.
 *
 * Algorithm:
 * 1. Build cumulative weight array: cum[i] = sum(weights[0..i]).
 * 2. totalWeight = cum[cum.length - 1].
 * 3. r = Math.random() * totalWeight.
 * 4. Binary search for smallest i where cum[i] > r.
 * 5. Return i.
 *
 * @param weights  Array of positive integers (length ≥ 2)
 * @returns        Index in [0, weights.length - 1]
 */
export function selectItem(weights: number[]): number {
  // Build cumulative weight array
  const cum: number[] = new Array(weights.length);
  cum[0] = weights[0];
  for (let i = 1; i < weights.length; i++) {
    cum[i] = cum[i - 1] + weights[i];
  }

  const totalWeight = cum[cum.length - 1];
  const r = Math.random() * totalWeight;

  // Binary search for smallest i where cum[i] > r
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cum[mid] > r) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return lo;
}

/**
 * Computes the target rotation angle (in radians) for the wheel
 * so that the winning segment aligns with the top pointer.
 *
 * Each segment spans (2 * Math.PI) / itemCount radians.
 * The pointer is at the top (angle 0). The centre of segment i is at
 * angle (i + 0.5) * segmentAngle from the start of the wheel.
 *
 * Target angle = currentAngle + extraSpins * 2π + (angle needed to bring
 * selected segment to top).
 *
 * @param selectedIndex  The winning segment index
 * @param itemCount      Total number of segments
 * @param currentAngle   Current wheel rotation in radians
 * @param extraSpins     Number of full rotations to add (default 5)
 * @returns              Target angle in radians
 */
export function computeTargetAngle(
  selectedIndex: number,
  itemCount: number,
  currentAngle: number,
  extraSpins: number = 5,
): number {
  const segmentAngle = (2 * Math.PI) / itemCount;

  // The drawing code renders segment i starting at:
  //   currentAngle + i * segmentAngle - π/2
  // The pointer is at the top of the canvas, which corresponds to angle -π/2
  // in canvas coordinates.
  //
  // For segment `selectedIndex` to be centred under the pointer, we need:
  //   targetAngle + (selectedIndex + 0.5) * segmentAngle - π/2 = -π/2
  //   → targetAngle = -(selectedIndex + 0.5) * segmentAngle
  //
  // We then add enough full rotations so the wheel always spins forward
  // (positive direction) from currentAngle.

  const restAngle = -(selectedIndex + 0.5) * segmentAngle;

  // How many full turns needed so targetAngle > currentAngle
  const turns = Math.ceil((currentAngle - restAngle) / (2 * Math.PI)) + extraSpins;

  return restAngle + turns * 2 * Math.PI;
}
