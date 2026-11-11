import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount } from '../../src/domain/money'

describe('parseAmount', () => {
  it.each(['', '   ', '0', '-5', 'abc', '1e3', '1.5', '1000000000'])(
    'rechaza "%s"',
    (input) => {
      expect(() => parseAmount(input)).toThrow()
    },
  )

  it('acepta "1500" como 1500', () => {
    expect(parseAmount('1500')).toBe(1500)
  })

  it('acepta "1.500" (separador de miles) como 1500', () => {
    expect(parseAmount('1.500')).toBe(1500)
  })

  it('acepta el máximo "999.999.999"', () => {
    expect(parseAmount('999.999.999')).toBe(999_999_999)
  })
})

describe('formatAmount', () => {
  it('usa separador de miles es-CO', () => {
    expect(formatAmount(1500)).toBe('1.500')
  })
})
