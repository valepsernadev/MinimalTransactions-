import { useEffect, useRef, useState, type FormEvent } from 'react'
import * as api from './api'
import { ApiRequestError, type Expense, type Member, type Summary } from './api'

type HealthState = 'checking' | 'ok' | 'down'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
}

function App() {
  const [health, setHealth] = useState<HealthState>('checking')

  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [, setSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  return (
    <main>
      <h1>Minimal Transactions</h1>
      {health === 'checking' && <p>Verificando conexión con la API…</p>}
      {health === 'ok' && <p className="status-ok">API conectada ✓</p>}
      {health === 'down' && <p className="status-down">No se pudo conectar con el servidor</p>}
      {loadError && <p className="status-down">{loadError}</p>}

      <section>
        <h2>Integrantes</h2>
        {members.length === 0 ? (
          <p>No hay integrantes todavía.</p>
        ) : (
          <ul>
            {members.map((m) => (
              <li key={m.id}>
                {m.name}{' '}
                <button type="button" onClick={() => handleDeleteMember(m.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddMember}>
          <label htmlFor="member-name">Nombre</label>
          <input
            id="member-name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
          {memberError && <p className="field-error">{memberError}</p>}
          {memberSuccess && <p className="success">{memberSuccess}</p>}
          <button type="submit" disabled={memberSubmitting}>
            Agregar
          </button>
        </form>
      </section>

      <section>
        <h2>Gastos</h2>
        {expenses.length === 0 ? (
          <p>No hay gastos todavía.</p>
        ) : (
          <ul>
            {expenses.map((e) => (
              <li key={e.id}>
                {e.description} — {e.amount} (pagó{' '}
                {members.find((m) => m.id === e.payerId)?.name ?? e.payerId}){' '}
                <button type="button" onClick={() => handleDeleteExpense(e.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddExpense}>
          <label htmlFor="expense-description">Descripción</label>
          <input
            id="expense-description"
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
          />
          {expenseErrors.description && <p className="field-error">{expenseErrors.description}</p>}

          <label htmlFor="expense-amount">Monto</label>
          <input
            id="expense-amount"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
          />
          {expenseErrors.amount && <p className="field-error">{expenseErrors.amount}</p>}

          <label htmlFor="expense-payer">Quién pagó</label>
          <select
            id="expense-payer"
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

          <fieldset>
            <legend>Participantes</legend>
            <label>
              <input
                type="checkbox"
                checked={members.length > 0 && expenseParticipantIds.length === members.length}
                onChange={toggleAllParticipants}
              />
              Todos
            </label>
            {members.map((m) => (
              <label key={m.id}>
                <input
                  type="checkbox"
                  checked={expenseParticipantIds.includes(m.id)}
                  onChange={() => toggleParticipant(m.id)}
                />
                {m.name}
              </label>
            ))}
          </fieldset>
          {expenseErrors.participantIds && <p className="field-error">{expenseErrors.participantIds}</p>}
          {expenseErrors.general && <p className="field-error">{expenseErrors.general}</p>}
          {expenseSuccess && <p className="success">{expenseSuccess}</p>}

          <button type="submit" disabled={expenseSubmitting}>
            Agregar gasto
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
