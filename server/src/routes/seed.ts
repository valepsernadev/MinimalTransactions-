import type { FastifyInstance } from 'fastify'
import type { Repo, SeedExpense } from '../repo/types'

// Escenario A y B (SPEC §7.3). El seed reemplaza todo el estado, así que
// trabaja por nombre, no por Id.
const SCENARIO_A_MEMBERS = ['Valeria', 'Andrés', 'Camila', 'Mateo', 'Sofía']
const SCENARIO_A_EXPENSES: SeedExpense[] = [
  { description: 'Hospedaje cabaña', amount: 600_000, payer: 'Valeria', participants: ['Valeria', 'Andrés', 'Camila', 'Mateo', 'Sofía'] },
  { description: 'Mercado', amount: 185_000, payer: 'Andrés', participants: ['Valeria', 'Andrés', 'Camila', 'Mateo', 'Sofía'] },
  { description: 'Transporte', amount: 90_000, payer: 'Camila', participants: ['Camila', 'Mateo', 'Sofía'] },
  { description: 'Cena', amount: 100_000, payer: 'Mateo', participants: ['Valeria', 'Mateo', 'Sofía'] },
  { description: 'Entradas parque', amount: 140_000, payer: 'Sofía', participants: ['Valeria', 'Andrés', 'Camila', 'Sofía'] },
]

const SCENARIO_B_MEMBERS = ['Andrés', 'Beatriz', 'Camilo', 'Daniela', 'Esteban']
const SCENARIO_B_EXPENSES: SeedExpense[] = [
  { description: 'Alquiler equipos', amount: 60_000, payer: 'Esteban', participants: ['Esteban', 'Daniela'] },
  { description: 'Taxi aeropuerto', amount: 40_000, payer: 'Beatriz', participants: ['Andrés', 'Beatriz'] },
  { description: 'Almuerzo', amount: 40_000, payer: 'Camilo', participants: ['Andrés', 'Camilo'] },
]

export function registerSeedRoute(app: FastifyInstance, repo: Repo): void {
  app.post('/api/seed', async (request, reply) => {
    const body = (request.body ?? {}) as { scenario?: string }

    if (body.scenario === 'A') {
      return reply.send(await repo.replaceAll(SCENARIO_A_MEMBERS, SCENARIO_A_EXPENSES))
    }
    if (body.scenario === 'B') {
      return reply.send(await repo.replaceAll(SCENARIO_B_MEMBERS, SCENARIO_B_EXPENSES))
    }
    if (body.scenario === 'empty') {
      return reply.send(await repo.replaceAll([], []))
    }

    return reply.code(400).send({
      error: { code: 'VALIDATION', message: 'El escenario debe ser "A", "B" o "empty".', field: 'scenario' },
    })
  })
}
