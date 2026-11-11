# TASKS

Una tarea por prompt, con el contexto mínimo (`AGENTS.md`, `SPEC.md` y la tarea). Cada tarea termina con: **prueba a mano, consola del navegador sin errores en rojo, lectura del diff, `npm test` y `npm run build` en verde, una entrada en `PROMPTLOG.md` y un commit.** Nada se marca como terminado sin haberlo visto funcionar.

Orden pensado para reducir riesgo: primero el dominio (verificable sin Docker), después la base de datos y la API, y por último la interfaz y el empaquetado.

**Roles sugeridos para tres personas (guía §12):** A = piloto del agente y arquitectura (T1, T5, T6, T7, T10) · B = interfaz, estilos y casos de error (T8, T9, T11) · C = verificación, README y evidencias (T2, T3, T4, T12). Con el contrato de API de `SPEC.md` §8 y `STORAGE=memory`, B puede avanzar sin esperar a SQL Server. Todos deben poder explicar cualquier parte del código.

---

## Paso 0 (no cuenta como tarea): planificar sin código

Prompt (guía §8): *«Lee SPEC.md y AGENTS.md. No escribas código todavía. Propón un plan con estructura de archivos, modelo de datos y los pasos en orden para construir el flujo principal. Señala los riesgos (Docker, SQL Server, arranque en frío) y qué dejar fuera para terminar a tiempo. Pregunta si algo del requisito es ambiguo.»*
**Listo cuando:** el equipo revisó el plan, recortó lo que no es flujo principal (va a "Si sobra tiempo") y lo registró en `PROMPTLOG.md`.

---

## Fase 1: Base

- [ ] **T1 Esqueleto del monorepo.**
  Workspaces `web/` y `server/`; Fastify con `GET /api/health` (por ahora solo `{status:"ok"}`); proxy de Vite a `/api`; React muestra "Minimal Transactions" y el estado de la API; Vitest configurado. Además: `git init`, `.gitignore` (`.env`, `node_modules`, `dist`), `.env.example`, `CLAUDE.md` con la línea `@AGENTS.md`, y esqueletos de `PROMPTLOG.md` y `README.md` (lista de herramientas de IA, plantillas y librerías usadas).
  **Listo cuando:** `npm install && npm run dev` abre :5173 y muestra "API conectada ✓"; si apagas el servidor, la página muestra un aviso en vez de romperse; `npm test` y `npm run build` pasan; `git status` no lista `.env`.
  Commit: `T1 esqueleto`

## Fase 2: Dominio (TypeScript puro, sin Docker)

- [ ] **T2 `money`, `split` y `balances`.**
  `parseAmount` y `formatAmount`, `splitExpense` y `computeBalances` en `server/src/domain` (reglas de SPEC §5.1 a §5.3).
  **Listo cuando:** se rechazan `""`, `"  "`, `0`, `-5`, `abc`, `1e3`, `1.5` y `1000000000`, y se aceptan `1500` y `1.500`; 100.000 entre 3 da 33.334 / 33.333 / 33.333 al orden correcto; la suma de partes siempre es igual al monto (montos varios, `k` de 1 a 6); con el Escenario A los saldos son exactamente +374.666 / −7.000 / −132.000 / −120.333 / −115.333 y suman 0, también cuando el pagador no participa.
  Commit: `T2 dominio base`

- [ ] **T3 `settle`: mínimo absoluto de pagos.**
  DP sobre subconjuntos de SPEC §5.4. Sin greedy en la app.
  **Listo cuando:** el Escenario A da 4 pagos hacia Valeria; el Escenario B da 3 pagos; con todos los saldos en 0 devuelve lista vacía; en todos los casos, al aplicar los pagos los saldos quedan en 0.
  Commit: `T3 settle minimo`

- [ ] **T4 Verificación del mínimo.**
  En `server/tests/`: oráculo por particiones de conjunto, greedy solo como contraste, contraejemplo fijo (Escenario B) y test aleatorio (SPEC §6).
  **Listo cuando:** el test del contraejemplo afirma `settle = 3` y `greedy = 4`; el aleatorio (≥ 5.000 casos con semilla fija) pasa con `settle = oráculo` e invariantes cumplidos.
  Evidencia: guardar la salida de `npm test` y el prompt donde el agente propuso (o no) greedy. Candidato a **Ejemplo 2** (resultado refinado o rechazado) y a **Ejemplo 3** (verificación).
  Commit: `T4 verificacion minimo`

## Fase 3: Base de datos y API

