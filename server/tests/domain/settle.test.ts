import { describe, expect, it } from 'vitest'
import type { Balance } from '../../src/domain/balances'
import { settle, type Payment } from '../../src/domain/settle'
import { SCENARIO_A_BALANCES, SCENARIO_B_BALANCES } from '../fixtures/scenarios'

function applyPayments(balances: Balance[], payments: Payment[]): Map<number, number> {
  const result = new Map(balances.map((b) => [b.memberId, b.balance]))
  for (const p of payments) {
    result.set(p.fromId, (result.get(p.fromId) ?? 0) + p.amount)
    result.set(p.toId, (result.get(p.toId) ?? 0) - p.amount)
  }
  return result
}

describe('settle', () => {
  it('Escenario A: 4 pagos, todos hacia Valeria (id 1)', () => {
    const payments = settle(SCENARIO_A_BALANCES)

    expect(payments).toHaveLength(4)
    expect(payments.every((p) => p.toId === 1)).toBe(true)

    for (const balance of applyPayments(SCENARIO_A_BALANCES, payments).values()) {
      expect(balance).toBe(0)
    }
  })

  it('Escenario B: 3 pagos (mínimo real; greedy da 4, ver T4)', () => {
    const payments = settle(SCENARIO_B_BALANCES)

    expect(payments).toHaveLength(3)

    for (const balance of applyPayments(SCENARIO_B_BALANCES, payments).values()) {
      expect(balance).toBe(0)
    }
  })

  it('con todos los saldos en 0 devuelve una lista vacía', () => {
    expect(
      settle([
        { memberId: 1, balance: 0 },
        { memberId: 2, balance: 0 },
      ]),
    ).toEqual([])
  })

  it('todos los pagos tienen amount > 0', () => {
    expect(settle(SCENARIO_A_BALANCES).every((p) => p.amount > 0)).toBe(true)
    expect(settle(SCENARIO_B_BALANCES).every((p) => p.amount > 0)).toBe(true)
  })
})
