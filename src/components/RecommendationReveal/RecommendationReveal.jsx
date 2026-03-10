import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useSongs } from '@/hooks/useSongs'
import { getGradientFromString } from '@/utils/colorFromString'
import { generateId } from '@/utils/generateId'
import styles from './RecommendationReveal.module.css'

// ─── Single reveal card ────────────────────────────────────────────────────────
function RevealCard({ rec, onAdd, isAdded }) {
  const { from, to } = getGradientFromString(rec.artist + rec.album)

  return (
    <div className={styles.card}>
      <div className={styles.art}>
        {rec.albumArt
          ? <img src={rec.albumArt} alt="" loading="lazy" className={styles.artImg} />
          : <div className={styles.gradient} style={{ '--from': from, '--to': to }} />
        }
      </div>

      <div className={styles.info}>
        <span className={styles.cardTitle}>{rec.title}</span>
        <span className={styles.cardArtist}>{rec.artist}</span>
        {rec.reason && <span className={styles.reason}>{rec.reason}</span>}
      </div>

      <motion.button
        className={`${styles.addBtn} ${isAdded ? styles.addBtnDone : ''}`}
        onClick={() => !isAdded && onAdd(rec)}
        aria-label={isAdded ? 'Added' : `Add ${rec.title} to canvas`}
        whileTap={isAdded ? {} : { scale: 0.88 }}
      >
        {isAdded
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg><span>Add</span></>
        }
      </motion.button>
    </div>
  )
}

// ─── Reveal overlay ────────────────────────────────────────────────────────────
export function RecommendationReveal() {
  const { recommendations, showReveal, hideReveal } = useRecommendations()
  const { addSong } = useSongs()
  const [added, setAdded] = useState(new Set())

  function handleAdd(rec) {
    addSong({ ...rec, id: generateId(), isSelected: false })
    setAdded(prev => new Set(prev).add(rec.id))
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) hideReveal()
  }

  return (
    <AnimatePresence>
      {showReveal && (
        <motion.div
          className={styles.overlay}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Recommended songs"
        >
          <motion.div
            className={styles.container}
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <span className={styles.sparkle}>✦</span>
                <div>
                  <h2 className={styles.title}>Your Recommendations</h2>
                  <p className={styles.sub}>{recommendations.length} tracks picked for your vibe</p>
                </div>
              </div>
              <button className={styles.doneBtn} onClick={hideReveal}>Done</button>
            </div>

            {/* Cards */}
            <ul className={styles.list} role="list">
              {recommendations.map((rec, i) => (
                <motion.li
                  key={rec.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ listStyle: 'none' }}
                >
                  <RevealCard rec={rec} onAdd={handleAdd} isAdded={added.has(rec.id)} />
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
