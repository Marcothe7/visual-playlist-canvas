import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUndo } from '@/hooks/useUndo'
import styles from './UndoToast.module.css'

export function UndoToast() {
  const { canUndo, deletedCount, undo, clearSnapshot } = useUndo()
  const timerRef = useRef(null)

  // Auto-dismiss after 5 seconds; reset timer on each new delete
  useEffect(() => {
    if (canUndo) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(clearSnapshot, 5000)
    }
    return () => clearTimeout(timerRef.current)
  }, [canUndo]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleUndo() {
    clearTimeout(timerRef.current)
    undo()
  }

  const label = deletedCount === 1
    ? '1 song removed'
    : `${deletedCount} songs removed`

  return (
    <AnimatePresence>
      {canUndo && (
        <motion.div
          className={styles.toast}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          role="status"
          aria-live="polite"
        >
          <span className={styles.label}>{label}</span>
          <button className={styles.undoBtn} onClick={handleUndo}>
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
