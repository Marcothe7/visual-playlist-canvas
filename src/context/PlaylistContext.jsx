import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { generateId } from '@/utils/generateId'
import { apiBase } from '@/lib/api'
import {
  fetchPlaylists,
  fetchPlaylistSongs,
  createPlaylist as dbCreatePlaylist,
  deletePlaylist as dbDeletePlaylist,
  renamePlaylist as dbRenamePlaylist,
  upsertSongs,
} from '@/services/supabaseService'

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY      = 'vpc-playlists'
const ACTIVE_KEY       = 'vpc-active-playlist'
const LEGACY_SONGS_KEY = 'vpc-songs'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePlaylist(name, songs = []) {
  return { id: generateId(), name, songs }
}

function createFreshState() {
  const first = makePlaylist('My Library')
  return { playlists: [first], activeId: first.id, isHydrating: false }
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

// ─── Preview enrichment ────────────────────────────────────────────────────────
// Fetch Deezer previews via the serverless proxy for songs that have none.
// Returns { enrichedPlaylists, previews } so the caller can persist found URLs.
async function enrichMissingPreviews(playlists) {
  const missing = []
  for (const pl of playlists) {
    for (const song of pl.songs) {
      if (!song.previewUrl && song.title && song.artist) {
        missing.push({ id: song.id, title: song.title, artist: song.artist })
      }
    }
  }
  if (missing.length === 0) return { enrichedPlaylists: playlists, previews: {} }

  let previews = {}
  try {
    const res = await fetch(apiBase + '/api/deezer-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: missing }),
    })
    if (res.ok) {
      const data = await res.json()
      previews = data.previews ?? {}
    }
  } catch {
    // Network error — skip silently
  }

  const enrichedPlaylists = playlists.map(pl => ({
    ...pl,
    songs: pl.songs.map(song =>
      previews[song.id] ? { ...song, previewUrl: previews[song.id] } : song
    ),
  }))

  return { enrichedPlaylists, previews }
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
        if (!session && prevUserId) {
          // Session is already cleared at this point — just reset state.
          // Callers must flush pending sync BEFORE calling supabase.auth.signOut().
          userRef.current = null
          dispatch({ type: 'HYDRATE_FROM_DB', payload: createFreshState() })
          return
        }
        userRef.current = session?.user ?? null
        if (session?.user && session.user.id !== prevUserId) {
          hydrateFromSupabase(session.user)
        }
      })
      sub = result.data.subscription
    })
    return () => sub?.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function hydrateFromSupabase(user) {
    dispatch({ type: 'SET_HYDRATING', payload: true })
    try {
      const dbPlaylists = await fetchPlaylists(user.id)
      if (dbPlaylists.length === 0) {
        // New user — create default empty playlist in Supabase
        const dbPl = await dbCreatePlaylist(user.id, 'My Library')
        dispatch({ type: 'HYDRATE_FROM_DB', payload: { playlists: [{ id: dbPl.id, name: dbPl.name, songs: [] }], activeId: dbPl.id } })
        return
      }

      // Fetch songs for each playlist from Supabase only,
      // deduplicating by spotifyId to fix any duplicate rows in the DB.
      const rawPlaylists = await Promise.all(
        dbPlaylists.map(async (pl) => {
          const allSongs = await fetchPlaylistSongs(pl.id)
          const seen = new Set()
          const songs = allSongs.filter(s => {
            const key = s.spotifyId || s.id
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          // If duplicates were found, overwrite the DB with the clean list
          if (songs.length < allSongs.length) {
            upsertSongs(pl.id, user.id, songs).catch(() => {})
          }
          return { id: pl.id, name: pl.name, songs }
        })
      )

      // Enrich songs that have no preview URL via Deezer proxy (best-effort)
      const { enrichedPlaylists, previews } = await enrichMissingPreviews(rawPlaylists)

      dispatch({ type: 'HYDRATE_FROM_DB', payload: { playlists: enrichedPlaylists, activeId: enrichedPlaylists[0].id } })

      // Persist any newly found preview URLs back to Supabase so they don't need re-fetching
      if (Object.values(previews).some(Boolean)) {
        for (const pl of enrichedPlaylists) {
          const hadMissing = pl.songs.some(s => previews[s.id])
          if (hadMissing) {
            upsertSongs(pl.id, user.id, pl.songs).catch(() => {})
          }
        }
      }
    } catch (err) {
      console.warn('Supabase hydration failed:', err)
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
  const pendingSyncRef = useRef(null) // { playlistId, userId, songs }

  function scheduleSyncToSupabase(playlistId, songs) {
    const userId = userRef.current?.id
    if (!userId) return
    // Capture userId now — not inside the timeout — so sign-out can't null it before it fires
    pendingSyncRef.current = { playlistId, userId, songs }
    clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      const pending = pendingSyncRef.current
      if (!pending) return
      pendingSyncRef.current = null
      upsertSongs(pending.playlistId, pending.userId, pending.songs).catch(err =>
        console.error('Supabase sync failed:', err)
      )
    }, 800)
  }

  async function flushPendingSync() {
    clearTimeout(syncTimeoutRef.current)
    const pending = pendingSyncRef.current
    if (!pending) return
    pendingSyncRef.current = null
    await upsertSongs(pending.playlistId, pending.userId, pending.songs).catch(err =>
      console.error('Supabase flush failed:', err)
    )
  }

  return (
    <PlaylistStateCtx.Provider value={state}>
      <PlaylistDispatchCtx.Provider value={{ dispatch, scheduleSyncToSupabase, flushPendingSync, getUserId: () => userRef.current?.id }}>
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
  const { dispatch, scheduleSyncToSupabase, flushPendingSync, getUserId } = usePlaylistDispatch()

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
    playlists:       state.playlists,
    activeId:        state.activeId,
    activePlaylist,
    isHydrating:     state.isHydrating,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    switchPlaylist,
    syncSongs,
    flushPendingSync,
  }
}
