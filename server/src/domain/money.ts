export const DECIMALS = 0
const MAX_AMOUNT = 999_999_999

const PLAIN = /^\d+$/
const GROUPED_BY_THOUSANDS = /^\d{1,3}(\.\d{3})+$/

export function parseAmount(raw: string): number {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (trimmed === '') {
    throw new Error('El monto no puede estar vacío.')
  }

  let digits: string
  if (PLAIN.test(trimmed)) {
    digits = trimmed
  } else if (GROUPED_BY_THOUSANDS.test(trimmed)) {
    digits = trimmed.replace(/\./g, '')
  } else {
    throw new Error('El monto tiene un formato inválido.')
  }

  const value = Number(digits)
  if (value <= 0) {
    throw new Error('El monto debe ser mayor que cero.')
  }
  if (value > MAX_AMOUNT) {
    throw new Error(`El monto no puede superar ${formatAmount(MAX_AMOUNT)}.`)
  }

  return value
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value)
}
