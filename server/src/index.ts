import 'dotenv/config'
import { buildApp } from './app'

const app = buildApp()
const PORT = Number(process.env.PORT) || 3000

app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
