import type { Balance } from '../../src/domain/balances'

// Oráculo de fuerza bruta (SPEC §6): enumera TODAS las particiones del
// conjunto (Bell(n), hasta Bell(6) = 203) sin usar la DP de settle.ts, y
// devuelve el número mínimo de pagos. Solo para tests.
export function bruteForceMinPayments(balances: Balance[]): number {
  const nonZero = balances.filter((b) => b.balance !== 0)
  const n = nonZero.length
  if (n === 0) return 0

  const indices = nonZero.map((_, i) => i)
  let maxGroups = 0

  for (const partition of allPartitions(indices)) {
    const allZeroSum = partition.every(
      (group) => group.reduce((sum, idx) => sum + nonZero[idx].balance, 0) === 0,
    )
    if (allZeroSum && partition.length > maxGroups) {
      maxGroups = partition.length
    }
  }

  return n - maxGroups
}

function allPartitions(elements: number[]): number[][][] {
  if (elements.length === 0) return [[]]

  const [first, ...rest] = elements
  const result: number[][][] = []

  for (const partition of allPartitions(rest)) {
    for (let i = 0; i < partition.length; i++) {
      const withFirstAdded = partition.map((group, idx) => (idx === i ? [first, ...group] : group))
      result.push(withFirstAdded)
    }
    result.push([[first], ...partition])
  }

  return result
}
