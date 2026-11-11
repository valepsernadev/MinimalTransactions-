import type { Expense, Member, NewExpense, Repo } from './types'

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
  }
}
