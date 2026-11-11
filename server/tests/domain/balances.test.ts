import { describe, expect, it } from 'vitest'
import { computeBalances } from '../../src/domain/balances'
import { SCENARIO_A_BALANCES, SCENARIO_A_EXPENSES, SCENARIO_A_MEMBER_IDS } from '../fixtures/scenarios'

describe('computeBalances', () => {
  it('Escenario A: saldos exactos y suman 0', () => {
    const balances = computeBalances(SCENARIO_A_EXPENSES, SCENARIO_A_MEMBER_IDS)
    expect(balances).toEqual(SCENARIO_A_BALANCES)
    expect(balances.reduce((sum, b) => sum + b.balance, 0)).toBe(0)
  })

  it('funciona cuando el pagador no participa', () => {
    const balances = computeBalances(
      [{ payerId: 1, amount: 300, participantIds: [2, 3] }],
      [1, 2, 3],
    )
    expect(balances).toEqual([
      { memberId: 1, balance: 300 },
      { memberId: 2, balance: -150 },
      { memberId: 3, balance: -150 },
    ])
    expect(balances.reduce((sum, b) => sum + b.balance, 0)).toBe(0)
  })
})