- [ ] **T5 SQL Server en Docker, esquema y seed.**
  `docker-compose.yml` con el servicio `db` y volumen; módulo `db/` con conexión, reintentos, creación de base y esquema (SPEC §7.1 y §9) y seed del Escenario A solo la primera vez; `/api/health` ahora comprueba la BD. Contraseña desde `.env`.
  **Listo cuando:** con `docker compose up -d db` y `npm run dev`, el log muestra "Esperando a SQL Server…" y luego "Esquema creado y datos de ejemplo cargados"; `GET /api/health` da `db:"up"`; tras `docker compose down` y `up -d db` (sin `-v`) y reiniciar el servidor, el log dice "Esquema existente; sin cambios"; con una contraseña débil el contenedor no arranca y el README lo explica.
  Commit: `T5 sql server`

- [ ] **T6 API de integrantes y gastos.**
  Interfaz `repo/` con implementación SQL Server y en memoria; `domain/validation.ts`; rutas de `members` y `expenses` (SPEC §8); manejador de errores con el formato único. Tests con `fastify.inject` y repo en memoria. (Si resulta demasiado grande, dividir en integrantes y gastos.)
  **Listo cuando:** nombre vacío → 400 con `field:"name"`; el séptimo integrante → 409 `MAX_MEMBERS`; "andrés" cuando existe "Andrés" → 409 `DUPLICATE_NAME`; borrar un integrante usado → 409 `MEMBER_IN_USE`; monto `"abc"` → 400 con `field:"amount"`; un nombre con `'; DROP TABLE Members;--` se guarda como texto; los datos siguen tras reiniciar el servidor (SQL Server).
  Commit: `T6 api miembros y gastos`

- [ ] **T7 Resumen y reseteo.**
  `GET /api/summary` (saldos + plan, usando `domain/`) y `POST /api/seed` (`A`, `B`, `empty`) en una transacción.
  **Listo cuando:** `summary` con el Escenario A da los saldos exactos y 4 pagos; con B da 3 pagos; tras `seed` con `empty` devuelve saldos 0 y `payments: []`; un `scenario` inválido da 400.
  Commit: `T7 summary y seed`

## Fase 4: Interfaz

- [ ] **T8 UI de integrantes y gastos.**
  Cliente `api.ts` con try/catch (errores de red → mensaje claro), bloque de integrantes, formulario y lista de gastos, mensajes de error junto al campo, botón deshabilitado mientras envía, mensaje de éxito, confirmación al borrar, estados vacíos.
  **Listo cuando:** cada error de SPEC §11 (integrante y gasto) aparece junto a su campo con el texto de la API; un doble clic en "Agregar" crea un solo registro; eliminar actualiza la lista de inmediato; todo sobrevive a F5.
  Commit: `T8 ui miembros y gastos`

- [ ] **T9 UI de saldos y plan de pagos.**
  Tarjetas de saldo (color y texto), lista de pagos, comprobación independiente en el front (aplicar los pagos a los saldos), indicador "Saldos en cero ✓", "N pagos (mínimo)", panel "¿Cómo sabemos que es el mínimo?", y botones de restablecer y de cargar el escenario B con confirmación.
  **Listo cuando:** con el Escenario A se ven los valores exactos de SPEC §7.3; con el B se ven 3 pagos; con saldos en cero aparece "Todo saldado"; restablecer pide confirmación y deja el Escenario A.
  Commit: `T9 saldos y plan`

> **PUNTO DE CONTROL:** ¿el flujo principal (SPEC §4) funciona de punta a punta en vivo, con SQL Server? La guía lo ubica a las 10:15. Si no, recortar alcance **ya** (ver "Orden de recorte") y no pasar a T10 ni T11.

## Fase 5: Empaquetado y entrega

- [ ] **T10 Dockerizar la app completa (arranque oficial de la entrega).**
  `Dockerfile` multi-etapa, `.dockerignore` y servicio `app` en el compose (SPEC §9); Fastify sirve el front compilado; `.env.example` completo. Conviene empezarla en cuanto T7 esté lista (la persona con rol A, mientras B hace T8 y T9) y no dejarla para el final.
  **Listo cuando:** en una carpeta limpia, `cp .env.example .env` + `docker compose up --build` deja ambos servicios arriba (`docker compose ps`) y la app en http://localhost:3000 con el Escenario A; `.env` no está dentro de la imagen; tras `docker compose down` + `up -d` (sin `-v`) los datos siguen. Solo si la imagen no se construye y no se resuelve en 10 minutos: cambiar de estrategia y dejar como arranque documentado `docker compose up -d db` + `npm install` + `npm run dev`.
  Commit: `T10 docker app`

- [ ] **T11 Pulido y resistencia a fallos.**
  Aviso "No se pudo conectar con el servidor" con Reintentar; aviso "La base de datos no está disponible" con recuperación automática; responsive; una paleta y una tipografía.
  **Listo cuando:** con `docker compose stop db` la UI muestra el aviso (sin pantalla en blanco) y, al hacer `start db`, se recupera sola; a ~375 px de ancho no hay scroll horizontal; cero errores en consola.
  Commit: `T11 pulido`

