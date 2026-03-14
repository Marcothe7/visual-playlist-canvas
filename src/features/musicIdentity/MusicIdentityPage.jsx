// Main container for the Music Identity view (activeView === 'identity').
// Shows progress indicator, analyze button, or the full identity card.

import { useMusicIdentity, IDENTITY_MIN_SONGS } from './useMusicIdentity'
import { IdentityProgress } from './IdentityProgress'
import { MusicIdentityCard } from './MusicIdentityCard'
import styles from './MusicIdentityPage.module.css'

export function MusicIdentityPage() {
  const {
    songs,
    canAnalyze,
    tasteProfile,
    musicIdentity,
    identityLoading,
    identityError,
    analyzeMyTaste,
  } = useMusicIdentity()

  const songCount = songs.length

  return (
    <main className={styles.page}>
      {/* Not enough songs yet */}
      {!canAnalyze && (
        <IdentityProgress songCount={songCount} />
      )}

      {/* Error state */}
      {identityError && (
        <p className={styles.errorText}>{identityError}</p>
      )}

      {/* Enough songs but no identity yet */}
      {canAnalyze && !musicIdentity && !identityLoading && (
        <div className={styles.analyzeWrapper}>
          <div className={styles.analyzeIcon}>✨</div>
          <h2 className={styles.analyzeTitle}>Ready to Discover Your Sound</h2>
          <p className={styles.analyzeSubtitle}>
            You have {songCount} songs — let{"'"}s analyze your music taste and reveal your identity.
          </p>
          <button className={styles.analyzeBtn} onClick={analyzeMyTaste}>
            Analyze My Taste
          </button>
        </div>
      )}

      {/* Loading */}
      {identityLoading && (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Analyzing your music taste…</p>
        </div>
      )}

      {/* Identity card */}
      {musicIdentity && !identityLoading && (
        <MusicIdentityCard
          identity={musicIdentity}
          profile={tasteProfile}
          onReanalyze={analyzeMyTaste}
        />
      )}
    </main>
  )
}
