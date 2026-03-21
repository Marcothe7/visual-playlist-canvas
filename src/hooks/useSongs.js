import { useAppState, useAppDispatch } from '@/context/AppContext'

export function useSongs() {
  const state    = useAppState()
  const dispatch = useAppDispatch()

  const selectedSongs = state.songs.filter(s => s.isSelected)

  const q = state.searchQuery?.toLowerCase() ?? ''
  const filteredSongs = q
    ? state.songs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
      )
    : state.songs

  function toggleSong(id) {
    dispatch({ type: 'TOGGLE_SONG', payload: { id } })
  }

  function addSong(song) {
    dispatch({ type: 'ADD_SONG', payload: song })
  }

  function clearSelection() {
    dispatch({ type: 'CLEAR_SELECTION' })
  }

  function deleteSong(id) {
    dispatch({ type: 'DELETE_SONG', payload: { id } })
  }

  function deleteSelected() {
    dispatch({ type: 'DELETE_SELECTED' })
  }

  function reorderSongs(songs) {
    dispatch({ type: 'REORDER_SONGS', payload: songs })
  }

  function updateSong(partial) {
    dispatch({ type: 'UPDATE_SONG', payload: partial })
  }

  function setSearchQuery(query) {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
  }

  return {
    songs:         state.songs,
    filteredSongs,
    searchQuery:   state.searchQuery ?? '',
    selectedSongs,
    selectedCount: selectedSongs.length,
    toggleSong,
    addSong,
    clearSelection,
    deleteSong,
    deleteSelected,
    updateSong,
    reorderSongs,
    setSearchQuery,
  }
}
