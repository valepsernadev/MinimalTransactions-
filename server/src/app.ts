import Fastify, { type FastifyInstance } from 'fastify'
import { isDatabaseUp } from './db'
import { createRepo, type Repo } from './repo'
import { registerExpenseRoutes } from './routes/expenses'
import { registerMemberRoutes } from './routes/members'

export type BuildAppDeps = {
  // Inyectables para que los tests no dependan de una conexión real a SQL Server.
  checkDb?: () => Promise<boolean>
  repo?: Repo
}

export function buildApp(deps: BuildAppDeps = {}): FastifyInstance {
  const checkDb = deps.checkDb ?? isDatabaseUp
  const repo = deps.repo ?? createRepo()
  const app = Fastify({ logger: true })

  // AGENTS.md: nunca devolver trazas ni mensajes del driver al cliente.
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    reply.code(500).send({ error: { code: 'INTERNAL', message: 'Ocurrió un error interno.' } })
  })

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

  registerMemberRoutes(app, repo)
  registerExpenseRoutes(app, repo)

  return app
}
