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

## T4 — Verificación del mínimo (2026-11-11)

- **Contexto:** SPEC §6. Candidato a Ejemplo 2 y 3 de los "tres ejemplos de IA" del README (se confirma en T12).
- **Prompt:** oráculo de fuerza bruta por particiones de conjunto (sin la DP), comparador voraz solo en tests, contraejemplo fijo (Escenario B) y test aleatorio (≥5.000 casos, semilla fija).
- **Resultado:** contraejemplo fijo → `settle = 3`, `greedy = 4` (confirma SPEC §6); el oráculo coincide con `settle` en Escenario A y B; 5.000 casos aleatorios (semilla 42, 2 a 6 personas) pasan: `settle.length === oráculo`, invariante de saldo cero tras aplicar los pagos, y determinismo (mismo input → mismo plan). `npm test` (26 tests) y `npm run build` en verde.
- **Evidencia / bug encontrado y corregido:** el primer intento del test aleatorio falló con `expected -0 to be +0` — no era un bug de `settle`, sino del generador de datos del test: cuando la suma de los primeros `n-1` saldos da exactamente 0, `-sum` produce `-0` en JS, y Vitest's `toBe` (igualdad `Object.is`) distingue `-0` de `0`. Se corrigió normalizando con `-sum || 0`.
- **Decisión:** el oráculo y el greedy viven en `server/tests/support/` (no en `server/src/domain`), para que sea imposible importarlos desde la app por error, cumpliendo la restricción de AGENTS.md de no usar greedy en producción.

## T5 — SQL Server en Docker, esquema y seed (2026-11-11)

- **Contexto:** SPEC §7.1, §7.3 y §9. Primera tarea que toca Docker y persistencia real.
- **Prompt:** `docker-compose.yml` con el servicio `db`; módulo `server/src/db/` con conexión, reintentos (2 s hasta 60 s), creación de `MinimalTx`, esquema idempotente y seed del Escenario A solo la primera vez; `/api/health` comprobando la BD.
- **Resultado:** probado en vivo con Docker real (no solo `npm test`): `docker compose up -d db` + `npm run dev` mostró "Esperando a SQL Server…" (en el primer intento, antes de corregir un bug de contraseña) y luego "Esquema creado y datos de ejemplo cargados"; `GET /api/health` → 200 `{status:"ok", db:"up"}`; se verificaron los 5 integrantes y 5 gastos del Escenario A en orden, con tildes, directamente en la base vía `sqlcmd`. Tras `docker compose down` + `up -d db` (sin `-v`) y reiniciar el servidor: "Esquema existente; sin cambios", datos intactos (5/5, no duplicados). Con `docker compose stop db`: `/api/health` → 503 `DB_UNAVAILABLE`. `npm test` (27 tests, sin Docker) y `npm run build` en verde.
- **Bugs encontrados y corregidos en el camino (evidencia real):** (1) `import 'dotenv/config'` cargaba `.env` desde el *cwd* del proceso, que en un workspace npm es `server/`, no la raíz del repo donde vive `.env` junto a `docker-compose.yml` — la contraseña nunca llegaba a la app. Se corrigió apuntando explícitamente a la raíz con `dotenv.config({ path: ... })`. (2) La contraseña de prueba usada localmente (`DevLocal#2026`) se truncaba en `#` porque `dotenv` trata `#` sin comillas como inicio de comentario — no es un bug de código, pero es un riesgo real para cualquiera que siga el README; se usó una contraseña sin `#`/`$` para la prueba y queda como advertencia para T12.
- **Decisión:** el chequeo de BD en `/api/health` se inyecta como dependencia opcional de `buildApp({ checkDb })` (por defecto la real `isDatabaseUp`), para que `npm test` siga sin necesitar Docker (restricción no negociable de AGENTS.md) y aun así el endpoint real compruebe la BD en producción. El seed usa parámetros tipados (`NVarChar`, `Int`) dentro de una transacción con rollback si algo falla.

## T6 — API de integrantes y gastos, modo mínimo (2026-11-11)

- **Contexto:** se pidió explícitamente "modo mínimo": solo lo que exige el "Listo cuando" de T6, sin ORM, middlewares, logging elaborado, paginación, autenticación ni dependencias nuevas.
- **Prompt:** `repo/` (interfaz + `sqlServerRepo` + `memoryRepo`, solo guardan datos), `domain/validation.ts` (funciones puras), rutas `members`/`expenses` según SPEC §8, tests solo para los casos del "Listo cuando".
- **Resultado:** los 5 casos automatizables del "Listo cuando" pasan con `memoryRepo` vía `fastify.inject` (400 `name`, 409 `MAX_MEMBERS`, 409 `DUPLICATE_NAME`, 409 `MEMBER_IN_USE`, 400 `amount`); el sexto caso (persistencia con SQL Server tras reiniciar el servidor) se verificó a mano igual que en T5: se creó un integrante real vía `POST /api/members`, se reinició el proceso del servidor, y siguió apareciendo en `GET /api/members` (y el log mostró "Esquema existente; sin cambios", sin re-sembrar). `npm test` (32 tests, sin Docker) y `npm run build` en verde.
- **Decisión:** se agregó un `app.setErrorHandler` mínimo en `app.ts` — no es una funcionalidad nueva pedida, sino lo mínimo necesario para cumplir la restricción no negociable de AGENTS.md ("nunca devolver trazas ni mensajes del driver al cliente"). `validateMemberDeletion`/`validateNewExpense` son funciones puras que reciben el estado actual (vía `repo.listMembers()`/`repo.listExpenses()`) en vez de que los repos conozcan reglas de negocio, tal como se decidió en el plan inicial.

## T7 — Resumen y reseteo, modo mínimo (2026-11-11)

