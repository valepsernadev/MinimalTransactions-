# PROMPTLOG

Registro de prompts relevantes: contexto breve, prompt, resultado y decisión. Entrada corta por tarea; donde se marque como candidato a "ejemplo" (ver TASKS.md T12) se añade evidencia. Los tres ejemplos finales para la entrega se eligen en T12.

## Paso 0 — Plan inicial (2026-11-11)

- **Contexto:** inicio del reto, antes de escribir código.
- **Prompt:** leer AGENTS.md, SPEC.md y TASKS.md; proponer un plan (estructura de archivos, riesgo principal por tarea T1-T12, contradicciones/ambigüedades entre los documentos, qué recortar si falta tiempo) sin escribir código todavía.
- **Resultado:** el agente resumió el problema y la arquitectura, propuso la estructura de carpetas de AGENTS.md, listó el riesgo principal de cada tarea y señaló 4 preguntas: (1) desempate exacto en la reconstrucción del plan de pagos cuando hay varias particiones óptimas, (2) dónde vive la validación compartida entre `sqlServerRepo` y `memoryRepo`, (3) si aplican los roles de equipo sugeridos en TASKS.md, (4) qué tareas usar como los "tres ejemplos de IA" del README.
- **Decisión:** plan aprobado sin cambios de alcance. Se fijó la regla de desempate de reconstrucción en SPEC.md §5.4 (commit `docs: desempate de reconstruccion`); la validación de negocio vive solo en `domain/validation.ts`, los repos no duplican reglas; se ignoran los roles de equipo (una sola persona trabajando); los ejemplos de IA se registran a medida que ocurren y se eligen en T12.

## T1 — Esqueleto del monorepo (2026-11-11)

- **Contexto:** primera tarea de código. El repo tenía `AGENTS.md`, `SPEC.md`, `TASKS.md` versionados pero sin `.gitignore`.
- **Prompt:** crear workspaces `web/` y `server/`; Fastify con `GET /api/health`; proxy de Vite a `/api`; React muestra "Minimal Transactions" y el estado de la API; Vitest configurado; además `.env.example`, `CLAUDE.md`, `PROMPTLOG.md`, `README.md`.
- **Resultado:** ver commit `T1 esqueleto` y la salida de `npm test` / `npm run build` en esa entrada de esta sesión.
- **Decisión:** se creó también `.gitignore` (no existía, pese a asumir que sí) para no romper el criterio "Listo cuando" de T1 (`git status` no lista `.env`); se avisó explícitamente del desvío antes de hacerlo.

## T2 — `money`, `split` y `balances` (2026-11-11)

- **Contexto:** primera tarea de dominio puro (sin Docker), siguiendo SPEC §5.1–§5.3.
- **Prompt:** implementar `parseAmount`/`formatAmount`, `splitExpense` y `computeBalances` en `server/src/domain`, con tests junto al código.
- **Resultado:** 18 tests nuevos en verde (`money`, `split`, `balances`); se creó `server/tests/fixtures/scenarios.ts` con el Escenario A (y los saldos del B) como fixture compartido, reutilizable en T3/T4.
- **Decisión:** `parseAmount` lanza `Error` con mensaje en español directamente (no un código de error con `field`); el mapeo a `{code, message, field}` de la API queda para `domain/validation.ts` en T6, que puede capturar y reempacar ese mensaje.

## T3 — `settle`: mínimo absoluto de pagos (2026-11-11)

- **Contexto:** núcleo algorítmico del reto (SPEC §5.4, con la regla de desempate que fijaste antes de T1).
- **Prompt:** implementar la DP sobre subconjuntos y la reconstrucción determinista del plan de pagos; sin greedy en la app.
- **Resultado:** Escenario A → 4 pagos, todos hacia Valeria; Escenario B → 3 pagos; en ambos, al aplicar los pagos los saldos quedan en 0; con todos los saldos en 0 devuelve lista vacía. `npm test` (23 tests) y `npm run build` en verde.
- **Decisión:** la reconstrucción de grupos y el emparejamiento intra-grupo quedan como funciones internas no exportadas de `settle.ts` (no hace falta probarlas por separado, se cubren a través de `settle`); se agregó un `throw` interno si no se encuentra una partición óptima, para fallar ruidosamente ante un bug futuro en vez de devolver un plan incorrecto en silencio.
