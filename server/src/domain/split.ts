export type Share = { memberId: number; amount: number }

export function splitExpense(amount: number, participantIds: number[]): Share[] {
  const sorted = [...participantIds].sort((a, b) => a - b)
  const k = sorted.length
  const base = Math.floor(amount / k)
  const remainder = amount % k

  return sorted.map((memberId, index) => ({
    memberId,
    amount: index < remainder ? base + 1 : base,
  }))
}
