import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useSongs } from '@/hooks/useSongs'
import { RecommendationCard } from '@/components/RecommendationCard/RecommendationCard'
import { generateId } from '@/utils/generateId'
import styles from './RecommendationPanel.module.css'

const SKELETON_COUNT = 5

function Skeletons() {
  return (
    <div className={styles.skeletons}>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonArt} />
          <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecommendationPanel() {
  const {
    isPanelOpen,
    recommendations,
    recommendationsLoading,
    recommendationsError,
    closePanel,
    fetchRecommendations,
    canGoBack,
    canGoForward,
    historyIndex,
    historyTotal,
    goBack,
    goForward,
  } = useRecommendations()

  const { selectedSongs, addSong } = useSongs()

  // Track which recs have been added this session
  const [addedIds, setAddedIds] = useState(new Set())

  function handleAdd(rec) {
    addSong({
      id:         generateId(),
      title:      rec.title,
      artist:     rec.artist,
      album:      rec.album,
      albumArt:   rec.albumArt,
      previewUrl: rec.previewUrl ?? null,
      genre:      [],
      year:       rec.year ?? null,
    })
    setAddedIds(prev => new Set(prev).add(rec.id))
  }

  function handleAddAll() {
    recommendations.forEach(rec => {
      if (!addedIds.has(rec.id)) {
        addSong({
          id:         generateId(),
          title:      rec.title,
          artist:     rec.artist,
          album:      rec.album,
          albumArt:   rec.albumArt,
          previewUrl: rec.previewUrl ?? null,
          genre:      [],
          year:       rec.year ?? null,
        })
      }
    })
    setAddedIds(new Set(recommendations.map(r => r.id)))
  }

  function handleRetry() {
    fetchRecommendations(selectedSongs)
  }

  const allAdded = recommendations.length > 0 && recommendations.every(r => addedIds.has(r.id))
  const showList = !recommendationsLoading && !recommendationsError && recommendations.length > 0

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <motion.aside
          className={styles.panel}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          aria-label="Song recommendations"
        >
          <div className={styles.panelHeader}>
            <div className={styles.headerLeft}>
              {historyTotal > 1 && (
                <button
                  className={styles.navBtn}
                  onClick={goBack}
                  disabled={!canGoBack}
                  aria-label="Previous recommendations"
                  title="Previous"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              <h2 className={styles.panelTitle}>
                Recommendations
                {historyTotal > 1 && (
                  <span className={styles.historyCounter}>{historyIndex + 1}/{historyTotal}</span>
                )}
              </h2>
              {historyTotal > 1 && (
                <button
                  className={styles.navBtn}
                  onClick={goForward}
                  disabled={!canGoForward}
                  aria-label="Next recommendations"
                  title="Next"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
            <button
              className={styles.closeBtn}
              onClick={closePanel}
              aria-label="Close recommendations panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {recommendationsLoading && <Skeletons />}

          {recommendationsError && !recommendationsLoading && (
            <div className={styles.error}>
              <div className={styles.errorIcon}>⚠️</div>
              <p className={styles.errorTitle}>Something went wrong</p>
              <p className={styles.errorMsg}>{recommendationsError}</p>
              {selectedSongs.length > 0 && (
                <button className={styles.retryBtn} onClick={handleRetry}>
                  Try again
                </button>
              )}
            </div>
          )}

          {showList && (
            <>
              <div className={styles.addAllBar}>
                <button
                  className={`${styles.addAllBtn} ${allAdded ? styles.addAllDone : ''}`}
                  onClick={handleAddAll}
                  disabled={allAdded}
                >
                  {allAdded ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      All added
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add all {recommendations.length} songs
                    </>
                  )}
                </button>
              </div>

              <div className={styles.list} role="list">
                {recommendations.map(rec => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    onAdd={handleAdd}
                    isAdded={addedIds.has(rec.id)}
                  />
                ))}
                <p className={styles.hint}>
                  {recommendations.length} songs · powered by Claude AI
                </p>
              </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