- **Contexto:** "modo mínimo" otra vez: solo el "Listo cuando" de T7, sin cachés, endpoints extra ni dependencias nuevas.
- **Prompt:** `GET /api/summary` usando solo `computeBalances`/`settle` de `domain/`; `POST /api/seed` (`A`/`B`/`empty`) que reemplaza todo en una transacción.
- **Resultado:** los 4 casos del "Listo cuando" pasan con `memoryRepo`: Escenario A → saldos exactos y 4 pagos hacia Valeria; Escenario B → 3 pagos; `empty` → `{balances:[], payments:[]}`; `scenario` inválido → 400 `field:"scenario"`. `npm test` (36 tests, sin Docker) y `npm run build` en verde. No se verificó en vivo con SQL Server porque el "Listo cuando" de T7 no lo exige (a diferencia de T5/T6), y el repo de SQL Server usa la misma transacción con los mismos parámetros tipados ya probados en T5/T6.
- **Decisión:** se agregó `replaceAll(memberNames, expenses)` a la interfaz `Repo` (ambas implementaciones) en vez de reutilizar `createMember`/`createExpense` uno por uno, porque el seed trabaja por **nombre** (reemplaza también a los integrantes) y debe ser una sola transacción atómica, no una serie de llamadas independientes. Los datos de Escenario A/B quedan como constantes locales en `routes/seed.ts` (no un módulo compartido), por ser el único consumidor en este modo mínimo.

## T8 — UI de integrantes y gastos, modo mínimo (2026-11-11)

- **Contexto:** "modo mínimo" para el frontend: una pantalla funcional y legible, sin librerías de UI/estado/formularios, sin componentes genéricos reutilizables, pulido visual para después.
- **Prompt:** `web/src/api.ts` (fetch + try/catch); secciones Integrantes y Gastos (listas, alta, baja con confirmación); errores junto al campo (`error.field`); botón deshabilitado durante el envío; mensaje de éxito; estado vacío; refrescar `members`/`expenses`/`summary` tras cada operación.
- **Resultado:** probado en un navegador real (Chrome vía `claude-in-chrome`), no solo con `npm run build`: la pantalla carga el Escenario A completo; un nombre vacío muestra "El nombre no puede estar vacío." junto al campo; un monto "abc" muestra "El monto tiene un formato inválido." junto al campo Monto; un **doble clic real** en "Agregar" con un nombre válido creó un solo registro (verificado contando los `<li>` resultantes); recargar la página (F5) conserva los datos (incluido el integrante de prueba, cargado fresco desde el servidor); consola del navegador sin errores. No hice clic en los botones "Eliminar" dentro del navegador porque disparan `window.confirm()`, un diálogo nativo que bloquea la extensión de automatización; verifiqué esa lógica por lectura de código en vez de interacción en vivo.
- **Hallazgo, fuera de alcance de T8 (no corregido aquí):** con `STORAGE=memory`, el arranque del servidor igual intenta conectarse a un SQL Server real (vía `initDb()`/`isDatabaseUp()` en `db/index.ts`, creados en T5) antes de escuchar, así que no es realmente "sin Docker" como sugiere su propósito de salvavidas — toca revisarlo si se vuelve a tocar T5 o T11.
- **Decisión:** el guard contra doble envío usa un `useRef` además del estado de React (`memberSubmittingRef`/`expenseSubmittingRef`), porque el estado de React no se actualiza sincrónicamente dentro del mismo tick — dos clics casi simultáneos podrían pasar ambos la comprobación `if (submitting) return` si solo se usara `useState`. Los errores de gasto se guardan como `Record<string,string>` por campo (no un string único) porque el formulario tiene varios campos que pueden fallar a la vez.

## T9 — UI de saldos y plan de pagos, modo mínimo (2026-11-11)

- **Contexto:** bloques 3 y 4 de la pantalla única de SPEC §10 (Saldos y Plan de pagos), usando el `summary` que T8 ya pedía pero no renderizaba.
- **Prompt:** tarjetas de saldo (color y texto), lista "X paga $N a Y", indicador "Saldos en cero ✓" calculado en el front (sin volver a correr `settle`), "N pagos (mínimo)" + panel plegable con el texto de SPEC §5.4, botones de reseed (A/B) con confirmación, "Todo saldado" si no hay pagos.
- **Resultado:** probado en un navegador real contra SQL Server, no solo con `npm run build`: Escenario A muestra los 5 saldos exactos de SPEC §7.3 (color verde/rojo según corresponda) y el plan de 4 pagos hacia Valeria con los montos exactos; "Saldos en cero ✓" en verde; el panel "¿Cómo sabemos que es el mínimo?" se despliega con el texto correcto; cargando el Escenario B (vía API directa, ver nota) se ven los 3 pagos exactos; cargando `empty` se ve "Todo saldado, no hay pagos pendientes." y "Saldos en cero ✓" sigue mostrándose (vacuamente cierto); consola sin errores.
- **Limitación de la prueba:** no hice clic en los botones "Restablecer datos de ejemplo" / "Cargar escenario de prueba (B)" dentro del navegador porque disparan `window.confirm()` (bloquearía la extensión de automatización, igual que en T8); probé los escenarios B y `empty` llamando `POST /api/seed` directamente y recargando la página, y verifiqué la lógica de confirmación por lectura de código.
- **Decisión:** la verificación "Saldos en cero" es una función local (`appliedBalancesAreZero`) que aplica `summary.payments` sobre `summary.balances` ya recibidos del servidor — no importa `domain/settle` ni ninguna lógica de negocio del servidor en el front, cumpliendo "el front no duplica el algoritmo" y a la vez "no confía en un booleano del servidor" (SPEC §6).
