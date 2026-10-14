// Error codes the API can return. Keep in sync with docs/API.md.
export type ApiErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'SELLER_LOCKED'
  | 'REQUEST_LOCKED'
  | 'ROUND_LIMIT'
  | 'UNAUTHENTICATED'
  | 'NETWORK' // the request never reached the server
  | 'UNKNOWN' // anything else, for example a 500

export class ApiError extends Error {
  status: number
  code: ApiErrorCode

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** A readable message for any error, safe to show to the user. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK') return "We can't reach the server. Check your connection and try again."
    if (error.code === 'UNAUTHENTICATED') return 'Please sign in to continue.'
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

/** True when retrying the same request cannot help (so polling should stop). */
export function isFinalError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN' || error.code === 'UNAUTHENTICATED')
  )
}
