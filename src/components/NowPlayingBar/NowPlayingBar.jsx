import { AnimatePresence, motion } from 'framer-motion'
import { useAudio } from '@/context/AudioContext'
import { useSongs } from '@/hooks/useSongs'
import { getGradientFromString } from '@/utils/colorFromString'
import styles from './NowPlayingBar.module.css'

export function NowPlayingBar() {
  const { playingId, currentTime, duration, stop, seek } = useAudio()
  const { songs, selectedCount } = useSongs()

  const song = songs.find(s => s.id === playingId) ?? null
  const progress = duration > 0 ? currentTime / duration : 0

  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(Math.max(0, Math.min(1, ratio)))
  }

  function formatTime(secs) {
    if (!isFinite(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const { from, to } = song
    ? getGradientFromString(song.artist + (song.album || ''))
    : { from: '#333', to: '#555' }

  const barClass = [styles.bar, selectedCount > 0 ? styles.barWithSelection : ''].join(' ')

  return (
    <AnimatePresence>
      {playingId && song && (
        <motion.div
          className={barClass}
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          aria-label={`Now playing: ${song.title} by ${song.artist}`}
        >
          <div className={styles.inner}>
            {/* Album art thumbnail */}
            <div className={styles.thumb}>
              {song.albumArt ? (
                <img src={song.albumArt} alt="" />
              ) : (
                <div className={styles.thumbGradient} style={{ '--from': from, '--to': to }} />
              )}
            </div>

            {/* Track info */}
            <div className={styles.info}>
              <p className={styles.title}>{song.title}</p>
              <p className={styles.artist}>{song.artist}</p>
            </div>

            {/* Progress */}
            <div className={styles.progressSection}>
              <div
                className={styles.progressTrack}
                onClick={handleProgressClick}
                role="slider"
                aria-label="Seek"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
              </div>
              <div className={styles.times}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Stop button */}
            <button className={styles.stopBtn} onClick={stop} aria-label="Stop playback" title="Stop">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
