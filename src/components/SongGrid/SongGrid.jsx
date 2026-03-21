import { motion } from 'framer-motion'
import { useSongs } from '@/hooks/useSongs'
import { SongCard } from '@/components/SongCard/SongCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './SongGrid.module.css'

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.035,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

function SongCardWithTooltip({ song, onToggle, onDelete }) {
  return (
    <motion.div className={styles.cardWrapper} variants={itemVariants}>
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
    </motion.div>
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

      <motion.div
        className={styles.grid}
        data-density={density}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={filteredSongs.length}
      >
        {filteredSongs.map(song => (
          <SongCardWithTooltip
            key={song.id}
            song={song}
            onToggle={toggleSong}
            onDelete={deleteSong}
          />
        ))}
      </motion.div>
    </>
  )
}
