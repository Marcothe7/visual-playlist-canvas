/**
 * useMusicIdentity — orchestrates the full taste-analysis flow:
 * 1. Filter songs that have a Spotify ID
 * 2. Fetch Spotify audio features for those songs (batched) — optional
 * 3. Average the features → taste profile vector (if available)
 * 4. Call /api/music-identity (Claude) → identity object
 * 5. Persist to Supabase + dispatch to AppContext
 */

import { useState } from 'react'
import { useAppState, useAppDispatch } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { getAudioFeatures } from '@/services/spotifyService'
import { saveTasteProfile } from '@/services/supabaseService'

export const IDENTITY_MIN_SONGS = 5

function aggregateFeatures(features) {
  // features: array of Spotify audio feature objects
  const valid = features.filter(f => f && typeof f.energy === 'number')
  if (!valid.length) return null

  const sum = valid.reduce(
    (acc, f) => ({
      energy:           acc.energy           + f.energy,
      danceability:     acc.danceability     + f.danceability,
      valence:          acc.valence          + f.valence,
      tempo:            acc.tempo            + f.tempo,
      acousticness:     acc.acousticness     + f.acousticness,
      instrumentalness: acc.instrumentalness + f.instrumentalness,
    }),
    { energy: 0, danceability: 0, valence: 0, tempo: 0, acousticness: 0, instrumentalness: 0 }
  )

  const n = valid.length
  return {
    energy:           sum.energy           / n,
    danceability:     sum.danceability     / n,
    valence:          sum.valence          / n,
    tempo:            sum.tempo            / n,
    acousticness:     sum.acousticness     / n,
    instrumentalness: sum.instrumentalness / n,
  }
}

export function useMusicIdentity() {
  const { songs, tasteProfile, musicIdentity, identityLoading } = useAppState()
  const dispatch = useAppDispatch()
  const { user }  = useAuth()
  const [identityError, setIdentityError] = useState(null)

  const songsWithSpotifyId = songs.filter(s => s.spotifyId)
  const canAnalyze = songs.length >= IDENTITY_MIN_SONGS

  async function analyzeMyTaste() {
    if (!canAnalyze) return
    dispatch({ type: 'SET_IDENTITY_LOADING', payload: true })
    setIdentityError(null)

    try {
      // Audio features are optional — works without Spotify IDs too
      let profile = null
      if (songsWithSpotifyId.length >= 3) {
        try {
          const features = await getAudioFeatures(songsWithSpotifyId.map(s => s.spotifyId))
          profile = aggregateFeatures(features)
        } catch {
          // feature fetch failed — continue without it
        }
      }

      if (profile) dispatch({ type: 'SET_TASTE_PROFILE', payload: profile })

      // Song hints let Claude infer identity from artist/title even without audio features
      const songHints = songs.slice(0, 20).map(s => ({ title: s.title, artist: s.artist }))

      const res = await fetch('/api/music-identity', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ profile, songHints }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const { identity } = await res.json()

      dispatch({ type: 'SET_MUSIC_IDENTITY', payload: identity })

      if (user) {
        await saveTasteProfile(user.id, { ...(profile ?? {}), ...identity }).catch(() => {})
      }
    } catch (err) {
      console.error('analyzeMyTaste error:', err)
      setIdentityError('Could not analyze your taste. Please try again.')
    } finally {
      dispatch({ type: 'SET_IDENTITY_LOADING', payload: false })
    }
  }

  return {
    songs,
    songsWithSpotifyId,
    canAnalyze,
    tasteProfile,
    musicIdentity,
    identityLoading,
    identityError,
    analyzeMyTaste,
  }
}
