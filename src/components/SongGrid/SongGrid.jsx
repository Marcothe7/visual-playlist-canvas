import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSongs } from '@/hooks/useSongs'
import { SongCard } from '@/components/SongCard/SongCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './SongGrid.module.css'

function SortableSongCard({ song, onToggle, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 1 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={styles.cardWrapper}>
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
  const { songs, filteredSongs, toggleSong, deleteSong, reorderSongs, setSearchQuery, selectedCount } = useSongs()
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeSong = activeId ? songs.find(s => s.id === activeId) : null

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIndex = songs.findIndex(s => s.id === active.id)
    const newIndex = songs.findIndex(s => s.id === over.id)
    reorderSongs(arrayMove(songs, oldIndex, newIndex))
  }

  // Empty states
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredSongs.map(s => s.id)} strategy={rectSortingStrategy}>
          <div className={styles.grid} data-density={density}>
            {filteredSongs.map(song => (
              <SortableSongCard
                key={song.id}
                song={song}
                onToggle={toggleSong}
                onDelete={deleteSong}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeSong ? (
            <div className={styles.dragOverlay}>
              <SongCard song={activeSong} onToggle={() => {}} onDelete={null} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}
