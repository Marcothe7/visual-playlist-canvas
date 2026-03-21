import { motion } from 'framer-motion'
import { useAppDispatch } from '@/context/AppContext'
import styles from './EmptyState.module.css'

function MusicNoteIcon() {
  return (
    <svg className={styles.illustration} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <line x1="52" y1="20" x2="52" y2="52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 20 Q68 26 60 36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="46" cy="54" rx="8" ry="5.5" transform="rotate(-15 46 54)" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="9" cy="9" r="6" />
      <line x1="14" y1="14" x2="18" y2="18" />
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
        <div className={styles.block}>
          <MusicNoteIcon />
          <h2 className={styles.heading}>No songs match your search</h2>
          <p className={styles.subtext}>Try a different title or artist name.</p>
          <button className={styles.cta} onClick={onClearSearch}>
            Clear search
          </button>
        </div>
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
      <div className={styles.block}>
        <MusicNoteIcon />
        <h2 className={styles.heading}>Your canvas is empty</h2>
        <p className={styles.subtext}>Add some songs, then select them for AI recommendations.</p>
        <button className={styles.cta} onClick={handleAddSong}>
          <SearchIcon />
          Search for a song
        </button>
      </div>
    </motion.div>
  )
}
