import { useSyncExternalStore } from 'react'

/** True while the window is narrower than `maxWidth` pixels (a phone). Follows rotation and resizing. */
export function useNarrow(maxWidth = 700): boolean {
  const query = `(max-width: ${maxWidth - 1}px)`
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
