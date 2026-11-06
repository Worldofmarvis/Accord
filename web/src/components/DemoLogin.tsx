import { listDemoUsers } from '../api/demoUsers'
import { setUserId } from '../api/session'
import { useAsync } from '../hooks/useAsync'
import { ErrorCard, LoadingCard } from './StateCards'

/**
 * Demo sign-in. The back end has no login yet: it trusts an X-User-Id header, so the person
 * just picks who they are. The choice belongs to this browser tab only (see api/session.ts).
 */
export default function DemoLogin({ onChosen }: { onChosen: () => void }) {
  const users = useAsync(listDemoUsers, [])

  if (users.error != null && !users.data) return <ErrorCard error={users.error} onRetry={users.reload} />
  if (!users.data) return <LoadingCard label="Loading demo users..." />

  return (
    <section className="card demo-login" aria-label="Choose a demo user">
      <h1>Choose who you are</h1>
      <p className="muted">
        This is a demo sign-in for the sandbox. Open a second tab or window to be a buyer and a seller at the same time.
      </p>
      {users.data.length === 0 && <p className="muted">No demo users found. Check that the back end is running.</p>}
      <ul>
        {users.data.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => {
                setUserId(u.id)
                onChosen()
              }}
            >
              <span>{u.name}</span>
              <span className="muted">{u.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
