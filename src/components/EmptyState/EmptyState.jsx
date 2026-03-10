import { motion } from 'framer-motion'
import { useAppDispatch } from '@/context/AppContext'
import styles from './EmptyState.module.css'

function VinylIcon() {
  return (
    <svg className={styles.illustration} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="60" cy="60" r="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" />
      <circle cx="60" cy="60" r="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 6" />
      <circle cx="60" cy="60" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="60" r="3" fill="currentColor" />
    </svg>
  )
}

export function EmptyState({ isFiltered = false, onClearSearch }) {
  const dispatch = useAppDispatch()

  function handleAddSong() {
    dispatch({ type: 'OPEN_MODAL' })
  }

  if (isFiltered) {
    return (
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <VinylIcon />
        <h2 className={styles.heading}>No songs match your search</h2>
        <p className={styles.subtext}>Try a different title or artist name.</p>
        <button className={styles.cta} onClick={onClearSearch}>
          Clear search
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
    >
      <VinylIcon />
      <h2 className={styles.heading}>Your canvas is empty</h2>
      <p className={styles.subtext}>Add some songs to get started, then select them for AI recommendations.</p>
      <button className={styles.cta} onClick={handleAddSong}>
        Search for a song
      </button>
    </motion.div>
  )
}
