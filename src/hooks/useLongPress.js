import { useRef } from 'react'

export function useLongPress(callback, delay = 500) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)

  function start(e) {
    firedRef.current = false
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      callback(e)
    }, delay)
  }

  function cancel() {
    clearTimeout(timerRef.current)
  }

  function handleClick(e) {
    // Suppress the normal click that fires right after a long-press
    if (firedRef.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return {
    onPointerDown:  start,
    onPointerUp:    cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClick:        handleClick,
  }
}
