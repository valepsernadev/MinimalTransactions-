import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { createMemoryRepo } from '../../src/repo/memoryRepo'

function app() {
  return buildApp({ repo: createMemoryRepo(), checkDb: async () => true })
}

describe('POST /api/seed + GET /api/summary', () => {
  it('Escenario A: saldos exactos y 4 pagos hacia Valeria', async () => {
    const a = app()
    await a.inject({ method: 'POST', url: '/api/seed', payload: { scenario: 'A' } })

    const res = await a.inject({ method: 'GET', url: '/api/summary' })
    const body = res.json()

    const balanceByName: Record<string, number> = {}
    for (const b of body.balances) balanceByName[b.name] = b.balance

    expect(balanceByName).toEqual({
      Valeria: 374_666,
      Andrés: -7_000,
      Camila: -132_000,
      Mateo: -120_333,
      Sofía: -115_333,
    })

    expect(body.payments).toHaveLength(4)
    const valeria = body.balances.find((b: { name: string }) => b.name === 'Valeria')
    expect(body.payments.every((p: { toId: number }) => p.toId === valeria.memberId)).toBe(true)
  })

  it('Escenario B: 3 pagos', async () => {
    const a = app()
    await a.inject({ method: 'POST', url: '/api/seed', payload: { scenario: 'B' } })

    const res = await a.inject({ method: 'GET', url: '/api/summary' })
    expect(res.json().payments).toHaveLength(3)
  })

  it('"empty": saldos 0 y payments []', async () => {
    const a = app()
    await a.inject({ method: 'POST', url: '/api/seed', payload: { scenario: 'empty' } })

    const res = await a.inject({ method: 'GET', url: '/api/summary' })
    expect(res.json()).toEqual({ balances: [], payments: [] })
  })

  it('scenario inválido -> 400 con field "scenario"', async () => {
    const a = app()
    const res = await a.inject({ method: 'POST', url: '/api/seed', payload: { scenario: 'nope' } })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.field).toBe('scenario')
  })
})
