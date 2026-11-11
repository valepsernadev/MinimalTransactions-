import sql from 'mssql'
import { getPool } from '../db/connection'
import type { Expense, Member, NewExpense, Repo, SeedExpense } from './types'

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

    async replaceAll(
      memberNames: string[],
      expenseSpecs: SeedExpense[],
    ): Promise<{ members: number; expenses: number }> {
      const pool = await getPool()
      const transaction = new sql.Transaction(pool)
      await transaction.begin()

      try {
        await new sql.Request(transaction).query('DELETE FROM dbo.ExpenseParticipants')
        await new sql.Request(transaction).query('DELETE FROM dbo.Expenses')
        await new sql.Request(transaction).query('DELETE FROM dbo.Members')

        const idByName = new Map<string, number>()
        for (const name of memberNames) {
          const result = await new sql.Request(transaction)
            .input('name', sql.NVarChar(20), name)
            .query('INSERT INTO dbo.Members (Name) OUTPUT INSERTED.Id VALUES (@name)')
          idByName.set(name, result.recordset[0].Id)
        }

        for (const spec of expenseSpecs) {
          const expenseResult = await new sql.Request(transaction)
            .input('description', sql.NVarChar(60), spec.description)
            .input('amount', sql.Int, spec.amount)
            .input('payerId', sql.Int, idByName.get(spec.payer))
            .query(
              'INSERT INTO dbo.Expenses (Description, Amount, PayerId) OUTPUT INSERTED.Id VALUES (@description, @amount, @payerId)',
            )
          const expenseId = expenseResult.recordset[0].Id

          for (const participant of spec.participants) {
            await new sql.Request(transaction)
              .input('expenseId', sql.Int, expenseId)
              .input('memberId', sql.Int, idByName.get(participant))
              .query('INSERT INTO dbo.ExpenseParticipants (ExpenseId, MemberId) VALUES (@expenseId, @memberId)')
          }
        }

        await transaction.commit()
        return { members: memberNames.length, expenses: expenseSpecs.length }
      } catch (err) {
        await transaction.rollback()
        throw err
      }
    },
  }
}
