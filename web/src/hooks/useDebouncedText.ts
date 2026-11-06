import { useEffect, useState } from 'react'

/**
 * The text, but only after the person pauses typing, so search runs as they type
 * without sending a request on every keystroke. Clearing the box applies at once.
 */
export function useDebouncedText(value: string, delayMs = 300): string {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    if (value === '') {
      setSettled('')
      return
    }
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
