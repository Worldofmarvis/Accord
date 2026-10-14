import { API_URL } from './config'
import { ApiError, type ApiErrorCode } from './errors'
import { getUserId } from './session'

const KNOWN_CODES: ApiErrorCode[] = [
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'SELLER_LOCKED',
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
 * - Sends the signed-in demo user in the X-User-Id header (see session.ts).
 * - Turns an error body into an ApiError. Both shapes are accepted: { error: "text" } (the back end
 *   today) and { error: { code, message } } (docs/API.md).
 */
export async function request<T>(path: string, { method = 'GET', query, body }: Options = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  const url = `${API_URL}${path}${qs ? `?${qs}` : ''}`

  const userId = getUserId()
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', "We can't reach the server.")
  }

  if (!res.ok) {
    let raw: { error?: unknown } | null = null
    try {
      raw = await res.json()
    } catch {
      // The body was not JSON (for example a proxy error page, or a route the server doesn't have yet).
    }
    const err = raw?.error
    const detail = err && typeof err === 'object' ? (err as { code?: unknown; message?: unknown }) : null
    const text = typeof err === 'string' ? err : typeof detail?.message === 'string' ? detail.message : ''
    const message =
      text ||
      (res.status === 404 && raw === null
        ? 'This part of the server is not available yet.'
        : `The server returned an error (${res.status}).`)
    throw new ApiError(res.status, codeFor(res.status, detail?.code), message)
  }

  if (res.status === 204) return undefined as T
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError(res.status, 'UNKNOWN', 'The server sent an unreadable response.')
  }
}
