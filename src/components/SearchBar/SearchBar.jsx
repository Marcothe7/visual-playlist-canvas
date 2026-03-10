import { useRef } from 'react'
import { useSongs } from '@/hooks/useSongs'
import styles from './SearchBar.module.css'

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useSongs()
  const inputRef = useRef(null)

  function handleClear() {
    setSearchQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className={styles.wrapper}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder="Filter songs…"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        aria-label="Filter songs by title or artist"
        autoComplete="off"
      />
      {searchQuery && (
        <button className={styles.clearBtn} onClick={handleClear} aria-label="Clear filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
