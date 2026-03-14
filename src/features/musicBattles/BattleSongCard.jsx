// A single song card in the battle screen. Large album art, click to choose.

import { useAudio } from '@/context/AudioContext'
import styles from './BattleSongCard.module.css'

export function BattleSongCard({ song, onChoose, isWinner, isLoser, ratingDelta }) {
  const { playingId, play, stop } = useAudio()
  const isPlaying = playingId === song.id

  function handleCardClick() {
    onChoose(song.id)
  }

  function handlePlayClick(e) {
    e.stopPropagation()
    if (!song.previewUrl) return
    if (isPlaying) { stop() } else {
      play(song.id, song.previewUrl)
    }
  }

  const stateClass = isWinner ? styles.winner : isLoser ? styles.loser : ''

  return (
    <div
      className={`${styles.card} ${stateClass}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Choose ${song.title} by ${song.artist}`}
      onKeyDown={e => e.key === 'Enter' && handleCardClick()}
    >
      {/* Album art */}
      <div className={styles.artWrapper}>
        {song.albumArt ? (
          <img src={song.albumArt} alt={song.album || song.title} className={styles.art} />
        ) : (
          <div className={styles.artFallback}>
            <span>{song.title[0]}</span>
          </div>
        )}

        {/* Play button overlay */}
        {song.previewUrl && (
          <button
            className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
            onClick={handlePlayClick}
            aria-label={isPlaying ? 'Pause' : 'Preview'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        )}

        {/* Winner/loser overlay */}
        {(isWinner || isLoser) && (
          <div className={styles.resultOverlay}>
            <span className={styles.resultIcon}>{isWinner ? '👑' : ''}</span>
            {ratingDelta && (
              <span className={`${styles.ratingDelta} ${isWinner ? styles.deltaPos : styles.deltaNeg}`}>
                {ratingDelta}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{song.title}</p>
        <p className={styles.artist}>{song.artist}</p>
      </div>
    </div>
  )
}
