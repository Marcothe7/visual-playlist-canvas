// Main container for the Music Map view (activeView === 'map').

import { useMusicMap } from './useMusicMap'
import { MusicMap } from './MusicMap'
import { useAppDispatch } from '@/context/AppContext'
import styles from './MusicMapPage.module.css'

export function MusicMapPage() {
  const { songNodes, recNodes, loading, error } = useMusicMap()
  const dispatch = useAppDispatch()

  const hasSongs = songNodes.length > 0

  return (
    <main className={styles.page}>
      <div className={styles.titleBar}>
        <h2 className={styles.title}>Music Map</h2>
        <p className={styles.hint}>
          Songs positioned by energy (x-axis) and mood (y-axis). Drag to pan.
        </p>
      </div>

      <div className={styles.mapArea}>
        {loading && (
          <div className={styles.overlay}>
            <div className={styles.spinner} />
            <p>Loading audio features…</p>
          </div>
        )}

        {error && !loading && (
          <div className={styles.overlay}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {!hasSongs && !loading && !error && (
          <div className={styles.overlay}>
            <p className={styles.emptyText}>
              Add songs to your library to see them on the map.
              <br />Songs need a Spotify ID for precise positioning.
            </p>
            <button
              className={styles.emptyAddBtn}
              onClick={() => dispatch({ type: 'OPEN_MODAL' })}
            >
              Add Song
            </button>
          </div>
        )}

        {hasSongs && !loading && (
          <MusicMap songNodes={songNodes} recNodes={recNodes} />
        )}
      </div>
    </main>
  )
}
