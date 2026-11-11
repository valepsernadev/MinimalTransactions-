import type { FastifyInstance } from 'fastify'
import { validateNewExpense } from '../domain/validation'
import type { Repo } from '../repo/types'

export function registerExpenseRoutes(app: FastifyInstance, repo: Repo): void {
  app.get('/api/expenses', async () => repo.listExpenses())

  app.post('/api/expenses', async (request, reply) => {
    const body = (request.body ?? {}) as {
      description?: string
      amount?: string
      payerId?: number
      participantIds?: number[]
    }

    const members = await repo.listMembers()
    const result = validateNewExpense(
      {
        description: body.description ?? '',
        amount: body.amount ?? '',
        payerId: body.payerId as number,
        participantIds: body.participantIds ?? [],
      },
      members,
    )

    if ('error' in result) {
      return reply.code(result.error.code === 'VALIDATION' ? 400 : 409).send({ error: result.error })
    }

    const expense = await repo.createExpense(result.value)
    return reply.code(201).send(expense)
  })

  app.delete('/api/expenses/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Gasto no encontrado.' } })
    }

    const deleted = await repo.deleteExpense(id)
    if (!deleted) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Gasto no encontrado.' } })
    }
    return reply.code(204).send()
  })
}
