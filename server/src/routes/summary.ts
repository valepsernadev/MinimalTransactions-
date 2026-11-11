import type { FastifyInstance } from 'fastify'
import { computeBalances } from '../domain/balances'
import { settle } from '../domain/settle'
import type { Repo } from '../repo/types'

export function registerSummaryRoute(app: FastifyInstance, repo: Repo): void {
  app.get('/api/summary', async () => {
    const members = await repo.listMembers()
    const expenses = await repo.listExpenses()

    const balances = computeBalances(expenses, members.map((m) => m.id))
    const payments = settle(balances)

    return {
      balances: balances.map((b) => ({
        memberId: b.memberId,
        name: members.find((m) => m.id === b.memberId)!.name,
        balance: b.balance,
      })),
      payments,
    }
  })
}
