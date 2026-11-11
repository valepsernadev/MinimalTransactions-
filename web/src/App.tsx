import { useEffect, useRef, useState, type FormEvent } from 'react'
import * as api from './api'
import { ApiRequestError, type Expense, type Member, type Summary } from './api'

type HealthState = 'checking' | 'ok' | 'down'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
}

function formatAmount(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(value)}`
}

// El front recalcula esta comprobación con los datos recibidos (aplica los
// pagos a los saldos); no confía en un booleano del servidor (SPEC §6). No
// vuelve a correr settle: solo aplica la lista de pagos ya recibida.
function appliedBalancesAreZero(summary: Summary): boolean {
  const remaining = new Map(summary.balances.map((b) => [b.memberId, b.balance]))
  for (const p of summary.payments) {
    remaining.set(p.fromId, (remaining.get(p.fromId) ?? 0) + p.amount)
    remaining.set(p.toId, (remaining.get(p.toId) ?? 0) - p.amount)
  }
  return [...remaining.values()].every((balance) => balance === 0)
}

function App() {
  const [health, setHealth] = useState<HealthState>('checking')

  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  const [memberName, setMemberName] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null)
  const [memberSubmitting, setMemberSubmitting] = useState(false)
  const memberSubmittingRef = useRef(false)

  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expensePayerId, setExpensePayerId] = useState('')
  const [expenseParticipantIds, setExpenseParticipantIds] = useState<number[]>([])
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({})
  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null)
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const expenseSubmittingRef = useRef(false)

  async function refreshAll() {
    const [membersData, expensesData, summaryData] = await Promise.all([
      api.getMembers(),
      api.getExpenses(),
      api.getSummary(),
    ])
    setMembers(membersData)
    setExpenses(expensesData)
    setSummary(summaryData)
  }

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`)
        return res.json()
      })
      .then((data) => setHealth(data.status === 'ok' ? 'ok' : 'down'))
      .catch(() => setHealth('down'))

    refreshAll().catch((err) => setLoadError(errorMessage(err)))
  }, [])

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (memberSubmittingRef.current) return
    memberSubmittingRef.current = true
    setMemberSubmitting(true)
    setMemberError(null)
    setMemberSuccess(null)

    try {
      await api.createMember(memberName)
      setMemberName('')
      setMemberSuccess('Integrante agregado.')
      await refreshAll()
    } catch (err) {
      setMemberError(errorMessage(err))
    } finally {
      memberSubmittingRef.current = false
      setMemberSubmitting(false)
    }
  }

  async function handleDeleteMember(id: number) {
    if (!window.confirm('¿Eliminar este integrante?')) return
    setMemberError(null)
    setMemberSuccess(null)

    try {
      await api.deleteMember(id)
      await refreshAll()
    } catch (err) {
      setMemberError(errorMessage(err))
    }
  }

  function toggleParticipant(id: number) {
    setExpenseParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  function toggleAllParticipants() {
    setExpenseParticipantIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id),
    )
  }

  async function handleAddExpense(event: FormEvent) {
    event.preventDefault()
    if (expenseSubmittingRef.current) return
    expenseSubmittingRef.current = true
    setExpenseSubmitting(true)
    setExpenseErrors({})
    setExpenseSuccess(null)

    try {
      await api.createExpense({
        description: expenseDescription,
        amount: expenseAmount,
        payerId: Number(expensePayerId),
        participantIds: expenseParticipantIds,
      })
      setExpenseDescription('')
      setExpenseAmount('')
      setExpensePayerId('')
      setExpenseParticipantIds([])
      setExpenseSuccess('Gasto agregado.')
      await refreshAll()
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setExpenseErrors({ [err.field ?? 'general']: err.message })
      } else {
        setExpenseErrors({ general: errorMessage(err) })
      }
    } finally {
      expenseSubmittingRef.current = false
      setExpenseSubmitting(false)
    }
  }

  async function handleDeleteExpense(id: number) {
    if (!window.confirm('¿Eliminar este gasto?')) return
    setExpenseErrors({})
    setExpenseSuccess(null)

    try {
      await api.deleteExpense(id)
      await refreshAll()
    } catch (err) {
      setExpenseErrors({ general: errorMessage(err) })
    }
  }

  async function handleSeed(scenario: 'A' | 'B') {
    const confirmText =
      scenario === 'A'
        ? '¿Restablecer los datos de ejemplo? Se reemplazan todos los datos actuales.'
        : '¿Cargar el escenario de prueba B? Se reemplazan todos los datos actuales.'
    if (!window.confirm(confirmText)) return

    setSeedError(null)
    try {
      await api.seed(scenario)
      await refreshAll()
    } catch (err) {
      setSeedError(errorMessage(err))
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <h1>Minimal Transactions</h1>
        <p className="app-subtitle">Divide gastos y salda deudas con el mínimo de pagos</p>
      </header>

      <main className="container">
        {health === 'checking' && <div className="banner banner-info">Verificando conexión con la API…</div>}
        {health === 'ok' && <div className="banner banner-ok">API conectada ✓</div>}
        {health === 'down' && <div className="banner banner-error">No se pudo conectar con el servidor</div>}
        {loadError && <div className="banner banner-error">{loadError}</div>}

        <div className="layout">
          <div className="column">
            <section className="card">
              <h2>Integrantes</h2>
              {members.length === 0 ? (
                <p className="empty-state">No hay integrantes todavía.</p>
              ) : (
                <ul className="list">
                  {members.map((m) => (
                    <li key={m.id} className="list-item">
                      <span>{m.name}</span>
                      <button type="button" className="btn-delete" onClick={() => handleDeleteMember(m.id)}>
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form className="form" onSubmit={handleAddMember}>
                <div className="field">
                  <label htmlFor="member-name">Nombre</label>
                  <input
                    id="member-name"
                    className={memberError ? 'input-error' : ''}
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                  />
                  {memberError && <p className="field-error">{memberError}</p>}
                </div>
                {memberSuccess && <p className="success">{memberSuccess}</p>}
                <button type="submit" className="btn-primary" disabled={memberSubmitting}>
                  Agregar
                </button>
              </form>
            </section>

            <section className="card">
              <h2>Gastos</h2>
              {expenses.length === 0 ? (
                <p className="empty-state">No hay gastos todavía.</p>
              ) : (
                <ul className="list">
                  {expenses.map((e) => (
                    <li key={e.id} className="list-item">
                      <div className="list-item-main">
                        <span className="list-item-title">{e.description}</span>
                        <span className="list-item-meta">
                          {formatAmount(e.amount)} · pagó{' '}
                          {members.find((m) => m.id === e.payerId)?.name ?? e.payerId}
                        </span>
                      </div>
                      <button type="button" className="btn-delete" onClick={() => handleDeleteExpense(e.id)}>
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form className="form" onSubmit={handleAddExpense}>
                <div className="field">
                  <label htmlFor="expense-description">Descripción</label>
                  <input
                    id="expense-description"
                    className={expenseErrors.description ? 'input-error' : ''}
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                  />
                  {expenseErrors.description && <p className="field-error">{expenseErrors.description}</p>}
                </div>

                <div className="field">
                  <label htmlFor="expense-amount">Monto</label>
                  <input
                    id="expense-amount"
                    className={expenseErrors.amount ? 'input-error' : ''}
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                  {expenseErrors.amount && <p className="field-error">{expenseErrors.amount}</p>}
                </div>

                <div className="field">
                  <label htmlFor="expense-payer">Quién pagó</label>
                  <select
                    id="expense-payer"
                    className={expenseErrors.payerId ? 'input-error' : ''}
                    value={expensePayerId}
                    onChange={(e) => setExpensePayerId(e.target.value)}
                  >
                    <option value="">Selecciona...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {expenseErrors.payerId && <p className="field-error">{expenseErrors.payerId}</p>}
                </div>

                <fieldset className="participants">
                  <legend>Participantes</legend>
                  <div className="chip-group">
                    <label className="chip">
                      <input
                        type="checkbox"
                        checked={members.length > 0 && expenseParticipantIds.length === members.length}
                        onChange={toggleAllParticipants}
                      />
                      Todos
                    </label>
                    {members.map((m) => (
                      <label key={m.id} className="chip">
                        <input
                          type="checkbox"
                          checked={expenseParticipantIds.includes(m.id)}
                          onChange={() => toggleParticipant(m.id)}
                        />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {expenseErrors.participantIds && <p className="field-error">{expenseErrors.participantIds}</p>}
                {expenseErrors.general && <p className="field-error">{expenseErrors.general}</p>}
                {expenseSuccess && <p className="success">{expenseSuccess}</p>}

                <button type="submit" className="btn-primary" disabled={expenseSubmitting}>
                  Agregar gasto
                </button>
              </form>
            </section>
          </div>

          <div className="column">
            <section className="card">
              <h2>Saldos</h2>
              {summary && summary.balances.length > 0 && (
                <ul className="list">
                  {summary.balances.map((b) => (
                    <li
                      key={b.memberId}
                      className={`balance-row ${
                        b.balance > 0 ? 'balance-positive' : b.balance < 0 ? 'balance-negative' : 'balance-zero'
                      }`}
                    >
                      <span className="balance-name">{b.name}</span>
                      <span className="balance-amount">
                        {b.balance > 0 && <>le deben {formatAmount(b.balance)}</>}
                        {b.balance < 0 && <>debe {formatAmount(-b.balance)}</>}
                        {b.balance === 0 && <>sin pendientes</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {summary && summary.balances.length === 0 && (
                <p className="empty-state">Todavía no hay saldos para mostrar.</p>
              )}
            </section>

            <section className="card">
              <h2>Plan de pagos</h2>
              {summary && summary.payments.length === 0 && (
                <p className="empty-state">Todo saldado, no hay pagos pendientes.</p>
              )}
              {summary && summary.payments.length > 0 && (
                <>
                  <ul className="list">
                    {summary.payments.map((p, i) => {
                      const from = summary.balances.find((b) => b.memberId === p.fromId)?.name ?? p.fromId
                      const to = summary.balances.find((b) => b.memberId === p.toId)?.name ?? p.toId
                      return (
                        <li key={i} className="payment-row">
                          <span className="payment-text">
                            {from} paga {formatAmount(p.amount)} a {to}
                          </span>
                          <span className="payment-arrow" aria-hidden="true">
                            →
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="payments-count">{summary.payments.length} pagos (mínimo)</p>
                </>
              )}
              {summary && (
                <span className={`badge ${appliedBalancesAreZero(summary) ? 'badge-ok' : 'badge-error'}`}>
                  {appliedBalancesAreZero(summary) ? 'Saldos en cero ✓' : 'Saldos en cero ✗'}
                </span>
              )}

              <details>
                <summary>¿Cómo sabemos que es el mínimo?</summary>
                <p>
                  Cada componente conexa del grafo de pagos es un conjunto de personas cuyos saldos suman
                  0, y con <em>k</em> personas necesita al menos <em>k − 1</em> pagos. El total es al menos{' '}
                  <em>n − (nº de componentes)</em>. Maximizar el número de grupos de suma cero minimiza los
                  pagos, y la DP explora todas las particiones.
                </p>
              </details>

              <div className="seed-actions">
                <button type="button" className="btn-secondary" onClick={() => handleSeed('A')}>
                  Restablecer datos de ejemplo
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleSeed('B')}>
                  Cargar escenario de prueba (B)
                </button>
              </div>
              {seedError && <p className="field-error">{seedError}</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
