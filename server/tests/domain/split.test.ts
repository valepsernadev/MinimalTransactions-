import { describe, expect, it } from 'vitest'
import { splitExpense } from '../../src/domain/split'

describe('splitExpense', () => {
  it('100.000 entre 3 participantes: 33.334 / 33.333 / 33.333, el resto al de menor Id', () => {
    expect(splitExpense(100_000, [10, 20, 30])).toEqual([
      { memberId: 10, amount: 33_334 },
      { memberId: 20, amount: 33_333 },
      { memberId: 30, amount: 33_333 },
    ])
  })

  it('caso "Cena" del Escenario A: Valeria(1), Mateo(4), Sofía(5)', () => {
    expect(splitExpense(100_000, [1, 4, 5])).toEqual([
      { memberId: 1, amount: 33_334 },
      { memberId: 4, amount: 33_333 },
      { memberId: 5, amount: 33_333 },
    ])
  })

  it('ordena por Id ascendente sin importar el orden de entrada', () => {
    const shares = splitExpense(10, [5, 1, 3])
    expect(shares.map((s) => s.memberId)).toEqual([1, 3, 5])
  })

  it('la suma de las partes siempre es igual al monto (montos varios, k de 1 a 6)', () => {
    const amounts = [1, 7, 100, 999, 123_456, 999_999_999]
    for (const amount of amounts) {
      for (let k = 1; k <= 6; k++) {
        const ids = Array.from({ length: k }, (_, i) => i + 1)
        const total = splitExpense(amount, ids).reduce((sum, s) => sum + s.amount, 0)
        expect(total).toBe(amount)
      }
    }
  })
})
