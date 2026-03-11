import { useEffect, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '@/context/AppContext'
import { usePlaylists } from '@/context/PlaylistContext'
import { useAudio } from '@/context/AudioContext'
import { useAuth } from '@/context/AuthContext'
import { Header } from '@/components/Header/Header'
import { SongGrid } from '@/components/SongGrid/SongGrid'
import { SelectionBar } from '@/components/SelectionBar/SelectionBar'
import { RecommendationPanel } from '@/components/RecommendationPanel/RecommendationPanel'
import { AddSongModal } from '@/components/AddSongModal/AddSongModal'
import { RecommendationReveal } from '@/components/RecommendationReveal/RecommendationReveal'
import { NowPlayingBar } from '@/components/NowPlayingBar/NowPlayingBar'
import { UndoToast } from '@/components/UndoToast/UndoToast'
import { AuthModal } from '@/components/AuthModal/AuthModal'
import { BottomNav } from '@/components/BottomNav/BottomNav'
import { fetchInitialSongs, handleAuthCallback, initiateSpotifyAuth, loadToken, isTokenExpired } from '@/services/spotifyService'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getGradientFromString } from '@/utils/colorFromString'
import { fetchPreferences, upsertPreferences, fetchRecommendationHistory } from '@/services/supabaseService'
import styles from './App.module.css'

export default function App() {
  const { isPanelOpen, isModalOpen, songs, songsLoading, spotifyToken } = useAppState()
  const dispatch = useAppDispatch()
  const { activeId, activePlaylist, syncSongs } = usePlaylists()
  const { playingId } = useAudio()
  const { user } = useAuth()

  const prevActiveIdRef = useRef(activeId)

  // Grid density — persisted to localStorage, synced with Supabase when authed
  const [density, setDensity] = useState(
    () => localStorage.getItem('vpc-grid-density') || 'normal'
  )

  // Load preferences from Supabase when user signs in
  useEffect(() => {
    if (!user) return
    fetchPreferences(user.id)
      .then(prefs => {
        if (prefs?.grid_density) {
          setDensity(prefs.grid_density)
          localStorage.setItem('vpc-grid-density', prefs.grid_density)
        }
      })
      .catch(() => {}) // silently fall back to localStorage value
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seed recommendation history from Supabase when user signs in
  useEffect(() => {
    if (!user) return
    fetchRecommendationHistory(user.id, 5)
      .then(historyRows => {
        if (!historyRows?.length) return
        const recSets = historyRows.map(r => r.recs)
        dispatch({ type: 'SEED_RECOMMENDATION_HISTORY', payload: recSets })
      })
      .catch(() => {})
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDensityChange(d) {
    setDensity(d)
    localStorage.setItem('vpc-grid-density', d)
    if (user) {
      upsertPreferences(user.id, { grid_density: d }).catch(() => {})
    }
  }

  useKeyboardShortcuts()

  // Hydrate Spotify token from localStorage on boot
  useEffect(() => {
    const stored = loadToken()
    if (stored && !isTokenExpired(stored)) {
      dispatch({ type: 'SPOTIFY_TOKEN_SET', payload: stored })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Spotify OAuth callback (?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return
    window.history.replaceState({}, '', window.location.pathname)
    handleAuthCallback(code)
      .then(tokenData => dispatch({ type: 'SPOTIFY_TOKEN_SET', payload: tokenData }))
      .catch(err => console.error('Spotify auth failed:', err))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load songs when app starts or playlist switches
  useEffect(() => {
    const prevActiveId = prevActiveIdRef.current
    prevActiveIdRef.current = activeId

    if (prevActiveId !== activeId) {
      dispatch({ type: 'SET_SONGS', payload: activePlaylist?.songs ?? [] })
      return
    }

    if (!songsLoading) return

    if (activePlaylist?.songs?.length > 0) {
      dispatch({ type: 'SET_SONGS', payload: activePlaylist.songs })
    } else {
      fetchInitialSongs()
        .then(s => dispatch({ type: 'SET_SONGS', payload: s }))
        .catch(() => dispatch({ type: 'SET_SONGS', payload: [] }))
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist songs to PlaylistContext whenever they change
  useEffect(() => {
    if (!songsLoading) {
      syncSongs(activeId, songs)
    }
  }, [songs, songsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  function openModal()  { dispatch({ type: 'OPEN_MODAL' }) }
  function closeModal() { dispatch({ type: 'CLOSE_MODAL' }) }

  // Ambient glow colors from the currently playing song
  const playingSong = playingId ? songs.find(s => s.id === playingId) : null
  const ambientColors = playingSong
    ? getGradientFromString(playingSong.artist + (playingSong.album || ''))
    : null

  return (
    <div className={`${styles.layout} ${isPanelOpen ? styles.panelOpen : ''}`}>
      {ambientColors && (
        <div
          key={playingId}
          className={styles.ambientGlow}
          style={{ '--ambient-from': ambientColors.from, '--ambient-to': ambientColors.to }}
          aria-hidden="true"
        />
      )}

      <div className={styles.main}>
        <Header
            onAddSong={openModal}
            density={density}
            onDensityChange={handleDensityChange}
            spotifyConnected={!!spotifyToken}
            onSpotifyConnect={initiateSpotifyAuth}
          />
        <SongGrid density={density} />
      </div>

      <RecommendationPanel />
      <NowPlayingBar />
      <SelectionBar />
      <UndoToast />
      <AddSongModal isOpen={isModalOpen} onClose={closeModal} />
      <RecommendationReveal />
      <AuthModal />
      <BottomNav onAddSong={openModal} />
    </div>
  )
}
