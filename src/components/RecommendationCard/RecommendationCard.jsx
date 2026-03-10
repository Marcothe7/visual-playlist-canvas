import { motion } from 'framer-motion'
import { getGradientFromString } from '@/utils/colorFromString'
import styles from './RecommendationCard.module.css'

export function RecommendationCard({ rec, onAdd, isAdded = false }) {
  const { from, to } = getGradientFromString(rec.artist + (rec.album || ''))

  function handleAdd(e) {
    e.stopPropagation()
    if (!isAdded) onAdd(rec)
  }

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className={styles.artWrapper}>
        {rec.albumArt ? (
          <img
            className={styles.art}
            src={rec.albumArt}
            alt={`${rec.album || rec.title} album art`}
            loading="lazy"
          />
        ) : (
          <div
            className={styles.gradientArt}
            style={{ '--from': from, '--to': to }}
            aria-hidden="true"
          >
            <span className={styles.artInitial}>
              {rec.artist.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{rec.title}</p>
        <p className={styles.artist}>{rec.artist}</p>
        {rec.reason && <p className={styles.reason}>{rec.reason}</p>}
      </div>

      {onAdd && (
        <button
          className={`${styles.addBtn} ${isAdded ? styles.addBtnDone : ''}`}
          onClick={handleAdd}
          aria-label={isAdded ? `${rec.title} added` : `Add ${rec.title} to library`}
          title={isAdded ? 'Added' : 'Add to library'}
          disabled={isAdded}
        >
          {isAdded ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
      )}
    </motion.div>
  )
}
