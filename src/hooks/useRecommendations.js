import { useAppState, useAppDispatch } from '@/context/AppContext'
import { useCredits } from '@/context/CreditContext'
import { getRecommendations, NoCreditError } from '@/services/claudeService'
import { searchTracks } from '@/services/spotifyService'
import { generateId } from '@/utils/generateId'

export function useRecommendations() {
  const state    = useAppState()
  const dispatch = useAppDispatch()
  const { hasCredits, refreshCredits, openPaywall } = useCredits()

  async function fetchRecommendations(selectedSongs) {
    // Pre-check credits (UX optimization — server enforces too)
    if (!hasCredits) {
      openPaywall()
      return
    }

    dispatch({ type: 'FETCH_RECOMMENDATIONS_START' })
    try {
      // Pass taste profile and battle data for improved context-aware recommendations
      const recs = await getRecommendations(selectedSongs, {
        tasteProfile:  state.tasteProfile,
        battleRatings: state.battleRatings,
        allSongs:      state.songs,
      })
      // Enrich each recommendation with real album art + previewUrl from Spotify
      const enriched = await Promise.all(
        recs.map(async rec => {
          try {
            const results = await searchTracks(`${rec.title} ${rec.artist}`)
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

      // Refresh credits to sync with server-side deduction
      refreshCredits()
    } catch (err) {
      if (err instanceof NoCreditError) {
        dispatch({ type: 'FETCH_RECOMMENDATIONS_ERROR', payload: 'No AI recommendation credits remaining' })
        openPaywall()
        return
      }
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
