import sql, { type ConnectionPool } from 'mssql'

const SCENARIO_A_MEMBERS = ['Valeria', 'Andrés', 'Camila', 'Mateo', 'Sofía']

const SCENARIO_A_EXPENSES = [
  {
    description: 'Hospedaje cabaña',
    amount: 600_000,
    payer: 'Valeria',
    participants: ['Valeria', 'Andrés', 'Camila', 'Mateo', 'Sofía'],
  },
  {
    description: 'Mercado',
    amount: 185_000,
    payer: 'Andrés',
    participants: ['Valeria', 'Andrés', 'Camila', 'Mateo', 'Sofía'],
  },
  {
    description: 'Transporte',
    amount: 90_000,
    payer: 'Camila',
    participants: ['Camila', 'Mateo', 'Sofía'],
  },
  {
    description: 'Cena',
    amount: 100_000,
    payer: 'Mateo',
    participants: ['Valeria', 'Mateo', 'Sofía'],
  },
  {
    description: 'Entradas parque',
    amount: 140_000,
    payer: 'Sofía',
    participants: ['Valeria', 'Andrés', 'Camila', 'Sofía'],
  },
]

export async function seedScenarioA(pool: ConnectionPool): Promise<void> {
  const transaction = new sql.Transaction(pool)
  await transaction.begin()

  try {
    const memberIds = new Map<string, number>()

    for (const name of SCENARIO_A_MEMBERS) {
      const result = await new sql.Request(transaction)
        .input('name', sql.NVarChar(20), name)
        .query('INSERT INTO dbo.Members (Name) OUTPUT INSERTED.Id VALUES (@name)')
      memberIds.set(name, result.recordset[0].Id)
    }

    for (const expense of SCENARIO_A_EXPENSES) {
      const payerId = memberIds.get(expense.payer)
      const expenseResult = await new sql.Request(transaction)
        .input('description', sql.NVarChar(60), expense.description)
        .input('amount', sql.Int, expense.amount)
        .input('payerId', sql.Int, payerId)
        .query(
          'INSERT INTO dbo.Expenses (Description, Amount, PayerId) OUTPUT INSERTED.Id VALUES (@description, @amount, @payerId)',
        )
      const expenseId = expenseResult.recordset[0].Id

      for (const participant of expense.participants) {
        await new sql.Request(transaction)
          .input('expenseId', sql.Int, expenseId)
          .input('memberId', sql.Int, memberIds.get(participant))
          .query('INSERT INTO dbo.ExpenseParticipants (ExpenseId, MemberId) VALUES (@expenseId, @memberId)')
      }
    }

    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}
