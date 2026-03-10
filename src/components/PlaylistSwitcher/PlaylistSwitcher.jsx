import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlaylists } from '@/context/PlaylistContext'
import styles from './PlaylistSwitcher.module.css'

export function PlaylistSwitcher() {
  const {
    playlists,
    activeId,
    activePlaylist,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    switchPlaylist,
  } = usePlaylists()

  const [isOpen,     setIsOpen]     = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [editValue,  setEditValue]  = useState('')
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const containerRef = useRef(null)
  const editInputRef = useRef(null)
  const newInputRef  = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return
    function onMouseDown(e) {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  // Focus new name input when creating starts
  useEffect(() => {
    if (creating) newInputRef.current?.focus()
  }, [creating])

  function handleSwitch(id) {
    if (id !== activeId) switchPlaylist(id)
    setIsOpen(false)
  }

  function startEditing(e, playlist) {
    e.stopPropagation()
    setEditingId(playlist.id)
    setEditValue(playlist.name)
  }

  function commitEdit(id) {
    const trimmed = editValue.trim()
    if (trimmed) renamePlaylist(id, trimmed)
    setEditingId(null)
  }

  function handleEditKeyDown(e, id) {
    if (e.key === 'Enter')  commitEdit(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  function handleDelete(e, id) {
    e.stopPropagation()
    deletePlaylist(id)
  }

  function handleStartCreate() {
    setCreating(true)
    setNewName('')
  }

  function commitCreate() {
    const trimmed = newName.trim()
    if (trimmed) createPlaylist(trimmed)
    setCreating(false)
    setNewName('')
  }

  function handleNewKeyDown(e) {
    if (e.key === 'Enter')  commitCreate()
    if (e.key === 'Escape') { setCreating(false); setNewName('') }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg className={styles.triggerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span className={styles.triggerName}>{activePlaylist?.name ?? 'Playlist'}</span>
        <svg className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="listbox"
          >
            {playlists.map(playlist => (
              <div
                key={playlist.id}
                className={`${styles.item} ${playlist.id === activeId ? styles.itemActive : ''}`}
                onClick={() => editingId !== playlist.id && handleSwitch(playlist.id)}
                role="option"
                aria-selected={playlist.id === activeId}
              >
                {editingId === playlist.id ? (
                  <input
                    ref={editInputRef}
                    className={styles.editInput}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(playlist.id)}
                    onKeyDown={e => handleEditKeyDown(e, playlist.id)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <>
                    {playlist.id === activeId && (
                      <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span
                      className={styles.itemName}
                      onDoubleClick={e => startEditing(e, playlist)}
                      title="Double-click to rename"
                    >
                      {playlist.name}
                    </span>
                    <span className={styles.itemCount}>{playlist.songs.length}</span>
                    {playlists.length > 1 && (
                      <button
                        className={styles.deleteBtn}
                        onClick={e => handleDelete(e, playlist.id)}
                        aria-label={`Delete ${playlist.name}`}
                        title="Delete playlist"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            <div className={styles.divider} />

            {creating ? (
              <div className={styles.newItem}>
                <input
                  ref={newInputRef}
                  className={styles.editInput}
                  placeholder="Playlist name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={commitCreate}
                  onKeyDown={handleNewKeyDown}
                />
              </div>
            ) : (
              <button className={styles.createBtn} onClick={handleStartCreate}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Playlist
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
