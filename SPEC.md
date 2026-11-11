# SPEC: Minimal Transactions

## 1. Problema

Un grupo de hasta 6 personas comparte gastos (viajes, apartamento, salidas). Cada gasto lo paga una persona y se divide entre varias. Al final nadie sabe quién le debe a quién. La app calcula el saldo neto de cada persona y propone **el menor número posible de pagos** para dejar todas las cuentas en cero.

## 2. Decisión de arquitectura

```
Frontend  React + Vite + TypeScript     formularios, saldos, plan de pagos
   │  HTTP / JSON  (/api)
Backend   Fastify + TypeScript          API de gastos (CRUD + validación) + motor de cálculo
   │  consultas parametrizadas
SQL Server 2022 (Docker)                volumen Docker → los datos persisten
```

- **Un solo backend, una sola aplicación de servidor.** **Toda la aplicación corre en Docker** con `docker compose up --build`: el contenedor `db` (SQL Server) y el contenedor `app` (API Fastify + front compilado de `web/dist`). Son dos contenedores y una sola URL, sin CORS. En desarrollo, Vite sirve el front y reenvía `/api` a Fastify.
- **Un solo grupo implícito**: sin tabla de grupos y sin inicio de sesión (opcionales según el reto).
- **El motor de cálculo vive solo en el servidor** (`server/src/domain`). El front no duplica el algoritmo.
- **Sin ORM ni migraciones**: un script SQL idempotente al arrancar.

**Por qué se decidió así:** el equipo amplió el alcance con backend y base de datos. **Compromisos que se aceptan** (la guía recomienda empezar solo con frontend y pasar a backend solo si el reto lo exige o si el flujo ya está verificado):
- Hay más piezas que pueden fallar en vivo (Docker, SQL Server, red local).
- Se mitiga así: (1) el dominio es puro y se verifica **sin Docker** antes que nada; (2) el repositorio tiene una implementación en memoria (`STORAGE=memory`) para tests y como salvavidas de la demo (los datos sobreviven a F5 mientras el servidor siga encendido); (3) el README documenta el arranque de desarrollo `docker compose up -d db` + `npm run dev` (la base sigue en Docker) como alternativa si falla la construcción de la imagen `app`; (4) se prepara un plan B con video o capturas.
- **No hay despliegue público**: SQL Server necesita ~2 GB de RAM y los planes gratuitos de la guía no lo cubren (Railway gratis: 0,5 GB). La versión local con Docker es la entrega.

## 3. Requisitos del reto (copiados del enunciado)

- [ ] Registrar integrantes del grupo (hasta **6**).
- [ ] Registrar gastos: descripción, monto, persona que pagó y participantes entre quienes se divide.
- [ ] Dividir cada gasto en **partes iguales** entre los participantes seleccionados.
- [ ] Mostrar el **saldo neto** de cada persona.
- [ ] Generar un plan que indique **quién paga a quién y cuánto**.
- [ ] Una sola moneda. Pagos permitidos entre **cualquier par** de integrantes.
- [ ] Manejar el **redondeo de forma consistente** para que los totales cuadren.
- [ ] El plan usa el **mínimo absoluto** de pagos (no solo reducir su cantidad).
- [ ] Demostrar que los pagos dejan todos los saldos en cero.
- [ ] Explicar brevemente cómo se verificó que la cantidad de pagos es mínima.
- [ ] Los datos se conservan al recargar la página.
- [ ] Datos personales ficticios en las demostraciones.

## 4. Flujo principal (lo que se demuestra en vivo)

1. El usuario abre la app y ve los datos de ejemplo (o agrega 5 integrantes).
2. Registra gastos pagados por distintas personas, con distintos participantes.
3. La app muestra el saldo neto de cada persona (positivo = le deben, negativo = debe).
4. La app muestra el plan: "Camila paga $132.000 a Valeria".
5. Un indicador confirma "Saldos en cero ✓ tras aplicar los pagos" y "N pagos (mínimo)".
6. Recarga con F5, cierra y reabre la pestaña, y reinicia los contenedores: todo sigue ahí.

## 5. Reglas de dominio (`server/src/domain`, TypeScript puro)

### 5.1 Dinero
- Montos como **entero en unidades mínimas**. Constante `DECIMALS` en `money.ts`: `0` para COP (por defecto).
- La API recibe el monto **como texto tal cual lo escribió el usuario** y `parseAmount` lo valida; las respuestas devuelven enteros. Se acepta `1500` y `1.500`. Los puntos solo valen como separador de miles (grupos de 3 dígitos): `1.5` se rechaza. Se rechaza vacío, solo espacios, cero, negativo, texto, notación científica y decimales si `DECIMALS = 0`.
- Máximo `999.999.999` (cabe en `INT`). El front formatea con `Intl.NumberFormat('es-CO')` y símbolo `$`.

