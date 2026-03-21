import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { handleAuthCallback, initiateSpotifyAuth, loadToken, isTokenExpired, clearAuthInFlight } from '@/services/spotifyService'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getGradientFromString } from '@/utils/colorFromString'
import { fetchPreferences, upsertPreferences, fetchRecommendationHistory, fetchSongRatings, fetchTasteProfile } from '@/services/supabaseService'
import { MusicIdentityPage } from '@/features/musicIdentity/MusicIdentityPage'
import { MusicMapPage } from '@/features/musicMap/MusicMapPage'
import { BattlePage } from '@/features/musicBattles/BattlePage'
import { SearchBar } from '@/components/SearchBar/SearchBar'
import { useIsMobile } from '@/hooks/useIsMobile'
import styles from './App.module.css'

const VIEW_TABS = [
  { id: 'library',  label: 'Library' },
  { id: 'map',      label: 'Map' },
  { id: 'battle',   label: 'Battle' },
  { id: 'identity', label: 'Identity' },
]

const SWIPE_ORDER = ['library', 'map', 'battle', 'identity']

const slideVariants = {
  enter:  (dir) => ({ x: dir <= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir <= 0 ? '-100%' : '100%', opacity: 0 }),
}

export default function App() {
  const { isPanelOpen, isModalOpen, songs, songsLoading, spotifyToken, activeView } = useAppState()
  const dispatch = useAppDispatch()
  const { activeId, activePlaylist, syncSongs } = usePlaylists()
  const { playingId } = useAudio()
  const { user } = useAuth()

  const prevActiveIdRef = useRef(activeId)
  const isMobile = useIsMobile()

  // Swipe navigation
  const touchStartRef = useRef(null)
  const [slideDir, setSlideDir] = useState(0)

  function handleTouchStart(e) {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(e) {
    if (!touchStartRef.current || activeView === 'map') return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.5) return
    const idx = SWIPE_ORDER.indexOf(activeView)
    if (dx < 0 && SWIPE_ORDER[idx + 1]) {
      setSlideDir(-1)
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: SWIPE_ORDER[idx + 1] })
    } else if (dx > 0 && SWIPE_ORDER[idx - 1]) {
      setSlideDir(1)
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: SWIPE_ORDER[idx - 1] })
    }
  }

  // User-visible error for failed Spotify auth (cleared on next login attempt)
  const [spotifyAuthError, setSpotifyAuthError] = useState(null)

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

  // Hydrate battle ratings + taste profile from Supabase when user signs in
  useEffect(() => {
    if (!user) return
    fetchSongRatings(user.id)
      .then(ratings => {
        if (ratings && Object.keys(ratings).length > 0) {
          dispatch({ type: 'HYDRATE_BATTLE_DATA', payload: { ratings, history: [] } })
        }
      })
      .catch(() => {})
    fetchTasteProfile(user.id)
      .then(profile => {
        if (!profile) return
        const { identity_name, identity_description, genre_distribution, ...audioFeatures } = profile
        dispatch({ type: 'SET_TASTE_PROFILE', payload: audioFeatures })
        if (identity_name) {
          dispatch({
            type: 'SET_MUSIC_IDENTITY',
            payload: {
              name: identity_name,
              description: identity_description,
              genreDistribution: genre_distribution ?? [],
              moodCharacteristics: [],
            },
          })
        }
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

  // Handle Spotify OAuth callback (?code=...) — web only
  useEffect(() => {
    // On native Capacitor the code arrives via appUrlOpen deep link, not the URL bar
    if (window.location.protocol === 'capacitor:') return

    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const error = params.get('error')
    const state = params.get('state')
    if (!code && !error) return

    window.history.replaceState({}, '', window.location.pathname)
    sessionStorage.removeItem('spotify-oauth-pending')

    if (error) {
      console.error('[Spotify] Auth denied by user or Spotify:', error)
      clearAuthInFlight()
      setSpotifyAuthError(error === 'access_denied' ? 'Spotify login was cancelled.' : `Spotify login failed: ${error}`)
      return
    }

    handleAuthCallback(code, undefined, state)
      .then(tokenData => {
        setSpotifyAuthError(null)
        dispatch({ type: 'SPOTIFY_TOKEN_SET', payload: tokenData })
      })
      .catch(err => {
        console.error('[Spotify] Auth failed (web):', err)
        setSpotifyAuthError('Spotify login failed. Please try again.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Spotify OAuth callback on native (deep link: visualplaylist://callback?code=...)
  useEffect(() => {
    if (window.location.protocol !== 'capacitor:') return  // web: nothing to do

    let appListener = null
    let mounted = true

    // Shared handler for the deep-link URL (works for both warm and cold starts)
    async function processDeepLink(url, Browser) {
      if (!url?.startsWith('visualplaylist://callback')) return

      // Always close the browser overlay, regardless of outcome
      try { await Browser.close() } catch { /* ignore if already closed */ }

      if (!mounted) return

      const search = url.split('?')[1] ?? ''
      const params = new URLSearchParams(search)
      const code   = params.get('code')
      const error  = params.get('error')
      const state  = params.get('state')

      if (error) {
        console.error('[Spotify] Auth denied (native):', error)
        clearAuthInFlight()
        setSpotifyAuthError(error === 'access_denied' ? 'Spotify login was cancelled.' : `Spotify login failed: ${error}`)
        return
      }
      if (!code) {
        console.error('[Spotify] Callback missing code')
        clearAuthInFlight()
        setSpotifyAuthError('Spotify login failed — no authorization code received.')
        return
      }

      const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI_MOBILE
      handleAuthCallback(code, redirectUri, state)
        .then(tokenData => {
          if (!mounted) return
          setSpotifyAuthError(null)
          dispatch({ type: 'SPOTIFY_TOKEN_SET', payload: tokenData })
        })
        .catch(err => {
          console.error('[Spotify] Auth failed (native):', err)
          if (mounted) setSpotifyAuthError('Spotify login failed. Please try again.')
        })
    }

    ;(async () => {
      const { App: CapApp } = await import('@capacitor/app')
      const { Browser }     = await import('@capacitor/browser')

      // ── Cold-start: app was killed and reopened via the deep link ───────────
      // getLaunchUrl() returns the URL that launched the app, if any.
      // On a warm appUrlOpen restart this will be null/empty.
      try {
        const launch = await CapApp.getLaunchUrl()
        if (launch?.url) {
          console.log('[Spotify] Processing cold-start deep link:', launch.url)
          await processDeepLink(launch.url, Browser)
        }
      } catch (err) {
        console.warn('[Spotify] getLaunchUrl failed:', err)
      }

      // ── Warm-start: app brought to foreground while already running ─────────
      appListener = await CapApp.addListener('appUrlOpen', async (event) => {
        console.log('[Spotify] appUrlOpen:', event.url)
        await processDeepLink(event.url, Browser)
      })
    })()

    return () => {
      mounted = false
      appListener?.remove()
    }
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

    // Always start with saved songs only — new users see an empty library
    dispatch({ type: 'SET_SONGS', payload: activePlaylist?.songs ?? [] })
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
            onSpotifyConnect={() => { setSpotifyAuthError(null); initiateSpotifyAuth() }}
          />
        {spotifyAuthError && (
          <div role="alert" style={{
            padding: '8px 16px',
            background: 'var(--color-error, #c0392b)',
            color: '#fff',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}>
            {spotifyAuthError}
          </div>
        )}
        <nav className={styles.viewTabs} aria-label="View navigation">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.viewTab} ${activeView === tab.id ? styles.viewTabActive : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: tab.id })}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div
          className={styles.viewHost}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="popLayout" custom={slideDir}>
            {activeView === 'library' && (
              <motion.div key="library" className={styles.viewSlide}
                custom={slideDir}
                variants={isMobile ? slideVariants : undefined}
                initial={isMobile ? 'enter' : false}
                animate="center"
                exit={isMobile ? 'exit' : undefined}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              >
                <SongGrid density={density} />
              </motion.div>
            )}
            {activeView === 'search' && (
              <motion.div key="search" className={styles.viewSlide}
                custom={slideDir}
                variants={isMobile ? slideVariants : undefined}
                initial={isMobile ? 'enter' : false}
                animate="center"
                exit={isMobile ? 'exit' : undefined}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              >
                <div className={styles.mobileSearchView}>
                  <SearchBar />
                </div>
                <SongGrid density={density} />
              </motion.div>
            )}
            {activeView === 'map' && (
              <motion.div key="map" className={styles.viewSlide}
                custom={slideDir}
                variants={isMobile ? slideVariants : undefined}
                initial={isMobile ? 'enter' : false}
                animate="center"
                exit={isMobile ? 'exit' : undefined}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              >
                <MusicMapPage />
              </motion.div>
            )}
            {activeView === 'battle' && (
              <motion.div key="battle" className={styles.viewSlide}
                custom={slideDir}
                variants={isMobile ? slideVariants : undefined}
                initial={isMobile ? 'enter' : false}
                animate="center"
                exit={isMobile ? 'exit' : undefined}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              >
                <BattlePage />
              </motion.div>
            )}
            {activeView === 'identity' && (
              <motion.div key="identity" className={styles.viewSlide}
                custom={slideDir}
                variants={isMobile ? slideVariants : undefined}
                initial={isMobile ? 'enter' : false}
                animate="center"
                exit={isMobile ? 'exit' : undefined}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              >
                <MusicIdentityPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <RecommendationPanel />
      <NowPlayingBar />
      {activeView === 'library' && <SelectionBar />}
      <UndoToast />
      <AddSongModal isOpen={isModalOpen} onClose={closeModal} />
      <RecommendationReveal />
      <AuthModal />
      <BottomNav onAddSong={openModal} />
    </div>
  )
}
