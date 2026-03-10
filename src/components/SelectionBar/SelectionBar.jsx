import { AnimatePresence, motion } from 'framer-motion'
import { useSongs } from '@/hooks/useSongs'
import { useRecommendations } from '@/hooks/useRecommendations'
import styles from './SelectionBar.module.css'

export function SelectionBar() {
  const { selectedSongs, selectedCount, clearSelection, deleteSelected } = useSongs()
  const { fetchRecommendations, recommendationsLoading } = useRecommendations()

  function handleGetRecs() {
    fetchRecommendations(selectedSongs)
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className={styles.bar}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          role="status"
          aria-live="polite"
        >
          <div className={styles.left}>
            <div className={styles.badge}>
              <span className={styles.count}>{selectedCount}</span>
              <span>song{selectedCount !== 1 ? 's' : ''} selected</span>
            </div>
            <button
              className={styles.clearBtn}
              onClick={clearSelection}
              aria-label="Clear selection"
            >
              Clear
            </button>
            <button
              className={styles.deleteBtn}
              onClick={deleteSelected}
              disabled={recommendationsLoading}
              aria-label={`Delete ${selectedCount} selected song${selectedCount !== 1 ? 's' : ''}`}
            >
              Delete selected
            </button>
          </div>

          <button
            className={styles.recBtn}
            onClick={handleGetRecs}
            disabled={recommendationsLoading}
            aria-label="Get AI recommendations based on selected songs"
          >
            {recommendationsLoading ? (
              <div className={styles.spinner} aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            <span>{recommendationsLoading ? 'Finding songs…' : 'Get Recommendations'}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