- [ ] **T12 README, los tres ejemplos de IA y prueba en carpeta limpia.**
  README corto: qué es, cómo ejecutar (ruta principal y alternativa), `down` frente a `down -v`, decisiones de diseño (enteros, redondeo, algoritmo exacto, por qué hay backend y SQL Server), herramientas de IA usadas, plantillas y librerías declaradas, créditos (imagen de SQL Server). `PROMPTLOG.md` con los tres ejemplos (contexto, prompt, resultado, decisión, evidencia).
  **Listo cuando:** se clona en una carpeta limpia y, siguiendo **solo** el README, la app arranca y `npm test` pasa; no hay secretos en el código ni en el historial de git (`git log -p` sin contraseñas).
  Commit: `T12 readme y entrega`

---

## Orden de recorte (si el tiempo se acaba)

1. T11: conservar solo los avisos de error de conexión; recortar el resto del pulido.
2. T10: solo si la imagen `app` no se construye y no se resuelve en 10 minutos, dejar `db` en Docker + `npm run dev` como arranque documentado.
3. Si SQL Server no arranca en el equipo que presenta: usar `STORAGE=memory` (los datos sobreviven a F5 mientras el servidor siga encendido) y **decirlo en la demo**.
4. **Nunca recortar:** T4 (verificación del mínimo), T9 (demostrar saldos en cero) y T12 (README y los tres ejemplos).

## Si sobra tiempo (solo con el flujo principal verificado)

- Editar un gasto, copiar el plan como texto, dos o tres pruebas end-to-end con Playwright (solo si ya se ha usado antes).

## Prompts base (guía §8, adaptados)

- **Delegar:** *«Tarea T[n] de TASKS.md: [copiar tarea y criterio]. Restricciones: no cambies lo que ya funciona, no agregues dependencias, SQL solo en repo/ con parámetros. Antes de editar, resume en 3 líneas qué vas a cambiar. Al terminar, dime exactamente cómo probarlo.»*
- **Revisar:** *«Revisa tu propio cambio como si fueras un revisor escéptico. Busca errores lógicos, casos límite sin manejar, código que no se usa, SQL sin parametrizar y cualquier cosa que contradiga SPEC.md. Lista los problemas por gravedad y no los corrijas todavía.»*
- **Depurar:** *«Al hacer [acción] ocurre [resultado real] y esperaba [esperado]. Error: [texto completo de la consola o del log del servidor]. Archivo relevante: [nombre]. Explica la causa más probable y cómo la confirmaste antes de proponer un arreglo. Cambia lo mínimo necesario.»*
- **Casos límite:** *«Para la función [nombre], lista 10 entradas que podrían romperla (vacías, muy largas, duplicadas, caracteres raros, montos extremos). Dime cuáles maneja hoy y cuáles no.»*

## Prueba manual mínima antes de la demo (hacerla 3 veces)

1. Flujo completo con el Escenario A: saldos exactos y plan de 4 pagos.
2. Cargar el Escenario B: el plan muestra **3 pagos** (y se puede explicar por qué greedy daría 4).
3. F5 en medio del flujo y cerrar y reabrir la pestaña: los datos siguen.
4. `docker compose down` y `docker compose up -d` (sin `-v`): los datos siguen.
5. Vaciar los datos (`seed` con `empty`) y recargar: estado vacío amigable, sin errores.
6. Entradas malas: vacío, solo espacios, texto muy largo, monto `0`, `-5`, `abc`, `1.5`, nombre repetido, séptimo integrante, comillas y tildes.
7. Apagar `db` (`docker compose stop db`): aviso claro, sin pantalla en blanco; al volver a encenderla, se recupera.
8. Ventana a tamaño de celular.

## Lista final antes de entregar (guía §15)

- [ ] El flujo principal funciona de principio a fin, en vivo.
- [ ] Los datos sobreviven a recargar, a cerrar la pestaña y a reiniciar los contenedores.
- [ ] Errores comunes de entrada muestran mensajes claros.
- [ ] La app arranca en una carpeta limpia siguiendo solo el README.
- [ ] El README tiene instrucciones, créditos de plantillas y librerías, y las herramientas de IA usadas.
- [ ] Los tres ejemplos de trabajo con IA están listos en `PROMPTLOG.md`.
- [ ] Ningún secreto quedó en el código ni en el historial de git (`.env` fuera del repositorio).
- [ ] Plan B listo: video corto o capturas del flujo por si algo falla en vivo.
- [ ] Todos pueden explicar qué hace cada parte y por qué se decidió así.
