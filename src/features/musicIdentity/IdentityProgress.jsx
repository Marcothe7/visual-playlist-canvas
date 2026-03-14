// Progress indicator shown when the user has fewer than IDENTITY_MIN_SONGS songs.

import { IDENTITY_MIN_SONGS } from './useMusicIdentity'
import styles from './IdentityProgress.module.css'

export function IdentityProgress({ songCount }) {
  const remaining = Math.max(0, IDENTITY_MIN_SONGS - songCount)
  const progress  = Math.min(1, songCount / IDENTITY_MIN_SONGS)

  return (
    <div className={styles.wrapper}>
      <div className={styles.icon}>🎵</div>
      <h2 className={styles.title}>Discover Your Music Identity</h2>
      <p className={styles.subtitle}>
        {remaining > 0
          ? `Add ${remaining} more song${remaining !== 1 ? 's' : ''} to unlock your identity`
          : 'Ready to analyze your music taste!'}
      </p>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${progress * 100}%` }}
          aria-valuenow={songCount}
          aria-valuemax={IDENTITY_MIN_SONGS}
          role="progressbar"
        />
      </div>
      <p className={styles.count}>{songCount} / {IDENTITY_MIN_SONGS} songs</p>
    </div>
  )
}
