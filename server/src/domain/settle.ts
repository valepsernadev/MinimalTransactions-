import type { Balance } from './balances'

export type Payment = { fromId: number; toId: number; amount: number }

export function settle(balances: Balance[]): Payment[] {
  const nonZero = balances.filter((b) => b.balance !== 0).sort((a, b) => a.memberId - b.memberId)
  const n = nonZero.length
  if (n === 0) return []

  const size = 1 << n
  const sums = computeSums(nonZero, size, n)
  const dp = computeDp(sums, size, n)
  const groups = reconstructGroups(sums, dp, size - 1)

  const payments: Payment[] = []
  for (const group of groups) {
    payments.push(...settleGroup(membersInMask(nonZero, group, n)))
  }
  return payments
}

function computeSums(items: Balance[], size: number, n: number): number[] {
  const sums = new Array(size).fill(0)
  for (let mask = 1; mask < size; mask++) {
    let total = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) total += items[i].balance
    }
    sums[mask] = total
  }
  return sums
}

function computeDp(sums: number[], size: number, n: number): number[] {
  const dp = new Array(size).fill(0)
  for (let mask = 1; mask < size; mask++) {
    let best = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        const sub = mask & ~(1 << i)
        if (dp[sub] > best) best = dp[sub]
      }
    }
    dp[mask] = best + (sums[mask] === 0 ? 1 : 0)
  }
  return dp
}

// Desempate (SPEC §5.4): entre los subconjuntos de suma cero que contienen la
// persona de menor Id restante y preservan el óptimo, elige el de menor tamaño
// y, si empatan, el de menor valor de máscara. Así el resultado es determinista.
function reconstructGroups(sums: number[], dp: number[], fullMask: number): number[] {
  const groups: number[] = []
  let remaining = fullMask

  while (remaining !== 0) {
    const lowestBit = remaining & -remaining
    const rest = remaining & ~lowestBit

    let candidate: number | null = null
    let candidatePop = Infinity

    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const group = sub | lowestBit
      if (sums[group] === 0 && dp[remaining & ~group] + 1 === dp[remaining]) {
        const pop = popcount(group)
        if (candidate === null || pop < candidatePop || (pop === candidatePop && group < candidate)) {
          candidate = group
          candidatePop = pop
        }
      }
      if (sub === 0) break
    }

    if (candidate === null) {
      throw new Error('settle: no se encontró una partición óptima (bug interno).')
    }

    groups.push(candidate)
    remaining &= ~candidate
  }

  return groups
}

function popcount(mask: number): number {
  let count = 0
  let x = mask
  while (x) {
    count += x & 1
    x &= x - 1
  }
  return count
}

function membersInMask(items: Balance[], mask: number, n: number): Balance[] {
  const result: Balance[] = []
  for (let i = 0; i < n; i++) {
    if (mask & (1 << i)) result.push(items[i])
  }
  return result
}

// Dentro de un grupo de suma cero: mayor deudor paga al mayor acreedor
// (empates por Id ascendente) hasta saldar el grupo. Da exactamente k - 1 pagos.
function settleGroup(members: Balance[]): Payment[] {
  const working = members.map((m) => ({ id: m.memberId, balance: m.balance }))
  const payments: Payment[] = []

  while (true) {
    const active = working.filter((m) => m.balance !== 0)
    if (active.length === 0) break

    const debtor = pickExtreme(active, 'min')
    const creditor = pickExtreme(active, 'max')

    const amount = Math.min(-debtor.balance, creditor.balance)
    payments.push({ fromId: debtor.id, toId: creditor.id, amount })
    debtor.balance += amount
    creditor.balance -= amount
  }

  return payments
}

function pickExtreme(
  items: { id: number; balance: number }[],
  mode: 'min' | 'max',
): { id: number; balance: number } {
  return items.reduce((best, item) => {
    const better = mode === 'min' ? item.balance < best.balance : item.balance > best.balance
    if (better) return item
    if (item.balance === best.balance && item.id < best.id) return item
    return best
  })
}
