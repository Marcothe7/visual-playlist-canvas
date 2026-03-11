import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSongs } from '@/hooks/useSongs'
import { useIsMobile } from '@/hooks/useIsMobile'
import { generateId } from '@/utils/generateId'
import { getGradientFromString } from '@/utils/colorFromString'
import { searchTracks } from '@/services/spotifyService'
import styles from './AddSongModal.module.css'

// ─── Music search panel ───────────────────────────────────────────────────────
function SpotifySearch({ onAdd }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [added,   setAdded]   = useState(new Set())
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true); setError(null)
    try {
      setResults(await searchTracks(q))
    } catch (err) {
      setError(err.message || 'Search failed — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(q), 420)
  }

  function handleAdd(track) {
    onAdd(track)
    setAdded(prev => new Set(prev).add(track.id))
  }

  return (
    <>
      <div className={styles.searchBar}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search — artist, song, album…"
          value={query}
          onChange={handleInput}
          autoComplete="off"
        />
        {loading && <span className={styles.searchSpinner} aria-label="Searching" />}
      </div>

      <div className={styles.resultsList}>
        {error && <p className={styles.searchError}>{error}</p>}
        {!error && !loading && query.trim() && results.length === 0 && (
          <p className={styles.noResults}>No results for "{query}"</p>
        )}
        {!query.trim() && !loading && !error && (
          <p className={styles.searchHint}>Type to search millions of Spotify tracks</p>
        )}
        {results.map(track => {
          const isAdded = added.has(track.id)
          const { from, to } = getGradientFromString(track.artist + track.album)
          return (
            <div key={track.id} className={styles.resultItem}>
              <div className={styles.resultArt}>
                {track.albumArt
                  ? <img src={track.albumArt} alt="" loading="lazy" />
                  : <div className={styles.resultGradient} style={{ '--from': from, '--to': to }} />
                }
              </div>
              <div className={styles.resultInfo}>
                <span className={styles.resultTitle}>{track.title}</span>
                <span className={styles.resultArtist}>{track.artist}</span>
              </div>
              <button
                className={`${styles.addBtn} ${isAdded ? styles.addBtnDone : ''}`}
                onClick={() => !isAdded && handleAdd(track)}
                aria-label={isAdded ? 'Added' : `Add ${track.title}`}
              >
                {isAdded
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                }
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Manual entry form ────────────────────────────────────────────────────────
const emptyForm   = { title: '', artist: '', album: '', albumArt: '', year: '' }
const emptyErrors = { title: '', artist: '' }

function ManualForm({ onAdd, onClose }) {
  const [form,   setForm]   = useState(emptyForm)
  const [errors, setErrors] = useState(emptyErrors)
  const titleRef = useRef(null)

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 80) }, [])

  function handleChange(field) {
    return (e) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = { ...emptyErrors }
    if (!form.title.trim())  next.title  = 'Title is required'
    if (!form.artist.trim()) next.artist = 'Artist is required'
    setErrors(next)
    if (next.title || next.artist) return
    onAdd({
      id: generateId(), title: form.title.trim(), artist: form.artist.trim(),
      album: form.album.trim(), albumArt: form.albumArt.trim() || null,
      genre: [], year: form.year ? parseInt(form.year) : null,
    })
    onClose()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="song-title">Title <span className={styles.required}>*</span></label>
        <input ref={titleRef} id="song-title" type="text"
          className={`${styles.input} ${errors.title ? styles.error : ''}`}
          placeholder="e.g. Bohemian Rhapsody" value={form.title}
          onChange={handleChange('title')} autoComplete="off" />
        {errors.title && <span className={styles.errorMsg}>{errors.title}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="song-artist">Artist <span className={styles.required}>*</span></label>
        <input id="song-artist" type="text"
          className={`${styles.input} ${errors.artist ? styles.error : ''}`}
          placeholder="e.g. Queen" value={form.artist}
          onChange={handleChange('artist')} autoComplete="off" />
        {errors.artist && <span className={styles.errorMsg}>{errors.artist}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="song-album">Album</label>
        <input id="song-album" type="text" className={styles.input}
          placeholder="e.g. A Night at the Opera" value={form.album}
          onChange={handleChange('album')} autoComplete="off" />
      </div>
      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="song-art">Album Art URL</label>
          <input id="song-art" type="url" className={styles.input}
            placeholder="https://… (leave blank for auto art)" value={form.albumArt}
            onChange={handleChange('albumArt')} autoComplete="off" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="song-year">Year</label>
          <input id="song-year" type="number" className={styles.input}
            placeholder="e.g. 1991" min="1900" max="2030" value={form.year}
            onChange={handleChange('year')} autoComplete="off" />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.submitBtn}>Add to Canvas</button>
      </div>
    </form>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
export function AddSongModal({ isOpen, onClose }) {
  const { addSong } = useSongs()
  const isMobile = useIsMobile()
  const [mode, setMode] = useState('search')

  useEffect(() => { if (isOpen) setMode('search') }, [isOpen])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  function handleAdd(song) { addSong({ ...song, isSelected: false }) }
  function handleOverlayClick(e) { if (e.target === e.currentTarget) onClose() }

  const modalMotion = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { scale: 0.92, y: 20, opacity: 0 }, animate: { scale: 1, y: 0, opacity: 1 }, exit: { scale: 0.92, y: 20, opacity: 0 } }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog" aria-modal="true" aria-labelledby="modal-title"
        >
          <motion.div
            className={`${styles.modal} ${mode === 'search' ? styles.modalWide : ''}`}
            {...modalMotion}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {/* Drag handle on mobile */}
            {isMobile && <div className={styles.dragHandle} aria-hidden="true" />}

            <div className={styles.modalHeader}>
              <h2 id="modal-title" className={styles.modalTitle}>
                {mode === 'search' ? 'Search Music' : 'Add a Song'}
              </h2>
              <div className={styles.headerRight}>
                <button className={styles.modeToggle}
                  onClick={() => setMode(m => m === 'search' ? 'manual' : 'search')}>
                  {mode === 'search' ? 'Add manually' : '← Search'}
                </button>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {mode === 'search'
              ? <SpotifySearch onAdd={handleAdd} />
              : <ManualForm    onAdd={handleAdd} onClose={onClose} />
            }
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
