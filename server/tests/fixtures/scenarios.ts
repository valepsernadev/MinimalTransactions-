import type { Balance, ExpenseInput } from '../../src/domain/balances'

// Integrantes en orden: Valeria=1, Andrés=2, Camila=3, Mateo=4, Sofía=5 (SPEC §7.3)
export const SCENARIO_A_MEMBER_IDS = [1, 2, 3, 4, 5]

export const SCENARIO_A_EXPENSES: ExpenseInput[] = [
  { payerId: 1, amount: 600_000, participantIds: [1, 2, 3, 4, 5] }, // Hospedaje cabaña
  { payerId: 2, amount: 185_000, participantIds: [1, 2, 3, 4, 5] }, // Mercado
  { payerId: 3, amount: 90_000, participantIds: [3, 4, 5] }, // Transporte
  { payerId: 4, amount: 100_000, participantIds: [1, 4, 5] }, // Cena
  { payerId: 5, amount: 140_000, participantIds: [1, 2, 3, 5] }, // Entradas parque
]

export const SCENARIO_A_BALANCES: Balance[] = [
  { memberId: 1, balance: 374_666 },
  { memberId: 2, balance: -7_000 },
  { memberId: 3, balance: -132_000 },
  { memberId: 4, balance: -120_333 },
  { memberId: 5, balance: -115_333 },
]

// Integrantes en orden: Andrés=1, Beatriz=2, Camilo=3, Daniela=4, Esteban=5
export const SCENARIO_B_BALANCES: Balance[] = [
  { memberId: 1, balance: -40_000 },
  { memberId: 2, balance: 20_000 },
  { memberId: 3, balance: 20_000 },
  { memberId: 4, balance: -30_000 },
  { memberId: 5, balance: 30_000 },
]