### 5.2 División de un gasto (redondeo)
Gasto de `M` entre `k` participantes:
1. Ordenar participantes por **`Id` ascendente del integrante** (orden fijo y determinista).
2. `base = floor(M / k)`, `r = M mod k`.
3. Cada participante paga `base`; los **primeros `r`** pagan `base + 1`. La suma de las partes es **exactamente `M`**.

El pagador puede o no estar entre los participantes.

### 5.3 Saldo neto
`saldo(p) = total pagado por p − total que le corresponde a p`. Positivo: le deben. Negativo: debe. **La suma de todos los saldos es exactamente 0.**

### 5.4 Plan de pagos (mínimo absoluto, exacto para n ≤ 6)
1. Descartar saldos en 0. Sea `n` el número restante.
2. Para cada subconjunto (máscara de bits), calcular la suma de sus saldos.
3. `dp[mask] = max(dp[mask sin i]) + (suma[mask] == 0 ? 1 : 0)`. Así `dp[todos]` es el **máximo número de grupos disjuntos de suma cero**.
4. Reconstruir los grupos. En cada grupo de `k` personas, emparejar deudores y acreedores (mayor deudor paga al mayor acreedor) da exactamente `k − 1` pagos.
5. Total de pagos = `n − nº de grupos`. Salida: `{ fromId, toId, amount }[]`, con `amount > 0`.
6. Desempates por `Id` ascendente, para que el mismo estado produzca siempre el mismo plan.

**Por qué es el mínimo (texto para el jurado y para el panel de la app):** cada componente conexa del grafo de pagos es un conjunto de personas cuyos saldos suman 0, y con `k` personas necesita al menos `k − 1` pagos. El total es al menos `n − (nº de componentes)`. Maximizar el número de grupos de suma cero minimiza los pagos, y la DP explora todas las particiones.

## 6. Verificación del mínimo

- **Invariantes (también en la app):** suma de saldos = 0; al aplicar los pagos, todos los saldos quedan en 0. **El front recalcula esta comprobación con los datos recibidos** (aplica los pagos a los saldos); no confía en un booleano del servidor.
- **Oráculo de fuerza bruta (tests):** enumera todas las particiones del conjunto con saldo (Bell(6) = 203) sin usar la DP. Debe coincidir con `settle`.
- **Test aleatorio:** ≥ 5.000 casos de 2 a 6 personas, semilla fija; invariantes cumplidos y `settle` = oráculo.
- **Comparador voraz (solo en tests, nunca en la app):** mayor acreedor ↔ mayor deudor; empates → primero en orden de `Id`.
- **Contraejemplo fijo (Escenario B):** mínimo real = **3 pagos**; greedy = **4** (verificado ejecutando ambos algoritmos). El test afirma los dos valores.

## 7. Datos

### 7.1 Esquema SQL Server (`server/src/db/schema.sql`, idempotente)

```sql
CREATE TABLE dbo.Members (
  Id   INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(20) NOT NULL,
  CONSTRAINT UQ_Members_Name UNIQUE (Name)            -- la intercalación por defecto no distingue mayúsculas
);
CREATE TABLE dbo.Expenses (
  Id          INT IDENTITY(1,1) PRIMARY KEY,
  Description NVARCHAR(60) NOT NULL,
  Amount      INT NOT NULL CONSTRAINT CK_Expenses_Amount CHECK (Amount BETWEEN 1 AND 999999999),
  PayerId     INT NOT NULL CONSTRAINT FK_Expenses_Payer REFERENCES dbo.Members(Id),
  CreatedAt   DATETIME2 NOT NULL CONSTRAINT DF_Expenses_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE TABLE dbo.ExpenseParticipants (
  ExpenseId INT NOT NULL REFERENCES dbo.Expenses(Id) ON DELETE CASCADE,
  MemberId  INT NOT NULL REFERENCES dbo.Members(Id),
  CONSTRAINT PK_ExpenseParticipants PRIMARY KEY (ExpenseId, MemberId)
);
```

- El orden de integrantes es **`ORDER BY Id`**. No se reinicia el identity al re-sembrar: basta el orden relativo.
- Máximo 6 integrantes: lo impone la API dentro de una transacción (un `CHECK` no puede contar filas).
- Eliminar un integrante usado como pagador o participante lo impiden las FK; la API lo comprueba antes para dar un mensaje claro.

### 7.2 Tipos (API)

```ts
type Member  = { id: number; name: string };
type Expense = { id: number; description: string; amount: number; payerId: number; participantIds: number[] };
type Payment = { fromId: number; toId: number; amount: number };
```

### 7.3 Datos de ejemplo (`server/src/db/seed.ts`; también fixtures de tests)

