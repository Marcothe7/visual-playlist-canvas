import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getGradientFromString } from '@/utils/colorFromString'
import { useAudio } from '@/context/AudioContext'
import { useAppDispatch } from '@/context/AppContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useLongPress } from '@/hooks/useLongPress'
import { SongContextMenu } from '@/components/SongContextMenu/SongContextMenu'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import { apiBase } from '@/lib/api'
import styles from './SongCard.module.css'

const cardVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
}

export function SongCard({ song, onToggle, onDelete, featured = false }) {
  const { from, to } = getGradientFromString(song.artist + (song.album || ''))
  const { playingId, play } = useAudio()
  const dispatch = useAppDispatch()
  const isPlaying = playingId === song.id
  const isMobile  = useIsMobile()

  const [contextMenu, setContextMenu] = useState(null)
  const [fetchingPreview, setFetchingPreview] = useState(false)

  // ── Fetch preview on demand when missing ──
  const fetchPreviewAndPlay = useCallback(async (e) => {
    e.stopPropagation()
    if (fetchingPreview) return
    setFetchingPreview(true)
    try {
      const res = await fetch(apiBase + '/api/deezer-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: [{ id: song.id, title: song.title, artist: song.artist }] }),
      })
      if (res.ok) {
        const data = await res.json()
        const url = data.previews?.[song.id]
        if (url) {
          dispatch({ type: 'UPDATE_SONG', payload: { id: song.id, previewUrl: url } })
          hapticMedium()
          play(song.id, url)
          return
        }
      }
    } catch {}
    setFetchingPreview(false)
  }, [song.id, song.title, song.artist, fetchingPreview, dispatch, play])

  // ── Long-press → context menu (mobile only)
  const longPressHandlers = useLongPress((e) => {
    if (!isMobile) return
    const { clientX, clientY } = e.touches?.[0] ?? e
    setContextMenu({ x: clientX, y: clientY })
  }, 500)

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(song.id)
    }
  }

  function handlePlay(e) {
    e.stopPropagation()
    hapticLight()
    play(song.id, song.previewUrl)
  }

  function handleDelete(e) {
    e.stopPropagation()
    onDelete(song.id)
  }

  function handleCardClick() {
    hapticLight()
    onToggle(song.id)
  }

  const cardClass = [
    styles.card,
    song.isSelected ? styles.selected : '',
    featured ? styles.featured : '',
    isPlaying ? styles.nowPlaying : '',
  ].join(' ')

  return (
    <>
      <AnimatePresence>
        {contextMenu && (
          <SongContextMenu
            key="ctx"
            song={song}
            position={contextMenu}
            isSelected={song.isSelected}
            onClose={() => setContextMenu(null)}
            onDelete={onDelete}
            onToggleSelect={onToggle}
          />
        )}
      </AnimatePresence>

      <div className={styles.swipeWrapper}>
        <motion.div
          className={cardClass}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover={!isMobile ? { scale: 1.035 } : undefined}
          whileTap={{ scale: 0.97 }}
          onClick={(e) => {
            if (isMobile) longPressHandlers.onClick(e)
            if (!e.defaultPrevented) handleCardClick()
          }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="checkbox"
          aria-checked={song.isSelected}
          aria-label={`${song.title} by ${song.artist}${song.isSelected ? ', selected' : ''}`}
          {...(isMobile ? {
            onPointerDown:   longPressHandlers.onPointerDown,
            onPointerUp:     longPressHandlers.onPointerUp,
            onPointerLeave:  longPressHandlers.onPointerLeave,
            onPointerCancel: longPressHandlers.onPointerCancel,
          } : {})}
        >
          <div className={styles.artWrapper}>
            {song.albumArt ? (
              <img
                className={styles.art}
                src={song.albumArt}
                alt={`${song.album || song.title} album art`}
                loading="lazy"
              />
            ) : (
              <div
                className={styles.gradientArt}
                style={{ '--from': from, '--to': to }}
                aria-hidden="true"
              >
                {!featured && (
                  <span className={styles.artInitial}>
                    {song.artist.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}

            <div className={styles.hoverOverlay} aria-hidden="true" />

            {featured && (
              <div className={styles.featuredScrim}>
                <p className={styles.featuredTitle}>{song.title}</p>
                <p className={styles.featuredArtist}>{song.artist}</p>
              </div>
            )}

            {onDelete && !isMobile && (
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                aria-label={`Remove ${song.title}`}
                title="Remove song"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {/* Play button — tapping when no preview triggers a fetch attempt */}
            <button
              className={`${styles.playButton} ${isPlaying ? styles.playButtonActive : ''} ${fetchingPreview ? styles.playButtonLoading : ''}`}
              onClick={song.previewUrl ? handlePlay : fetchPreviewAndPlay}
              aria-label={isPlaying ? `Pause ${song.title}` : fetchingPreview ? 'Loading preview…' : song.previewUrl ? `Play preview of ${song.title}` : `Fetch & play ${song.title}`}
              title={isPlaying ? 'Pause' : fetchingPreview ? 'Loading…' : song.previewUrl ? 'Play 30s preview' : 'Tap to load preview'}
            >
              {fetchingPreview ? (
                <span className={styles.playSpinner} />
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            {isPlaying && (
              <div className={styles.eqBars} aria-hidden="true">
                <span className={styles.eqBar} />
                <span className={styles.eqBar} />
                <span className={styles.eqBar} />
              </div>
            )}

            {song.isSelected && (
              <motion.div
                className={styles.checkmark}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
            )}
          </div>

          {!featured && (
            <div className={styles.info}>
              <p className={styles.songTitle}>{song.title}</p>
              <p className={styles.artist}>{song.artist}</p>
              {song.year && <span className={styles.yearBadge}>{song.year}</span>}
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
