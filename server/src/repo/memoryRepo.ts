import type { Expense, Member, NewExpense, Repo, SeedExpense } from './types'

export function createMemoryRepo(): Repo {
  const members: Member[] = []
  const expenses: Expense[] = []
  let nextMemberId = 1
  let nextExpenseId = 1

  return {
    async listMembers() {
      return members.map((m) => ({ ...m }))
    },

    async createMember(name) {
      const member: Member = { id: nextMemberId++, name }
      members.push(member)
      return { ...member }
    },

    async deleteMember(id) {
      const index = members.findIndex((m) => m.id === id)
      if (index === -1) return false
      members.splice(index, 1)
      return true
    },

    async listExpenses() {
      return expenses.map((e) => ({ ...e, participantIds: [...e.participantIds] }))
    },

    async createExpense(input: NewExpense) {
      const expense: Expense = { id: nextExpenseId++, ...input }
      expenses.push(expense)
      return { ...expense, participantIds: [...expense.participantIds] }
    },

    async deleteExpense(id) {
      const index = expenses.findIndex((e) => e.id === id)
      if (index === -1) return false
      expenses.splice(index, 1)
      return true
    },

    async replaceAll(memberNames: string[], expenseSpecs: SeedExpense[]) {
      members.length = 0
      expenses.length = 0
      nextMemberId = 1
      nextExpenseId = 1

      const idByName = new Map<string, number>()
      for (const name of memberNames) {
        const member: Member = { id: nextMemberId++, name }
        members.push(member)
        idByName.set(name, member.id)
      }

      for (const spec of expenseSpecs) {
        const expense: Expense = {
          id: nextExpenseId++,
          description: spec.description,
          amount: spec.amount,
          payerId: idByName.get(spec.payer)!,
          participantIds: spec.participants.map((p) => idByName.get(p)!),
        }
        expenses.push(expense)
      }

      return { members: members.length, expenses: expenses.length }
    },
  }
}
