import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'

describe('GET /api/health', () => {
  it('con BD arriba responde 200 con status ok y db up', async () => {
    const app = buildApp({ checkDb: async () => true })
    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', db: 'up' })
  })

  it('con BD caída responde 503 DB_UNAVAILABLE', async () => {
    const app = buildApp({ checkDb: async () => false })
    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'La base de datos no está disponible.',
      },
    })
  })
})
