import { useCallback, useEffect, useState } from 'react'
import { apiRequest, type DbCheckResponse, type HealthResponse } from './api.ts'

type CheckState =
  | { kind: 'pending' }
  | { kind: 'ok'; detail: string }
  | { kind: 'error'; detail: string }

const pending: CheckState = { kind: 'pending' }

function StatusRow({ label, state }: { label: string; state: CheckState }) {
  const text = state.kind === 'pending' ? 'Checking…' : state.kind === 'ok' ? 'Connected' : 'Not connected'
  return (
    <li className={`check check--${state.kind}`}>
      <span className="check__dot" aria-hidden="true" />
      <div>
        <p className="check__label">
          {label}: <strong>{text}</strong>
        </p>
        {state.kind !== 'pending' && <p className="check__detail">{state.detail}</p>}
      </div>
    </li>
  )
}

export default function App() {
  const [backend, setBackend] = useState<CheckState>(pending)
  const [database, setDatabase] = useState<CheckState>(pending)

  const runChecks = useCallback(async () => {
    setBackend(pending)
    setDatabase(pending)

    try {
      const health = await apiRequest<HealthResponse>('/health')
      setBackend({ kind: 'ok', detail: `${health.service} (${health.environment}) answered at ${new Date(health.time).toLocaleTimeString()}` })
    } catch (error) {
      setBackend({ kind: 'error', detail: (error as Error).message })
      setDatabase({ kind: 'error', detail: 'Skipped because the backend is not reachable.' })
      return
    }

    try {
      const db = await apiRequest<DbCheckResponse>('/health/db', { method: 'POST' })
      setDatabase({
        kind: 'ok',
        detail: `Wrote and read a test document in “${db.database}” in ${db.roundTripMs} ms.`,
      })
    } catch (error) {
      setDatabase({ kind: 'error', detail: (error as Error).message })
    }
  }, [])

  useEffect(() => {
    void runChecks()
  }, [runChecks])

  return (
    <main className="page">
      <header>
        <p className="eyebrow">Moves · local setup</p>
        <h1>Is everything talking to each other?</h1>
        <p className="lead">
          This page is the Milestone 2 check. The app runs on Vite, asks the Express backend through the
          <code>/api</code> proxy, and the backend writes and reads one test document in MongoDB.
        </p>
      </header>

      <ul className="checks" aria-live="polite">
        <StatusRow label="Frontend" state={{ kind: 'ok', detail: 'You are looking at it.' }} />
        <StatusRow label="Backend" state={backend} />
        <StatusRow label="Database" state={database} />
      </ul>

      <button type="button" className="button" onClick={() => void runChecks()}>
        Run the checks again
      </button>
    </main>
  )
}
