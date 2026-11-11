# Proyecto

**Minimal Transactions**: divisor de gastos para un grupo de hasta 6 personas. Calcula el saldo neto de cada una y propone el **mínimo absoluto** de pagos para saldar todas las deudas. Reto 4 de Prompt & Solve ITM × SoftServe.

Antes de escribir código lee `SPEC.md` (qué construir, contrato de API, esquema SQL) y `TASKS.md` (qué tarea toca).

# Stack y comandos

- Monorepo npm workspaces: `web/` (React + Vite + TypeScript) y `server/` (Fastify + TypeScript). Base de datos: **SQL Server 2022 en Docker**.
- Requisitos: Node LTS (≥ 20) y Docker Desktop.
- Configurar: `cp .env.example .env` y poner `MSSQL_SA_PASSWORD` (nunca se sube a git).
- Solo base de datos en Docker (para desarrollar con recarga en caliente): `docker compose up -d db`
- Instalar: `npm install`
- Desarrollo: `npm run dev` (API en :3000 y web en :5173; la web llama a `/api` mediante proxy de Vite)
- Probar: `npm test` (tests de `server/`; no necesitan Docker)
- Construir: `npm run build`
- **Arranque oficial, todo en Docker (SQL Server + API + web):** `docker compose up --build` y abrir http://localhost:3000. Apagar y volver a encender sin perder datos: `docker compose down` y `docker compose up -d` (nunca `-v`).

# Arquitectura (dependencias en una sola dirección)

```
web/src/            React. Solo habla con la API (fetch a /api). Sin lógica de negocio.
server/src/
  routes/           HTTP: valida entrada, llama a repo/ y domain/, devuelve JSON.
  domain/           TypeScript PURO: money, split, balances, settle, validation.
                    No importa Fastify, mssql ni nada de I/O. Aquí vive el motor de cálculo.
  repo/             ÚNICO lugar con SQL. Interfaz + implementación SQL Server + implementación en memoria.
  db/               conexión, espera con reintentos, creación de BD/esquema, seed.
server/tests/       tests de domain/ (incluye oráculo) y de la API con repo en memoria.
```

`routes → repo, domain` · `repo → db` · `domain → nada`.

# Restricciones (no negociables)

- **Dinero en enteros** (unidades mínimas). Prohibido `float` para montos, sumas o divisiones. Columna `INT`, no `DECIMAL`.
- Saldos y plan de pagos **se calculan** en cada consulta; nunca se guardan en la BD.
- **SQL solo en `repo/`, siempre con parámetros tipados.** Nunca concatenar texto del usuario en una consulta. Textos en `NVARCHAR` (hay tildes).
- La **API es la autoridad de validación**: los mensajes de error en español salen de `domain/validation.ts`; el front solo los muestra junto al campo.
- Formato de error único: `{ "error": { "code", "message", "field?" } }`. Nunca devolver trazas ni mensajes del driver al cliente.
- Docker: `Dockerfile`, `docker-compose.yml` y `.dockerignore` en la raíz. La imagen `app` **no** contiene `.env` ni `node_modules` del equipo; los secretos entran por variables de entorno del compose. La BD usa volumen con nombre.
- Sin ORM, sin librería de estado en el front, sin UI kit (un solo `styles.css`).
- **Dependencias permitidas** (cualquier otra: preguntar antes):
  server → `fastify`, `mssql`, `@fastify/static`, `dotenv`; dev → `typescript`, `tsx`, `vitest`, `@types/node`, `@types/mssql`.
  web → `react`, `react-dom`; dev → `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`.
  raíz → `concurrently` (dev).
- Secretos solo en `.env` (en `.gitignore`). `.env.example` no lleva valores reales. Sin IA dentro de la app: no hay claves de LLM.
- Textos de la interfaz en español. Datos de ejemplo ficticios.
- **No reemplazar el algoritmo exacto de `settle.ts` por uno voraz (greedy)**: no garantiza el mínimo (SPEC §6). Exacto válido para n ≤ 6; no extender sin revisar la complejidad.
- Decisión conocida: la app usa el login `sa` por simplicidad local. No "mejorarlo" sin que se pida.

# Cómo trabajar

- Una sola tarea por prompt, la que indique `TASKS.md`. Si es demasiado grande, propón dividirla antes de empezar.
- Antes de codificar, explica en 3 líneas qué vas a cambiar.
- No cambies lo que ya funciona ni refactorices código ajeno a la tarea.
- En `domain/` y en la API, escribe los tests junto con el código; no se termina sin tests en verde.
- Al terminar, dime exactamente cómo probarlo y qué casos límite revisar.
- Si algo del requisito es ambiguo, pregunta; no asumas.
- Si el contexto se llena o empiezas a contradecirte, avisa para abrir una sesión nueva (se retoma con `AGENTS.md`, `SPEC.md`, `TASKS.md`).
- Si un error no avanza en 10 minutos: explica tu hipótesis y cómo la confirmaste, propón alternativas o revierte al último commit bueno.
- Tras cada tarea, añade a `PROMPTLOG.md` 2 líneas: prompt, resultado y decisión.

# Definición de terminado (aplica a toda tarea)

- `npm test` en verde y `npm run build` sin errores.
- Cero errores en la consola del navegador y sin errores no controlados en el log del servidor.
- Los datos sobreviven a recargar con F5, a cerrar y reabrir la pestaña y a `docker compose down` + `up` (sin `-v`).
- Entradas vacías o inválidas muestran un mensaje claro junto al campo, sin romper la app. Los botones se deshabilitan mientras la petición está en curso.
- Un commit por tarea terminada y verificada.
