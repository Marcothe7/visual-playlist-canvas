import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { generateId } from '@/utils/generateId'
import {
  fetchPlaylists,
  fetchPlaylistSongs,
  createPlaylist as dbCreatePlaylist,
  deletePlaylist as dbDeletePlaylist,
  renamePlaylist as dbRenamePlaylist,
  upsertSongs,
  migrateLocalStorage,
} from '@/services/supabaseService'

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY      = 'vpc-playlists'
const ACTIVE_KEY       = 'vpc-active-playlist'
const LEGACY_SONGS_KEY = 'vpc-songs'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePlaylist(name, songs = []) {
  return { id: generateId(), name, songs }
}

function loadInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const playlists = JSON.parse(raw)
      const activeId  = localStorage.getItem(ACTIVE_KEY) || playlists[0]?.id || null
      return { playlists, activeId, isHydrating: false }
    } catch {}
  }

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
  return { playlists: [first], activeId: first.id, isHydrating: false }
}

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialState = loadInitialState()

// ─── Reducer ───────────────────────────────────────────────────────────────────
function playlistReducer(state, action) {
  switch (action.type) {
    case 'SET_HYDRATING':
      return { ...state, isHydrating: action.payload }

    case 'HYDRATE_FROM_DB': {
      // Replace state with data loaded from Supabase
      const { playlists, activeId } = action.payload
      return { playlists, activeId: activeId || playlists[0]?.id || null, isHydrating: false }
    }

    case 'CREATE_PLAYLIST': {
      const pl = action.payload.dbId
        ? { id: action.payload.dbId, name: action.payload.name, songs: [] }
        : makePlaylist(action.payload.name)
      return {
        playlists: [...state.playlists, pl],
        activeId: pl.id,
        isHydrating: state.isHydrating,
      }
    }

    case 'DELETE_PLAYLIST': {
      if (state.playlists.length <= 1) return state
      const next = state.playlists.filter(p => p.id !== action.payload.id)
      const activeId = state.activeId === action.payload.id
        ? next[0].id
        : state.activeId
      return { ...state, playlists: next, activeId }
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

  // We'll get the auth user lazily via a ref so we don't need to import AuthContext here
  // (it would cause a circular dependency if AuthProvider wraps PlaylistProvider)
  const userRef = useRef(null)

  // Expose a way for App to set the current user
  useEffect(() => {
    // Listen for Supabase auth state directly to avoid circular context deps
    let sub = null
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          userRef.current = session.user
          hydrateFromSupabase(session.user)
        }
      })
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        const prevUserId = userRef.current?.id
        userRef.current = session?.user ?? null
        if (session?.user && session.user.id !== prevUserId) {
          hydrateFromSupabase(session.user)
        } else if (!session) {
          // Signed out: revert to localStorage
          dispatch({ type: 'HYDRATE_FROM_DB', payload: loadInitialState() })
        }
      })
      sub = result.data.subscription
    })
    return () => sub?.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function hydrateFromSupabase(user) {
    dispatch({ type: 'SET_HYDRATING', payload: true })
    try {
      // Run one-time migration of localStorage data
      await migrateLocalStorage(user.id)

      const dbPlaylists = await fetchPlaylists(user.id)
      if (dbPlaylists.length === 0) {
        // New user with no data — create default playlist
        const dbPl = await dbCreatePlaylist(user.id, 'My Library')
        dispatch({ type: 'HYDRATE_FROM_DB', payload: { playlists: [{ id: dbPl.id, name: dbPl.name, songs: [] }], activeId: dbPl.id } })
        return
      }

      // Fetch songs for each playlist
      const playlists = await Promise.all(
        dbPlaylists.map(async (pl) => {
          const songs = await fetchPlaylistSongs(pl.id)
          return { id: pl.id, name: pl.name, songs }
        })
      )

      const savedActiveId = localStorage.getItem(ACTIVE_KEY)
      const activeId = playlists.find(p => p.id === savedActiveId) ? savedActiveId : playlists[0].id

      dispatch({ type: 'HYDRATE_FROM_DB', payload: { playlists, activeId } })
    } catch (err) {
      console.warn('Supabase hydration failed, using localStorage:', err)
      dispatch({ type: 'SET_HYDRATING', payload: false })
    }
  }

  // Persist to localStorage on every state change
  useEffect(() => {
    if (state.isHydrating) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.playlists))
    localStorage.setItem(ACTIVE_KEY, state.activeId)
  }, [state])

  // Background Supabase sync for SYNC_SONGS
  const syncTimeoutRef = useRef(null)
  function scheduleSyncToSupabase(playlistId, songs) {
    if (!userRef.current) return
    clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      upsertSongs(playlistId, userRef.current.id, songs).catch(err =>
        console.warn('Supabase sync failed:', err)
      )
    }, 1000) // debounce 1s to batch rapid changes
  }

  return (
    <PlaylistStateCtx.Provider value={state}>
      <PlaylistDispatchCtx.Provider value={{ dispatch, scheduleSyncToSupabase, getUserId: () => userRef.current?.id }}>
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
  const { dispatch, scheduleSyncToSupabase, getUserId } = usePlaylistDispatch()

  const activePlaylist = state.playlists.find(p => p.id === state.activeId) ?? state.playlists[0]

  async function createPlaylist(name) {
    const userId = getUserId()
    if (userId) {
      try {
        const dbPl = await dbCreatePlaylist(userId, name)
        dispatch({ type: 'CREATE_PLAYLIST', payload: { name, dbId: dbPl.id } })
      } catch {
        dispatch({ type: 'CREATE_PLAYLIST', payload: { name } })
      }
    } else {
      dispatch({ type: 'CREATE_PLAYLIST', payload: { name } })
    }
  }

  async function deletePlaylist(id) {
    dispatch({ type: 'DELETE_PLAYLIST', payload: { id } })
    const userId = getUserId()
    if (userId) {
      dbDeletePlaylist(id).catch(err => console.warn('Delete playlist failed:', err))
    }
  }

  async function renamePlaylist(id, name) {
    dispatch({ type: 'RENAME_PLAYLIST', payload: { id, name } })
    const userId = getUserId()
    if (userId) {
      dbRenamePlaylist(id, name).catch(err => console.warn('Rename playlist failed:', err))
    }
  }

  function switchPlaylist(id) {
    dispatch({ type: 'SWITCH_PLAYLIST', payload: { id } })
  }

  function syncSongs(id, songs) {
    dispatch({ type: 'SYNC_SONGS', payload: { id, songs } })
    scheduleSyncToSupabase(id, songs)
  }

  return {
    playlists:    state.playlists,
    activeId:     state.activeId,
    activePlaylist,
    isHydrating:  state.isHydrating,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    switchPlaylist,
    syncSongs,
  }
}
