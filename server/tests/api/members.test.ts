import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { createMemoryRepo } from '../../src/repo/memoryRepo'

function app() {
  return buildApp({ repo: createMemoryRepo(), checkDb: async () => true })
}

describe('POST /api/members', () => {
  it('nombre vacío -> 400 con field "name"', async () => {
    const res = await app().inject({ method: 'POST', url: '/api/members', payload: { name: '' } })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.field).toBe('name')
  })

  it('séptimo integrante -> 409 MAX_MEMBERS', async () => {
    const a = app()
    const names = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete']

    let last
    for (const name of names) {
      last = await a.inject({ method: 'POST', url: '/api/members', payload: { name } })
    }

    expect(last!.statusCode).toBe(409)
    expect(last!.json().error.code).toBe('MAX_MEMBERS')
  })

  it('"andrés" cuando ya existe "Andrés" -> 409 DUPLICATE_NAME', async () => {
    const a = app()
    await a.inject({ method: 'POST', url: '/api/members', payload: { name: 'Andrés' } })
    const res = await a.inject({ method: 'POST', url: '/api/members', payload: { name: 'andrés' } })

    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('DUPLICATE_NAME')
  })
})

describe('DELETE /api/members/:id', () => {
  it('integrante usado en un gasto -> 409 MEMBER_IN_USE', async () => {
    const a = app()
    const payer = (
      await a.inject({ method: 'POST', url: '/api/members', payload: { name: 'Valeria' } })
    ).json()
    const other = (
      await a.inject({ method: 'POST', url: '/api/members', payload: { name: 'Andrés' } })
    ).json()

    await a.inject({
      method: 'POST',
      url: '/api/expenses',
      payload: {
        description: 'Cena',
        amount: '10000',
        payerId: payer.id,
        participantIds: [payer.id, other.id],
      },
    })

    const res = await a.inject({ method: 'DELETE', url: `/api/members/${payer.id}` })

    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('MEMBER_IN_USE')
  })
})
