import Fastify, { type FastifyInstance } from 'fastify'
import { isDatabaseUp } from './db'

export type BuildAppDeps = {
  // Inyectable para que los tests no dependan de una conexión real a SQL Server.
  checkDb?: () => Promise<boolean>
}

export function buildApp(deps: BuildAppDeps = {}): FastifyInstance {
  const checkDb = deps.checkDb ?? isDatabaseUp
  const app = Fastify({ logger: true })

  app.get('/api/health', async (_request, reply) => {
    if (!(await checkDb())) {
      return reply.code(503).send({
        error: {
          code: 'DB_UNAVAILABLE',
          message: 'La base de datos no está disponible.',
        },
      })
    }
    return { status: 'ok', db: 'up' }
  })

  return app
}
