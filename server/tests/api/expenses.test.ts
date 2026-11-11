import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { createMemoryRepo } from '../../src/repo/memoryRepo'

describe('POST /api/expenses', () => {
  it('monto "abc" -> 400 con field "amount"', async () => {
    const app = buildApp({ repo: createMemoryRepo(), checkDb: async () => true })
    const member = (
      await app.inject({ method: 'POST', url: '/api/members', payload: { name: 'Valeria' } })
    ).json()

    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      payload: { description: 'Cena', amount: 'abc', payerId: member.id, participantIds: [member.id] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.field).toBe('amount')
  })
})
