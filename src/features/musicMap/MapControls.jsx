// Zoom in / Zoom out / Reset controls for the Music Map.

import styles from './MapControls.module.css'

export function MapControls({ onZoomIn, onZoomOut, onReset }) {
  return (
    <div className={styles.controls} aria-label="Map controls">
      <button className={styles.btn} onClick={onZoomIn}  title="Zoom in">＋</button>
      <button className={styles.btn} onClick={onZoomOut} title="Zoom out">－</button>
      <button className={styles.btn} onClick={onReset}   title="Reset view">⊙</button>
    </div>
  )
}
