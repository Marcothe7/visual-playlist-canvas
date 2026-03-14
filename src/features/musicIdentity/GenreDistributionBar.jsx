// Horizontal stacked bar chart showing genre distribution.

import styles from './GenreDistributionBar.module.css'

// Palette for up to 5 genre segments
const SEGMENT_COLORS = [
  'var(--color-accent)',
  '#a78bfa',
  '#60a5fa',
  '#fb923c',
  '#f472b6',
]

export function GenreDistributionBar({ genreDistribution }) {
  if (!genreDistribution?.length) return null

  // Normalize percentages to always sum to 100
  const total = genreDistribution.reduce((s, g) => s + (g.pct ?? 0), 0)
  const genres = genreDistribution
    .filter(g => g.pct > 0)
    .slice(0, 5)
    .map((g, i) => ({
      ...g,
      normalizedPct: total > 0 ? (g.pct / total) * 100 : 0,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    }))

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar} role="img" aria-label="Genre distribution">
        {genres.map(g => (
          <div
            key={g.genre}
            className={styles.segment}
            style={{ width: `${g.normalizedPct}%`, background: g.color }}
            title={`${g.genre}: ${Math.round(g.normalizedPct)}%`}
          />
        ))}
      </div>
      <div className={styles.legend}>
        {genres.map(g => (
          <div key={g.genre} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: g.color }} />
            <span className={styles.genreLabel}>{g.genre}</span>
            <span className={styles.genrePct}>{Math.round(g.normalizedPct)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
