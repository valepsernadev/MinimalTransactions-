import { describe, expect, it } from 'vitest'
import type { Balance } from '../../src/domain/balances'
import { settle, type Payment } from '../../src/domain/settle'
import { SCENARIO_A_BALANCES, SCENARIO_B_BALANCES } from '../fixtures/scenarios'
import { greedySettle } from '../support/greedyReference'
import { bruteForceMinPayments } from '../support/oracle'
import { mulberry32 } from '../support/rng'

function applyPayments(balances: Balance[], payments: Payment[]): Map<number, number> {
  const result = new Map(balances.map((b) => [b.memberId, b.balance]))
  for (const p of payments) {
    result.set(p.fromId, (result.get(p.fromId) ?? 0) + p.amount)
    result.set(p.toId, (result.get(p.toId) ?? 0) - p.amount)
  }
  return result
}

describe('Verificación del mínimo (SPEC §6)', () => {
  it('contraejemplo fijo (Escenario B): settle = 3, greedy = 4', () => {
    expect(settle(SCENARIO_B_BALANCES)).toHaveLength(3)
    expect(greedySettle(SCENARIO_B_BALANCES)).toHaveLength(4)
  })

  it('el oráculo de fuerza bruta coincide con settle en número de pagos (Escenario A y B)', () => {
    expect(settle(SCENARIO_A_BALANCES)).toHaveLength(bruteForceMinPayments(SCENARIO_A_BALANCES))
    expect(settle(SCENARIO_B_BALANCES)).toHaveLength(bruteForceMinPayments(SCENARIO_B_BALANCES))
  })

  it(
    'aleatorio: 5.000 casos de 2 a 6 personas (semilla fija) — settle = oráculo, invariantes y determinismo',
    () => {
      const rand = mulberry32(42)
      const CASES = 5000

      for (let c = 0; c < CASES; c++) {
        const n = 2 + Math.floor(rand() * 5) // 2..6
        const balances: Balance[] = []
        let sum = 0

        for (let i = 0; i < n - 1; i++) {
          const value = Math.floor(rand() * 2001) - 1000 // -1000..1000
          balances.push({ memberId: i + 1, balance: value })
          sum += value
        }
        balances.push({ memberId: n, balance: -sum || 0 }) // evita -0 (Object.is lo distingue de 0)

        const payments = settle(balances)
        const expectedMin = bruteForceMinPayments(balances)

        expect(payments).toHaveLength(expectedMin)
        expect(payments.every((p) => p.amount > 0)).toBe(true)

        for (const balance of applyPayments(balances, payments).values()) {
          expect(balance).toBe(0)
        }

        // Determinismo (SPEC §5.4): misma entrada, mismo plan.
        expect(settle(balances)).toEqual(payments)
      }
    },
    30_000,
  )
})
