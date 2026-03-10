import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './ShortcutsModal.module.css'

const SHORTCUTS = [
  {
    keys: ['Del', 'Backspace'],
    description: 'Delete selected songs',
  },
  {
    keys: ['Ctrl', 'Z'],
    description: 'Undo last delete',
  },
  {
    keys: ['Esc'],
    description: 'Close recommendations panel',
  },
]

export function ShortcutsModal({ isOpen, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label="Keyboard shortcuts"
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Keyboard Shortcuts</h2>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <ul className={styles.list}>
              {SHORTCUTS.map((s, i) => (
                <li key={i} className={styles.row}>
                  <span className={styles.description}>{s.description}</span>
                  <span className={styles.keys}>
                    {s.keys.map((k, j) => (
                      <span key={k}>
                        <kbd className={styles.kbd}>{k}</kbd>
                        {j < s.keys.length - 1 && <span className={styles.plus}>+</span>}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <p className={styles.tip}>Shortcuts are disabled while typing in an input field.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
