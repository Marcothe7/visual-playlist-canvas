import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './SongContextMenu.module.css'

export function SongContextMenu({ song, position, isSelected, onClose, onDelete, onToggleSelect }) {
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    function handleEsc(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  // Clamp position so the menu stays within viewport
  const style = {
    top:  Math.min(position.y, window.innerHeight - 160),
    left: Math.min(position.x, window.innerWidth  - 200),
  }

  return (
    <motion.div
      ref={menuRef}
      className={styles.menu}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      role="menu"
      aria-label={`Options for ${song.title}`}
    >
      <div className={styles.songInfo}>
        <p className={styles.songTitle}>{song.title}</p>
        <p className={styles.songArtist}>{song.artist}</p>
      </div>
      <div className={styles.divider} />
      <button
        className={styles.menuItem}
        onClick={() => { onToggleSelect(song.id); onClose() }}
        role="menuitem"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isSelected
            ? <><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/></>
            : <rect x="3" y="3" width="18" height="18" rx="2"/>
          }
        </svg>
        {isSelected ? 'Deselect' : 'Select'}
      </button>
      <button
        className={`${styles.menuItem} ${styles.deleteItem}`}
        onClick={() => { onDelete(song.id); onClose() }}
        role="menuitem"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Remove
      </button>
    </motion.div>
  )
}
