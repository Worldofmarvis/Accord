import { useEffect, useState } from 'react'

type State<T> = { data: T | undefined; error: unknown; loading: boolean }

/**
 * Load something once, and again whenever `deps` change or `reload()` is called.
 * While reloading, the previous `data` stays available so the screen doesn't flash empty.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: undefined, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: undefined }))
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: undefined, loading: false })
      },
      (error: unknown) => {
        if (!cancelled) setState((s) => ({ ...s, error, loading: false }))
      },
    )
    return () => {
      cancelled = true
    }
    // `load` is a new function on every render, so only the caller's `deps` and a manual reload re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  return { ...state, reload: () => setAttempt((n) => n + 1) }
}