**Escenario A**, el que se carga la primera vez (COP). Integrantes en este orden: Valeria, Andrés, Camila, Mateo, Sofía.

| Gasto | Monto | Pagó | Participantes |
|---|---|---|---|
| Hospedaje cabaña | 600.000 | Valeria | los 5 |
| Mercado | 185.000 | Andrés | los 5 |
| Transporte | 90.000 | Camila | Camila, Mateo, Sofía |
| Cena | 100.000 | Mateo | Valeria, Mateo, Sofía |
| Entradas parque | 140.000 | Sofía | Valeria, Andrés, Camila, Sofía |

**Resultados esperados (verificados con código):**
- Saldos: Valeria **+374.666**, Andrés **−7.000**, Camila **−132.000**, Mateo **−120.333**, Sofía **−115.333**. Suma = 0.
- Redondeo: "Cena" = 100.000 / 3 → 33.333 con resto 1; el resto lo paga Valeria (primera en el orden): Valeria 33.334, Mateo 33.333, Sofía 33.333.
- Plan: **4 pagos**, todos hacia Valeria (Camila 132.000, Mateo 120.333, Sofía 115.333, Andrés 7.000). Es un solo grupo de suma cero, así que 4 es el mínimo.

**Escenario B**, contraejemplo para greedy. Integrantes: Andrés, Beatriz, Camilo, Daniela, Esteban.

| Gasto | Monto | Pagó | Participantes |
|---|---|---|---|
| Alquiler equipos | 60.000 | Esteban | Esteban, Daniela |
| Taxi aeropuerto | 40.000 | Beatriz | Andrés, Beatriz |
| Almuerzo | 40.000 | Camilo | Andrés, Camilo |

Saldos verificados: Andrés −40.000, Beatriz +20.000, Camilo +20.000, Daniela −30.000, Esteban +30.000. **Mínimo = 3 pagos** (grupos {Daniela, Esteban} y {Andrés, Beatriz, Camilo}); **greedy = 4**.

## 8. Contrato de API (JSON, todas las rutas bajo `/api`)

| Método y ruta | Cuerpo | Éxito | Errores |
|---|---|---|---|
| `GET /health` | – | 200 `{ status:"ok", db:"up" }` | 503 `DB_UNAVAILABLE` |
| `GET /members` | – | 200 `Member[]` (orden `Id`) | – |
| `POST /members` | `{ name }` | 201 `Member` | 400 `VALIDATION` · 409 `DUPLICATE_NAME` · 409 `MAX_MEMBERS` |
| `DELETE /members/:id` | – | 204 | 404 `NOT_FOUND` · 409 `MEMBER_IN_USE` |
| `GET /expenses` | – | 200 `Expense[]` | – |
| `POST /expenses` | `{ description, amount: string, payerId, participantIds }` | 201 `Expense` | 400 `VALIDATION` (con `field`) |
| `DELETE /expenses/:id` | – | 204 | 404 `NOT_FOUND` |
| `GET /summary` | – | 200 `{ balances: { memberId, name, balance }[], payments: Payment[] }` | – |
| `POST /seed` | `{ scenario: "A" \| "B" \| "empty" }` | 200 `{ members, expenses }` (cantidades) | 400 `VALIDATION` |

Error: `{ "error": { "code": "VALIDATION", "message": "El monto debe ser mayor que cero.", "field": "amount" } }`. Códigos: `VALIDATION` 400 · `NOT_FOUND` 404 · `DUPLICATE_NAME`, `MAX_MEMBERS`, `MEMBER_IN_USE` 409 · `DB_UNAVAILABLE` 503 · `INTERNAL` 500 (mensaje genérico, sin detalle interno). IDs no numéricos → 404. Participantes repetidos en la petición se ignoran; participantes o pagador inexistentes → 400.

`POST /seed` reemplaza **todos** los datos dentro de una transacción (la UI pide confirmación antes).

## 9. Configuración y ejecución

**`.env.example`** (el `.env` real no se sube):
```
MSSQL_SA_PASSWORD=      # ≥ 8 caracteres con mayúscula, minúscula, número y símbolo; evitar el carácter $
DB_HOST=localhost       # en Docker Compose lo fija el compose a "db"
DB_PORT=1433
DB_NAME=MinimalTx
PORT=3000
STORAGE=sqlserver       # "memory" = sin Docker (tests / salvavidas); no es la configuración de entrega
```

**Qué corre en Docker** (`docker compose up --build`):

| Servicio | Imagen | Contiene | Puerto | Datos |
|---|---|---|---|---|
| `db` | `mcr.microsoft.com/mssql/server:2022-latest` | SQL Server (edición Developer) | 1433 | volumen `mssql-data:/var/opt/mssql` |
| `app` | se construye con el `Dockerfile` de la raíz | API Fastify + front compilado | 3000 | sin estado |

