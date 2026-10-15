import { API_URL } from './config'
import { ApiError, type ApiErrorCode } from './errors'

const KNOWN_CODES: ApiErrorCode[] = [
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'SELLER_LOCKED',
  'REQUEST_LOCKED',
  'ROUND_LIMIT',
  'UNAUTHENTICATED',
]

function codeFor(status: number, raw: unknown): ApiErrorCode {
  if (typeof raw === 'string' && (KNOWN_CODES as string[]).includes(raw)) return raw as ApiErrorCode
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'SELLER_LOCKED'
  if (status === 400 || status === 422) return 'VALIDATION'
  return 'UNKNOWN'
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT'
  /** Query string values. Empty and undefined values are left out. */
  query?: Record<string, string | number | null | undefined>
  /** JSON body. */
  body?: unknown
}

/**
 * One place for every real server call.
 * - Sends the session cookie (credentials: "include").
 * - Turns the error shape from docs/API.md into an ApiError.
 */
export async function request<T>(path: string, { method = 'GET', query, body }: Options = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  const url = `${API_URL}${path}${qs ? `?${qs}` : ''}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', "We can't reach the server.")
  }

  if (!res.ok) {
    let raw: { error?: { code?: unknown; message?: unknown } } | null = null
    try {
      raw = await res.json()
    } catch {
      // The body was not JSON (for example a proxy error page).
    }
    const message =
      typeof raw?.error?.message === 'string' && raw.error.message
        ? raw.error.message
        : `The server returned an error (${res.status}).`
    throw new ApiError(res.status, codeFor(res.status, raw?.error?.code), message)
  }

  if (res.status === 204) return undefined as T
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError(res.status, 'UNKNOWN', 'The server sent an unreadable response.')
  }
}
