export interface BillResult {
  subtotal: number
  taxAmount: number
  serviceChargeAmount: number
  total: number
  perPerson: number
}

/**
 * Rounds a number to the given number of decimal places using round-half-up.
 * @param x        The number to round
 * @param decimals Number of decimal places
 * @returns        Rounded value
 */
export function roundHalfUp(x: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(x * factor) / factor
}

/**
 * Computes a full bill breakdown.
 * @param subtotal           Positive number > 0, ≤ 999_999_999.99
 * @param people             Integer 1–100
 * @param taxPct             Decimal 0–100
 * @param serviceChargePct   Decimal 0–100
 * @returns BillResult with all five values
 */
export function calculateBill(
  subtotal: number,
  people: number,
  taxPct: number,
  serviceChargePct: number,
): BillResult {
  const taxAmount = subtotal * (taxPct / 100)
  const serviceChargeAmount = subtotal * (serviceChargePct / 100)
  const total = subtotal * (1 + taxPct / 100) * (1 + serviceChargePct / 100)
  const perPerson = roundHalfUp(total / people, 2)

  return {
    subtotal,
    taxAmount,
    serviceChargeAmount,
    total,
    perPerson,
  }
}
