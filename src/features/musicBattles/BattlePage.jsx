// Main container for the Music Battles view (activeView === 'battle').

import { useBattles } from './useBattles'
import { BattleScreen } from './BattleScreen'
import { DEFAULT_RATING } from './eloRating'
import styles from './BattlePage.module.css'

export function BattlePage() {
  const { pair, result, streak, rankings, battleHistory, getRating, resolveBattle, hasSongs } = useBattles()

  const totalBattles = battleHistory.length

  if (!hasSongs) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔️</span>
          <h2 className={styles.emptyTitle}>Music Battles</h2>
          <p className={styles.emptyText}>Add at least 2 songs to your library to start battling.</p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      {/* Header stats */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalBattles}</span>
          <span className={styles.statLabel}>Battles</span>
        </div>
        {streak > 0 && (
          <div className={styles.stat}>
            <span className={styles.statValue}>🔥 {streak}</span>
            <span className={styles.statLabel}>Streak</span>
          </div>
        )}
      </div>

      {/* Battle arena */}
      {pair && (
        <BattleScreen
          songA={pair[0]}
          songB={pair[1]}
          result={result}
          onChoose={resolveBattle}
          getRating={getRating}
        />
      )}

      {/* Rankings — always visible once any battle has been fought */}
      {rankings.length > 0 && (
        <div className={styles.rankings}>
          <h3 className={styles.rankingsTitle}>🏆 Current Rankings</h3>
          <p className={styles.rankingsSubtitle}>Your top-rated songs shape your AI recommendations</p>
          <ol className={styles.rankingsList}>
            {rankings.slice(0, 10).map((song, i) => (
              <li key={song.id} className={styles.rankItem}>
                <span className={styles.rank}>{i + 1}</span>
                {song.albumArt && (
                  <img src={song.albumArt} alt="" className={styles.rankArt} />
                )}
                <div className={styles.rankInfo}>
                  <span className={styles.rankTitle}>{song.title}</span>
                  <span className={styles.rankArtist}>{song.artist}</span>
                </div>
                <span className={styles.rankRating}>{song.rating}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  )
}
