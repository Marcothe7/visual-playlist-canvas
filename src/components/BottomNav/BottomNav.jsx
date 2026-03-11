import { useAppState, useAppDispatch } from '@/context/AppContext'
import styles from './BottomNav.module.css'

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

export function BottomNav({ onAddSong }) {
  const { isPanelOpen, isModalOpen } = useAppState()
  const dispatch = useAppDispatch()

  function handleLibrary() {
    if (isPanelOpen) dispatch({ type: 'CLOSE_PANEL' })
    if (isModalOpen) dispatch({ type: 'CLOSE_MODAL' })
  }

  function handleSearch() {
    dispatch({ type: 'OPEN_MODAL' })
  }

  function handleAIPicks() {
    dispatch({ type: 'OPEN_PANEL' })
  }

  const isLibraryActive = !isPanelOpen && !isModalOpen
  const isPanelActive   = isPanelOpen
  const isModalActive   = isModalOpen

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <button
        className={`${styles.navItem} ${isLibraryActive ? styles.active : ''}`}
        onClick={handleLibrary}
        aria-label="Library"
      >
        <LibraryIcon />
        <span>Library</span>
      </button>

      <button
        className={`${styles.navItem} ${isModalActive ? styles.active : ''}`}
        onClick={handleSearch}
        aria-label="Search"
      >
        <SearchIcon />
        <span>Search</span>
      </button>

      <button
        className={`${styles.navItem} ${styles.addItem}`}
        onClick={onAddSong}
        aria-label="Add song"
      >
        <AddIcon />
        <span>Add</span>
      </button>

      <button
        className={`${styles.navItem} ${isPanelActive ? styles.active : ''}`}
        onClick={handleAIPicks}
        aria-label="AI Picks"
      >
        <SparkleIcon />
        <span>AI Picks</span>
      </button>
    </nav>
  )
}
