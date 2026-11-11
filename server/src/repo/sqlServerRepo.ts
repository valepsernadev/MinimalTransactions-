import sql from 'mssql'
import { getPool } from '../db/connection'
import type { Expense, Member, NewExpense, Repo } from './types'

export function createSqlServerRepo(): Repo {
  return {
    async listMembers(): Promise<Member[]> {
      const pool = await getPool()
      const result = await pool.request().query('SELECT Id, Name FROM dbo.Members ORDER BY Id')
      return result.recordset.map((row) => ({ id: row.Id, name: row.Name }))
    },

    async createMember(name: string): Promise<Member> {
      const pool = await getPool()
      const result = await pool
        .request()
        .input('name', sql.NVarChar(20), name)
        .query('INSERT INTO dbo.Members (Name) OUTPUT INSERTED.Id, INSERTED.Name VALUES (@name)')
      const row = result.recordset[0]
      return { id: row.Id, name: row.Name }
    },

    async deleteMember(id: number): Promise<boolean> {
      const pool = await getPool()
      const result = await pool
        .request()
        .input('id', sql.Int, id)
        .query('DELETE FROM dbo.Members WHERE Id = @id')
      return (result.rowsAffected[0] ?? 0) > 0
    },

    async listExpenses(): Promise<Expense[]> {
      const pool = await getPool()
      const expensesResult = await pool
        .request()
        .query('SELECT Id, Description, Amount, PayerId FROM dbo.Expenses ORDER BY Id')
      const participantsResult = await pool
        .request()
        .query('SELECT ExpenseId, MemberId FROM dbo.ExpenseParticipants ORDER BY ExpenseId, MemberId')

      const participantsByExpense = new Map<number, number[]>()
      for (const row of participantsResult.recordset) {
        const list = participantsByExpense.get(row.ExpenseId) ?? []
        list.push(row.MemberId)
        participantsByExpense.set(row.ExpenseId, list)
      }

      return expensesResult.recordset.map((row) => ({
        id: row.Id,
        description: row.Description,
        amount: row.Amount,
        payerId: row.PayerId,
        participantIds: participantsByExpense.get(row.Id) ?? [],
      }))
    },

    async createExpense(input: NewExpense): Promise<Expense> {
      const pool = await getPool()
      const transaction = new sql.Transaction(pool)
      await transaction.begin()

      try {
        const expenseResult = await new sql.Request(transaction)
          .input('description', sql.NVarChar(60), input.description)
          .input('amount', sql.Int, input.amount)
          .input('payerId', sql.Int, input.payerId)
          .query(
            'INSERT INTO dbo.Expenses (Description, Amount, PayerId) OUTPUT INSERTED.Id VALUES (@description, @amount, @payerId)',
          )
        const id = expenseResult.recordset[0].Id

        for (const memberId of input.participantIds) {
          await new sql.Request(transaction)
            .input('expenseId', sql.Int, id)
            .input('memberId', sql.Int, memberId)
            .query('INSERT INTO dbo.ExpenseParticipants (ExpenseId, MemberId) VALUES (@expenseId, @memberId)')
        }

        await transaction.commit()
        return { id, ...input }
      } catch (err) {
        await transaction.rollback()
        throw err
      }
    },

    async deleteExpense(id: number): Promise<boolean> {
      const pool = await getPool()
      const result = await pool
        .request()
        .input('id', sql.Int, id)
        .query('DELETE FROM dbo.Expenses WHERE Id = @id')
      return (result.rowsAffected[0] ?? 0) > 0
    },
  }
}
