import path from 'node:path'
import dotenv from 'dotenv'
import { buildApp } from './app'
import { initDb } from './db'

// server/ es un workspace npm: su cwd no es la raíz del repo, así que el
// .env (en la raíz, junto a docker-compose.yml) no se cargaría por defecto.
dotenv.config({ path: path.join(__dirname, '../../.env') })

const app = buildApp()
const PORT = Number(process.env.PORT) || 3000

async function main() {
  try {
    await initDb()
  } catch (err) {
    app.log.error(err, 'No se pudo inicializar la base de datos al arrancar')
  }

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
