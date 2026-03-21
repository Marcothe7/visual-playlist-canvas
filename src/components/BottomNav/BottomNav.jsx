import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState, useAppDispatch } from '@/context/AppContext'
import { hapticLight } from '@/lib/haptics'
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function SwordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  )
}

function IdentityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
      <path d="M3 20a9 9 0 0 1 18 0" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

export function BottomNav({ onAddSong }) {
  const { isPanelOpen, isModalOpen, activeView, songs } = useAppState()
  const isEmpty = songs.length === 0
  const dispatch = useAppDispatch()
  const [moreOpen, setMoreOpen] = useState(false)

  function setView(view) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view })
    if (isPanelOpen) dispatch({ type: 'CLOSE_PANEL' })
    if (isModalOpen) dispatch({ type: 'CLOSE_MODAL' })
  }

  function handleAIPicks() {
    dispatch({ type: 'OPEN_PANEL' })
  }

  const isLibraryActive = activeView === 'library' && !isPanelOpen && !isModalOpen
  const isSearchActive = activeView === 'search' && !isPanelOpen && !isModalOpen
  const isMoreActive = moreOpen || activeView === 'map' || activeView === 'battle' || activeView === 'identity'

  return (
    <div className={styles.navRoot}>
      {/* Backdrop */}
      {moreOpen && (
        <div className={styles.moreOverlay} onClick={() => setMoreOpen(false)} />
      )}

      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className={styles.moreDrawer}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className={styles.moreHandle} />
            <button
              className={`${styles.moreItem} ${activeView === 'map' ? styles.moreItemActive : ''}`}
              onClick={() => { setView('map'); setMoreOpen(false); hapticLight() }}
            >
              <MapIcon />
              <span>Map</span>
            </button>
            <button
              className={`${styles.moreItem} ${activeView === 'battle' ? styles.moreItemActive : ''}`}
              onClick={() => { setView('battle'); setMoreOpen(false); hapticLight() }}
            >
              <SwordIcon />
              <span>Battle</span>
            </button>
            <button
              className={`${styles.moreItem} ${activeView === 'identity' ? styles.moreItemActive : ''}`}
              onClick={() => { setView('identity'); setMoreOpen(false); hapticLight() }}
            >
              <IdentityIcon />
              <span>Identity</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <div className={styles.fabWrap}>
        <button
          className={`${styles.fab} ${isEmpty ? styles.fabDimmed : ''}`}
          onClick={() => { hapticLight(); onAddSong() }}
          aria-label="Add song"
        >
          <AddIcon />
        </button>
      </div>

      {/* Nav bar */}
      <nav className={styles.nav} aria-label="Main navigation">
        <button
          className={`${styles.navItem} ${isLibraryActive ? styles.active : ''}`}
          onClick={() => { hapticLight(); setView('library') }}
          aria-label="Library"
        >
          <LibraryIcon />
          <span>Library</span>
        </button>

        <button
          className={`${styles.navItem} ${isSearchActive ? styles.active : ''}`}
          onClick={() => { hapticLight(); setView('search') }}
          aria-label="Search"
        >
          <SearchIcon />
          <span>Search</span>
        </button>

        <div className={styles.fabSpacer} />

        <button
          className={`${styles.navItem} ${isPanelOpen ? styles.active : ''}`}
          onClick={() => { hapticLight(); handleAIPicks() }}
          aria-label="AI Picks"
        >
          <SparkleIcon />
          <span>Picks</span>
        </button>

        <button
          className={`${styles.navItem} ${isMoreActive ? styles.active : ''}`}
          onClick={() => { hapticLight(); setMoreOpen(true) }}
          aria-label="More"
        >
          <MoreIcon />
          <span>More</span>
        </button>
      </nav>
    </div>
  )
}
