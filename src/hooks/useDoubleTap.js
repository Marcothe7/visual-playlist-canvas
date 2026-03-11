import { useRef } from 'react'

export function useDoubleTap(callback, delay = 300) {
  const lastTapRef = useRef(0)

  return {
    onClick(e) {
      const now = Date.now()
      if (now - lastTapRef.current < delay) {
        e.preventDefault()
        callback(e)
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
    },
  }
}