- **`db`:** `ACCEPT_EULA=Y`, `MSSQL_PID=Developer`, `MSSQL_SA_PASSWORD` tomada de `.env`, `restart: unless-stopped`.
- **`app`:** `depends_on: db`, `DB_HOST=db`, `STORAGE=sqlserver`, `MSSQL_SA_PASSWORD` desde `.env`, `restart: unless-stopped`. Los reintentos de conexión del arranque cubren el tiempo que tarda SQL Server en estar listo.
- **`Dockerfile` multi-etapa:** (1) `npm ci` y `npm run build` compilan `web` y `server`; (2) imagen final de Node LTS con solo las dependencias de producción de `server`, `server/dist` y `web/dist`, que ejecuta `node`.
- **`.dockerignore`:** `node_modules`, `dist`, `.env`, `.git`, para que la imagen no arrastre secretos ni dependencias del equipo.
- **Desarrollo con recarga en caliente:** `docker compose up -d db` (solo la base en Docker) más `npm run dev`. Es la alternativa, no el arranque de entrega.
- Crédito en el README: imagen de SQL Server de Microsoft, edición Developer, uso no productivo.

**Arranque del servidor (`db/`):**
1. Si no conecta, reintenta cada 2 s hasta 60 s (SQL Server tarda 20–40 s en frío) y registra "Esperando a SQL Server…". `depends_on` no espera a que esté listo; los reintentos sí.
2. Crea la base `MinimalTx` si no existe.
3. Si la tabla `dbo.Members` **no existe**: crea el esquema y carga el Escenario A (solo la primera vez, así vaciar los datos a propósito no los re-siembra al reiniciar). Si existe: registra "Esquema existente; sin cambios".
4. Conexión local con `trustServerCertificate: true` (solo desarrollo local).

**Persistencia (qué la rompe):** `docker compose down` conserva los datos; **`docker compose down -v` los borra**. Documentarlo en el README.

## 10. Interfaz (español)

Una sola pantalla con cuatro bloques:
1. **Integrantes:** lista, campo para agregar (máx. 6), eliminar con confirmación.
2. **Gastos:** formulario (descripción, monto, quién pagó, casillas de participantes con "Todos") y lista con eliminar con confirmación.
3. **Saldos:** tarjeta por persona; positivo/negativo diferenciados por color **y** por texto ("le deben" / "debe").
4. **Plan de pagos:** lista "X paga $N a Y", indicador "Saldos en cero ✓", "N pagos (mínimo)" y panel plegable "¿Cómo sabemos que es el mínimo?" con el texto de §5.4.

Además: "Restablecer datos de ejemplo" y "Cargar escenario de prueba (B)", ambos con confirmación. Estado de la API visible (aviso si no hay conexión). Después de cada operación se vuelve a pedir `members`, `expenses` y `summary` (sin librerías de estado).

**Comportamiento de UX (guía §11):** cada campo con etiqueta y mensaje de error junto al campo (el texto viene de la API); botón de envío deshabilitado mientras la petición está en curso; mensaje de éxito visible tras crear o eliminar; estados vacíos con mensaje y botón de acción; una paleta, una tipografía, espaciado constante; usable en pantalla grande y a ~375 px.

## 11. Casos de error a manejar

- Integrante: vacío, solo espacios, repetido (sin distinguir mayúsculas), más de 20 caracteres, séptimo integrante, eliminar uno usado en un gasto.
- Gasto: descripción vacía o de más de 60 caracteres; monto vacío, cero, negativo, no numérico, con formato inválido o sobre el máximo; ningún participante; pagador o participante inexistente; menos de 2 integrantes registrados.
- Todos los saldos en cero: "Todo saldado, no hay pagos pendientes" (no una lista vacía).
- Sin gastos o sin integrantes: estado vacío con mensaje y botón.
- **API inaccesible** o respuesta no JSON: aviso "No se pudo conectar con el servidor" con botón Reintentar; la app no se rompe.
- **SQL Server caído o arrancando:** `/health` responde 503; la UI muestra "La base de datos no está disponible" y se recupera sola al volver.
- Doble clic en enviar: no crea duplicados.
- Texto del usuario con comillas, tildes, emojis o intentos de inyección SQL: se guarda y se muestra como texto; nunca rompe la consulta.

## 12. Fuera de alcance (solo si sobra tiempo y el flujo está verificado)

- Editar un gasto (hoy: eliminar y volver a crear), copiar el plan como texto, pruebas end-to-end con Playwright.
- Varios grupos, inicio de sesión, varias monedas, división desigual o por porcentajes, más de 6 personas, IA dentro de la app, ORM o herramienta de migraciones, login de BD con permisos mínimos, despliegue público.
