export type Member = { id: number; name: string }

export type Expense = {
  id: number
  description: string
  amount: number
  payerId: number
  participantIds: number[]
}

export type Summary = {
  balances: { memberId: number; name: string; balance: number }[]
  payments: { fromId: number; toId: number; amount: number }[]
}

export type ApiError = { code: string; message: string; field?: string }

export class ApiRequestError extends Error {
  field?: string

  constructor(public apiError: ApiError) {
    super(apiError.message)
    this.field = apiError.field
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (res.status === 204) {
    return undefined as T
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!res.ok) {
    const apiError = (body as { error?: ApiError }).error
    throw new ApiRequestError(apiError ?? { code: 'INTERNAL', message: 'Ocurrió un error inesperado.' })
  }

  return body as T
}

export function getMembers(): Promise<Member[]> {
  return request('/members')
}

export function createMember(name: string): Promise<Member> {
  return request('/members', { method: 'POST', body: JSON.stringify({ name }) })
}

export function deleteMember(id: number): Promise<void> {
  return request(`/members/${id}`, { method: 'DELETE' })
}

export function getExpenses(): Promise<Expense[]> {
  return request('/expenses')
}

export function createExpense(input: {
  description: string
  amount: string
  payerId: number
  participantIds: number[]
}): Promise<Expense> {
  return request('/expenses', { method: 'POST', body: JSON.stringify(input) })
}

export function deleteExpense(id: number): Promise<void> {
  return request(`/expenses/${id}`, { method: 'DELETE' })
}

export function getSummary(): Promise<Summary> {
  return request('/summary')
}

export function seed(scenario: 'A' | 'B'): Promise<{ members: number; expenses: number }> {
  return request('/seed', { method: 'POST', body: JSON.stringify({ scenario }) })
}
