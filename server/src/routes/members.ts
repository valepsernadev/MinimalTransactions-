import type { FastifyInstance } from 'fastify'
import { validateMemberDeletion, validateMemberName } from '../domain/validation'
import type { Repo } from '../repo/types'

export function registerMemberRoutes(app: FastifyInstance, repo: Repo): void {
  app.get('/api/members', async () => repo.listMembers())

  app.post('/api/members', async (request, reply) => {
    const body = (request.body ?? {}) as { name?: string }
    const existing = await repo.listMembers()
    const error = validateMemberName(body.name ?? '', existing)

    if (error) {
      return reply.code(error.code === 'VALIDATION' ? 400 : 409).send({ error })
    }

    const member = await repo.createMember((body.name ?? '').trim())
    return reply.code(201).send(member)
  })

  app.delete('/api/members/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Integrante no encontrado.' } })
    }

    const expenses = await repo.listExpenses()
    const inUseError = validateMemberDeletion(id, expenses)
    if (inUseError) {
      return reply.code(409).send({ error: inUseError })
    }

    const deleted = await repo.deleteMember(id)
    if (!deleted) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Integrante no encontrado.' } })
    }
    return reply.code(204).send()
  })
}
