import fs from 'node:fs'
import path from 'node:path'
import sql, { type ConnectionPool } from 'mssql'
import { ensureDatabase, getPool, waitForServer } from './connection'
import { seedScenarioA } from './seed'

export { closePool, getPool } from './connection'

export async function initDb(): Promise<void> {
  await waitForServer()
  await ensureDatabase()

  const pool = await getPool()

  if (await membersTableExists(pool)) {
    console.log('Esquema existente; sin cambios')
    return
  }

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  await pool.request().batch(schemaSql)
  await seedScenarioA(pool)
  console.log('Esquema creado y datos de ejemplo cargados')
}

export async function isDatabaseUp(): Promise<boolean> {
  try {
    const pool = await getPool()
    await pool.request().query('SELECT 1 AS ok')
    return true
  } catch {
    return false
  }
}

async function membersTableExists(pool: ConnectionPool): Promise<boolean> {
  const result = await pool
    .request()
    .input('name', sql.NVarChar(128), 'Members')
    .query('SELECT 1 FROM sys.tables WHERE name = @name')
  return result.recordset.length > 0
}
