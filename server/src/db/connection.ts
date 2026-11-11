import sql from 'mssql'

const RETRY_INTERVAL_MS = 2000
const MAX_WAIT_MS = 60000

function baseConfig(database: string): sql.config {
  return {
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    user: 'sa',
    password: process.env.MSSQL_SA_PASSWORD,
    database,
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
    },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// SQL Server tarda 20-40s en frío. depends_on del compose no espera a que
// esté listo; estos reintentos sí (SPEC §9).
export async function waitForServer(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS
  let lastError: unknown

  while (Date.now() < deadline) {
    const probe = new sql.ConnectionPool(baseConfig('master'))
    try {
      await probe.connect()
      await probe.close()
      return
    } catch (err) {
      lastError = err
      console.log('Esperando a SQL Server…')
      await sleep(RETRY_INTERVAL_MS)
    }
  }

  throw lastError ?? new Error('No se pudo conectar con SQL Server tras 60 s.')
}

export async function ensureDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME || 'MinimalTx'
  const master = new sql.ConnectionPool(baseConfig('master'))
  await master.connect()
  try {
    await master.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = '${dbName}')
      BEGIN
        EXEC('CREATE DATABASE [${dbName}]');
      END
    `)
  } finally {
    await master.close()
  }
}

let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool
  const dbName = process.env.DB_NAME || 'MinimalTx'
  const newPool = new sql.ConnectionPool(baseConfig(dbName))
  await newPool.connect()
  pool = newPool
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
  }
}
