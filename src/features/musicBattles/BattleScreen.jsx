// The core "Song A vs Song B" battle UI.

import { BattleSongCard } from './BattleSongCard'
import styles from './BattleScreen.module.css'

export function BattleScreen({ songA, songB, result, onChoose, getRating }) {
  const isWinnerA = result?.winnerId === songA.id
  const isWinnerB = result?.winnerId === songB.id

  return (
    <div className={styles.screen}>
      <p className={styles.question}>Which song do you prefer?</p>

      <div className={styles.arena}>
        <BattleSongCard
          song={songA}
          onChoose={onChoose}
          isWinner={isWinnerA}
          isLoser={result && !isWinnerA}
          ratingDelta={isWinnerA ? result.deltaWinner : result ? result.deltaLoser : null}
        />

        <div className={styles.vsWrapper}>
          <span className={styles.vs}>VS</span>
          <div className={styles.ratings}>
            <span>{getRating(songA.id)}</span>
            <span className={styles.ratingLabel}>ELO</span>
            <span>{getRating(songB.id)}</span>
          </div>
        </div>

        <BattleSongCard
          song={songB}
          onChoose={onChoose}
          isWinner={isWinnerB}
          isLoser={result && !isWinnerB}
          ratingDelta={isWinnerB ? result.deltaWinner : result ? result.deltaLoser : null}
        />
      </div>
    </div>
  )
}
