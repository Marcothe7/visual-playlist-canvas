import { createContext, useContext, useReducer } from 'react'

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  songs:                  [],
  songsLoading:           true,
  searchQuery:            '',
  deletedSnapshot:        null,   // null | Song[]  — for undo
  isPanelOpen:            false,
  isModalOpen:            false,
  showReveal:             false,
  recommendations:        [],
  recommendationHistory:  [],     // array of recommendation arrays (max 5)
  historyIndex:           -1,     // pointer into history
  recommendationsLoading: false,
  recommendationsError:   null,
  spotifyToken:           null,   // { access_token, refresh_token, expires_at } | null
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SONG':
      return {
        ...state,
        songs: state.songs.map(s =>
          s.id === action.payload.id ? { ...s, isSelected: !s.isSelected } : s
        ),
      }

    case 'ADD_SONG':
      return {
        ...state,
        songs: [{ ...action.payload, isSelected: false }, ...state.songs],
      }

    case 'DELETE_SONG': {
      const deleted = state.songs.find(s => s.id === action.payload.id)
      return {
        ...state,
        songs: state.songs.filter(s => s.id !== action.payload.id),
        deletedSnapshot: deleted ? [deleted] : null,
      }
    }

    case 'DELETE_SELECTED': {
      const deleted = state.songs.filter(s => s.isSelected)
      return {
        ...state,
        songs: state.songs.filter(s => !s.isSelected),
        deletedSnapshot: deleted.length > 0 ? deleted : null,
      }
    }

    case 'UNDO_DELETE':
      if (!state.deletedSnapshot) return state
      return {
        ...state,
        songs: [...state.deletedSnapshot, ...state.songs],
        deletedSnapshot: null,
      }

    case 'CLEAR_UNDO_SNAPSHOT':
      return { ...state, deletedSnapshot: null }

    case 'REORDER_SONGS':
      return { ...state, songs: action.payload }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        songs: state.songs.map(s => ({ ...s, isSelected: false })),
      }

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }

    case 'OPEN_PANEL':
      return { ...state, isPanelOpen: true }

    case 'CLOSE_PANEL':
      return {
        ...state,
        isPanelOpen: false,
        showReveal: false,
        recommendationsError: null,
        // keep recommendations and history intact
      }

    case 'OPEN_MODAL':
      return { ...state, isModalOpen: true }

    case 'CLOSE_MODAL':
      return { ...state, isModalOpen: false }

    case 'FETCH_RECOMMENDATIONS_START':
      return {
        ...state,
        recommendationsLoading: true,
        recommendationsError: null,
        isPanelOpen: true,
      }

    case 'FETCH_RECOMMENDATIONS_SUCCESS': {
      // Build history: discard any forward entries, append new, cap at 5
      const newHistory = [
        ...state.recommendationHistory.slice(0, state.historyIndex + 1),
        action.payload,
      ].slice(-5)
      return {
        ...state,
        recommendations:       action.payload,
        recommendationHistory: newHistory,
        historyIndex:          newHistory.length - 1,
        recommendationsLoading: false,
        recommendationsError:   null,
        showReveal:             true,
      }
    }

    case 'HISTORY_GO_BACK': {
      if (state.historyIndex <= 0) return state
      const idx = state.historyIndex - 1
      return {
        ...state,
        historyIndex:    idx,
        recommendations: state.recommendationHistory[idx],
      }
    }

    case 'HISTORY_GO_FORWARD': {
      if (state.historyIndex >= state.recommendationHistory.length - 1) return state
      const idx = state.historyIndex + 1
      return {
        ...state,
        historyIndex:    idx,
        recommendations: state.recommendationHistory[idx],
      }
    }

    case 'HIDE_REVEAL':
      return { ...state, showReveal: false }

    case 'FETCH_RECOMMENDATIONS_ERROR':
      return {
        ...state,
        recommendationsLoading: false,
        recommendationsError: action.payload,
      }

    case 'CLEAR_RECOMMENDATIONS':
      return {
        ...state,
        recommendations:       [],
        recommendationHistory: [],
        historyIndex:          -1,
        recommendationsError:  null,
      }

    case 'SONGS_LOADING':
      return { ...state, songsLoading: true }

    case 'SET_SONGS':
      return { ...state, songs: action.payload, songsLoading: false }

    case 'SPOTIFY_TOKEN_SET':
      return { ...state, spotifyToken: action.payload }

    case 'SPOTIFY_TOKEN_CLEAR':
      return { ...state, spotifyToken: null }

    default:
      return state
  }
}

// ─── Contexts ─────────────────────────────────────────────────────────────────
const AppStateContext    = createContext(null)
const AppDispatchContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
// Note: song persistence is handled by PlaylistContext (SYNC_SONGS action).
// AppContext manages transient UI state + in-memory song list.
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export function useAppDispatch() {
  const ctx = useContext(AppDispatchContext)
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider')
  return ctx
}
