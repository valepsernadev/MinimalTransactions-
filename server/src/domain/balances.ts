import { splitExpense } from './split'

export type Balance = { memberId: number; balance: number }
export type ExpenseInput = { payerId: number; amount: number; participantIds: number[] }

export function computeBalances(expenses: ExpenseInput[], memberIds: number[]): Balance[] {
  const balances = new Map<number, number>(memberIds.map((id) => [id, 0]))

  for (const expense of expenses) {
    balances.set(expense.payerId, (balances.get(expense.payerId) ?? 0) + expense.amount)

    for (const share of splitExpense(expense.amount, expense.participantIds)) {
      balances.set(share.memberId, (balances.get(share.memberId) ?? 0) - share.amount)
    }
  }

  return memberIds.map((memberId) => ({ memberId, balance: balances.get(memberId) ?? 0 }))
}
