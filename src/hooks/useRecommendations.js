import { useAppState, useAppDispatch } from '@/context/AppContext'
import { getRecommendations } from '@/services/claudeService'
import { searchTracks } from '@/services/spotifyService'
import { generateId } from '@/utils/generateId'

export function useRecommendations() {
  const state    = useAppState()
  const dispatch = useAppDispatch()

  async function fetchRecommendations(selectedSongs) {
    dispatch({ type: 'FETCH_RECOMMENDATIONS_START' })
    try {
      const recs = await getRecommendations(selectedSongs)
      // Enrich each recommendation with real album art + previewUrl from Spotify
      const token = state.spotifyToken?.access_token ?? null
      const enriched = await Promise.all(
        recs.map(async rec => {
          try {
            const results = await searchTracks(`${rec.title} ${rec.artist}`, token)
            const match = results[0]
            return {
              ...rec,
              albumArt:   match?.albumArt   ?? null,
              previewUrl: match?.previewUrl ?? null,
              year:       match?.year       ?? null,
            }
          } catch {
            return rec
          }
        })
      )
      const recsWithIds = enriched.map(r => ({ ...r, id: generateId() }))
      dispatch({ type: 'FETCH_RECOMMENDATIONS_SUCCESS', payload: recsWithIds })
    } catch (err) {
      dispatch({
        type: 'FETCH_RECOMMENDATIONS_ERROR',
        payload: err.message || 'Failed to get recommendations',
      })
    }
  }

  function clearRecommendations() {
    dispatch({ type: 'CLEAR_RECOMMENDATIONS' })
  }

  function closePanel() {
    dispatch({ type: 'CLOSE_PANEL' })
  }

  function hideReveal() {
    dispatch({ type: 'HIDE_REVEAL' })
  }

  function goBack() {
    dispatch({ type: 'HISTORY_GO_BACK' })
  }

  function goForward() {
    dispatch({ type: 'HISTORY_GO_FORWARD' })
  }

  return {
    recommendations:        state.recommendations,
    recommendationsLoading: state.recommendationsLoading,
    recommendationsError:   state.recommendationsError,
    isPanelOpen:            state.isPanelOpen,
    showReveal:             state.showReveal,
    canGoBack:              state.historyIndex > 0,
    canGoForward:           state.historyIndex < state.recommendationHistory.length - 1,
    historyIndex:           state.historyIndex,
    historyTotal:           state.recommendationHistory.length,
    fetchRecommendations,
    clearRecommendations,
    closePanel,
    hideReveal,
    goBack,
    goForward,
  }
}
