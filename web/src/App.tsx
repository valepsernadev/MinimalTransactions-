import { useEffect, useState } from 'react'

type ApiState = 'checking' | 'ok' | 'down'

function App() {
  const [apiState, setApiState] = useState<ApiState>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`)
        return res.json()
      })
      .then((data) => setApiState(data.status === 'ok' ? 'ok' : 'down'))
      .catch(() => setApiState('down'))
  }, [])

  return (
    <main>
      <h1>Minimal Transactions</h1>
      {apiState === 'checking' && <p>Verificando conexión con la API…</p>}
      {apiState === 'ok' && <p className="status-ok">API conectada ✓</p>}
      {apiState === 'down' && (
        <p className="status-down">No se pudo conectar con el servidor</p>
      )}
    </main>
  )
}

export default App
