import { createContext, useContext, useEffect, useReducer } from 'react'
import { generateId } from '@/utils/generateId'

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY         = 'vpc-playlists'
const ACTIVE_KEY          = 'vpc-active-playlist'
const LEGACY_SONGS_KEY    = 'vpc-songs'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePlaylist(name, songs = []) {
  return { id: generateId(), name, songs }
}

function loadInitialState() {
  // Migration: if old vpc-songs exists but new format doesn't, migrate it
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const playlists = JSON.parse(raw)
      const activeId  = localStorage.getItem(ACTIVE_KEY) || playlists[0]?.id || null
      return { playlists, activeId }
    } catch {}
  }

  // Check for legacy data to migrate
  const legacy = localStorage.getItem(LEGACY_SONGS_KEY)
  let songs = []
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy)
      const isStale = parsed.length > 0 && !('previewUrl' in parsed[0])
      if (!isStale) songs = parsed
    } catch {}
    localStorage.removeItem(LEGACY_SONGS_KEY)
  }

  const first = makePlaylist('My Library', songs)
  return { playlists: [first], activeId: first.id }
}

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialState = loadInitialState()

// ─── Reducer ───────────────────────────────────────────────────────────────────
function playlistReducer(state, action) {
  switch (action.type) {
    case 'CREATE_PLAYLIST': {
      const pl = makePlaylist(action.payload.name)
      return {
        playlists: [...state.playlists, pl],
        activeId: pl.id,
      }
    }

    case 'DELETE_PLAYLIST': {
      if (state.playlists.length <= 1) return state
      const next = state.playlists.filter(p => p.id !== action.payload.id)
      const activeId = state.activeId === action.payload.id
        ? next[0].id
        : state.activeId
      return { playlists: next, activeId }
    }

    case 'RENAME_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map(p =>
          p.id === action.payload.id ? { ...p, name: action.payload.name } : p
        ),
      }

    case 'SWITCH_PLAYLIST':
      return { ...state, activeId: action.payload.id }

    case 'SYNC_SONGS':
      return {
        ...state,
        playlists: state.playlists.map(p =>
          p.id === action.payload.id ? { ...p, songs: action.payload.songs } : p
        ),
      }

    default:
      return state
  }
}

// ─── Contexts ──────────────────────────────────────────────────────────────────
const PlaylistStateCtx    = createContext(null)
const PlaylistDispatchCtx = createContext(null)

// ─── Provider ──────────────────────────────────────────────────────────────────
export function PlaylistProvider({ children }) {
  const [state, dispatch] = useReducer(playlistReducer, initialState)

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.playlists))
    localStorage.setItem(ACTIVE_KEY, state.activeId)
  }, [state])

  return (
    <PlaylistStateCtx.Provider value={state}>
      <PlaylistDispatchCtx.Provider value={dispatch}>
        {children}
      </PlaylistDispatchCtx.Provider>
    </PlaylistStateCtx.Provider>
  )
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export function usePlaylistState() {
  const ctx = useContext(PlaylistStateCtx)
  if (!ctx) throw new Error('usePlaylistState must be used within PlaylistProvider')
  return ctx
}

export function usePlaylistDispatch() {
  const ctx = useContext(PlaylistDispatchCtx)
  if (!ctx) throw new Error('usePlaylistDispatch must be used within PlaylistProvider')
  return ctx
}

export function usePlaylists() {
  const state    = usePlaylistState()
  const dispatch = usePlaylistDispatch()

  const activePlaylist = state.playlists.find(p => p.id === state.activeId) ?? state.playlists[0]

  function createPlaylist(name) {
    dispatch({ type: 'CREATE_PLAYLIST', payload: { name } })
  }

  function deletePlaylist(id) {
    dispatch({ type: 'DELETE_PLAYLIST', payload: { id } })
  }

  function renamePlaylist(id, name) {
    dispatch({ type: 'RENAME_PLAYLIST', payload: { id, name } })
  }

  function switchPlaylist(id) {
    dispatch({ type: 'SWITCH_PLAYLIST', payload: { id } })
  }

  function syncSongs(id, songs) {
    dispatch({ type: 'SYNC_SONGS', payload: { id, songs } })
  }

  return {
    playlists: state.playlists,
    activeId:  state.activeId,
    activePlaylist,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    switchPlaylist,
    syncSongs,
  }
}
