import { useSongs } from '@/hooks/useSongs'
import { SongCard } from '@/components/SongCard/SongCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './SongGrid.module.css'

function SongCardWithTooltip({ song, onToggle, onDelete }) {
  return (
    <div className={styles.cardWrapper}>
      <SongCard song={song} onToggle={onToggle} onDelete={onDelete} />
      <div className={styles.tooltip} aria-hidden="true">
        <p className={styles.tooltipTitle}>{song.title}</p>
        <p className={styles.tooltipArtist}>{song.artist}</p>
        {(song.album || song.year) && (
          <p className={styles.tooltipMeta}>
            {song.album}{song.album && song.year ? ' · ' : ''}{song.year}
          </p>
        )}
      </div>
    </div>
  )
}

export function SongGrid({ density = 'normal' }) {
  const { songs, filteredSongs, toggleSong, deleteSong, setSearchQuery, selectedCount } = useSongs()

  if (songs.length === 0) {
    return (
      <div className={styles.grid} data-density={density}>
        <EmptyState isFiltered={false} />
      </div>
    )
  }

  if (filteredSongs.length === 0) {
    return (
      <div className={styles.grid} data-density={density}>
        <EmptyState isFiltered={true} onClearSearch={() => setSearchQuery('')} />
      </div>
    )
  }

  return (
    <>
      {selectedCount > 0 && (
        <div className={styles.selectionBanner} role="status" aria-live="polite">
          <span className={styles.selectionCount}>
            {selectedCount} {selectedCount === 1 ? 'song' : 'songs'} selected
          </span>
          <span className={styles.selectionHint}>Use the bar below to get AI recommendations</span>
        </div>
      )}

      <div className={styles.grid} data-density={density}>
        {filteredSongs.map(song => (
          <SongCardWithTooltip
            key={song.id}
            song={song}
            onToggle={toggleSong}
            onDelete={deleteSong}
          />
        ))}
      </div>
    </>
  )
}
