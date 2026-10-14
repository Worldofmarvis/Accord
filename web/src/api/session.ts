// Demo sign-in: the back end identifies the caller by an X-User-Id header (backend/openapi.yaml).
// The id lives in sessionStorage, so each browser tab is its own person. That is what lets one tab be
// a buyer and another tab a seller. Opening any page with ?as=3 picks user 3 for that tab.
const KEY = 'accord.userId'

export function getUserId(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('as')
    if (fromUrl) sessionStorage.setItem(KEY, fromUrl)
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setUserId(id: string) {
  try {
    sessionStorage.setItem(KEY, id)
  } catch {
    // Storage can be blocked. The person is asked to choose again on reload.
  }
}

export function clearUserId() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
