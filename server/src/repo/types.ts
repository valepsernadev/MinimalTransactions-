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

// Para POST /api/seed: especifica gastos por nombre (no por Id), ya que el
// escenario reemplaza también a los integrantes.
export type SeedExpense = {
  description: string
  amount: number
  payer: string
  participants: string[]
}

export interface Repo {
  listMembers(): Promise<Member[]>
  createMember(name: string): Promise<Member>
  deleteMember(id: number): Promise<boolean>
  listExpenses(): Promise<Expense[]>
  createExpense(input: NewExpense): Promise<Expense>
  deleteExpense(id: number): Promise<boolean>
  replaceAll(memberNames: string[], expenses: SeedExpense[]): Promise<{ members: number; expenses: number }>
}
