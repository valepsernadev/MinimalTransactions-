import { parseAmount } from './money'

export type ValidationError = { code: string; message: string; field?: string }

const MAX_MEMBERS = 6
const MAX_NAME_LENGTH = 20
const MAX_DESCRIPTION_LENGTH = 60

export function validateMemberName(
  name: string,
  existingMembers: { id: number; name: string }[],
): ValidationError | null {
  const trimmed = typeof name === 'string' ? name.trim() : ''

  if (trimmed === '') {
    return { code: 'VALIDATION', message: 'El nombre no puede estar vacío.', field: 'name' }
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      code: 'VALIDATION',
      message: `El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.`,
      field: 'name',
    }
  }
  if (existingMembers.length >= MAX_MEMBERS) {
    return { code: 'MAX_MEMBERS', message: 'El grupo ya tiene el máximo de 6 integrantes.' }
  }
  const duplicate = existingMembers.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())
  if (duplicate) {
    return { code: 'DUPLICATE_NAME', message: 'Ya existe un integrante con ese nombre.', field: 'name' }
  }

  return null
}

export function validateMemberDeletion(
  memberId: number,
  expenses: { payerId: number; participantIds: number[] }[],
): ValidationError | null {
  const inUse = expenses.some((e) => e.payerId === memberId || e.participantIds.includes(memberId))
  if (inUse) {
    return { code: 'MEMBER_IN_USE', message: 'No se puede eliminar: el integrante tiene gastos asociados.' }
  }
  return null
}

export type NewExpenseInput = {
  description: string
  amount: string
  payerId: number
  participantIds: number[]
}

export type NewExpenseValue = {
  description: string
  amount: number
  payerId: number
  participantIds: number[]
}

export function validateNewExpense(
  input: NewExpenseInput,
  members: { id: number; name: string }[],
): { value: NewExpenseValue } | { error: ValidationError } {
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (description === '') {
    return { error: { code: 'VALIDATION', message: 'La descripción no puede estar vacía.', field: 'description' } }
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      error: {
        code: 'VALIDATION',
        message: `La descripción no puede superar ${MAX_DESCRIPTION_LENGTH} caracteres.`,
        field: 'description',
      },
    }
  }

  let amount: number
  try {
    amount = parseAmount(input.amount)
  } catch (err) {
    return { error: { code: 'VALIDATION', message: (err as Error).message, field: 'amount' } }
  }

  const memberIds = new Set(members.map((m) => m.id))
  if (!memberIds.has(input.payerId)) {
    return { error: { code: 'VALIDATION', message: 'El pagador no existe.', field: 'payerId' } }
  }

  const participantIds = [...new Set(input.participantIds)]
  if (participantIds.length === 0) {
    return { error: { code: 'VALIDATION', message: 'Selecciona al menos un participante.', field: 'participantIds' } }
  }
  if (participantIds.some((id) => !memberIds.has(id))) {
    return {
      error: { code: 'VALIDATION', message: 'Hay un participante que no existe.', field: 'participantIds' },
    }
  }

  return { value: { description, amount, payerId: input.payerId, participantIds } }
}
