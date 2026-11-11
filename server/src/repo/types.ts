export type Member = { id: number; name: string }

export type Expense = {
  id: number
  description: string
  amount: number
  payerId: number
  participantIds: number[]
}

export type NewExpense = {
  description: string
  amount: number
  payerId: number
  participantIds: number[]
}

export interface Repo {
  listMembers(): Promise<Member[]>
  createMember(name: string): Promise<Member>
  deleteMember(id: number): Promise<boolean>
  listExpenses(): Promise<Expense[]>
  createExpense(input: NewExpense): Promise<Expense>
  deleteExpense(id: number): Promise<boolean>
}
