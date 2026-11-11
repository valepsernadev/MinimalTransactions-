import type { Balance } from '../../src/domain/balances'
import type { Payment } from '../../src/domain/settle'

// Comparador voraz (SPEC §6): mayor acreedor <-> mayor deudor, sin agrupar
// por componentes de suma cero. No garantiza el mínimo. Solo para tests,
// nunca se usa en la app (ver AGENTS.md restricciones).
export function greedySettle(balances: Balance[]): Payment[] {
  const working = balances.filter((b) => b.balance !== 0).map((b) => ({ ...b }))
  const payments: Payment[] = []

  while (true) {
    const active = working.filter((b) => b.balance !== 0)
    if (active.length === 0) break

    const debtor = pickExtreme(active, 'min')
    const creditor = pickExtreme(active, 'max')

    const amount = Math.min(-debtor.balance, creditor.balance)
    payments.push({ fromId: debtor.memberId, toId: creditor.memberId, amount })
    debtor.balance += amount
    creditor.balance -= amount
  }

  return payments
}

function pickExtreme(items: Balance[], mode: 'min' | 'max'): Balance {
  return items.reduce((best, item) => {
    const better = mode === 'min' ? item.balance < best.balance : item.balance > best.balance
    if (better) return item
    if (item.balance === best.balance && item.memberId < best.memberId) return item
    return best
  })
}
