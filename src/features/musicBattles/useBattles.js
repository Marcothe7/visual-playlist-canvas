/**
 * useBattles — manages Music Battle state.
 * Picks random song pairs, resolves battles with ELO ratings,
 * tracks streak + history, and syncs to Supabase when signed in.
 */

import { useState, useCallback, useEffect } from 'react'
import { useAppState, useAppDispatch } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { computeElo, DEFAULT_RATING, ratingDelta } from './eloRating'
import { saveBattleResult, upsertSongRatings, fetchSongRatings } from '@/services/supabaseService'

function pickRandomPair(songs, exclude1Id, exclude2Id) {
  const pool = songs.filter(s => s.id !== exclude1Id && s.id !== exclude2Id)
  if (pool.length < 2) return null
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1]]
}

export function useBattles() {
  const { songs, battleRatings, battleHistory } = useAppState()
  const dispatch = useAppDispatch()
  const { user }  = useAuth()

  const [pair,   setPair]   = useState(null)   // [songA, songB]
  const [result, setResult] = useState(null)   // { winnerId, loserId, deltaWinner, deltaLoser }
  const [streak, setStreak] = useState(0)

  // Pick initial pair when songs are available
  useEffect(() => {
    if (songs.length >= 2 && !pair) {
      setPair(pickRandomPair(songs))
    }
  }, [songs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load ratings from Supabase when user signs in (takes priority over localStorage)
  useEffect(() => {
    if (!user) return
    fetchSongRatings(user.id).then(ratings => {
      if (Object.keys(ratings).length > 0) {
        dispatch({ type: 'HYDRATE_BATTLE_DATA', payload: { ratings } })
        try { localStorage.setItem('vpc_battleRatings', JSON.stringify(ratings)) } catch {}
      }
    }).catch(() => {})
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function getRating(songId) {
    return battleRatings[songId] ?? DEFAULT_RATING
  }

  async function resolveBattle(winnerId) {
    if (!pair) return
    const [songA, songB] = pair
    const aWon = winnerId === songA.id

    const rA = getRating(songA.id)
    const rB = getRating(songB.id)
    const { newA, newB } = computeElo(rA, rB, aWon)

    const winner = aWon ? songA : songB
    const loser  = aWon ? songB : songA
    const deltaW = ratingDelta(getRating(winner.id), aWon ? newA : newB)
    const deltaL = ratingDelta(getRating(loser.id),  aWon ? newB : newA)

    // Update ratings in AppContext
    const newRatings = {
      ...battleRatings,
      [songA.id]: newA,
      [songB.id]: newB,
    }
    dispatch({ type: 'UPDATE_BATTLE_RATINGS', payload: { [songA.id]: newA, [songB.id]: newB } })

    // Record battle result
    const battleResult = {
      winnerId:     winner.id,
      winnerTitle:  winner.title,
      winnerArtist: winner.artist,
      loserId:      loser.id,
      loserTitle:   loser.title,
      loserArtist:  loser.artist,
      date:         new Date().toISOString(),
    }
    dispatch({ type: 'ADD_BATTLE_RESULT', payload: battleResult })

    setStreak(s => s + 1)
    setResult({ winnerId: winner.id, loserId: loser.id, deltaWinner: deltaW, deltaLoser: deltaL })

    // Persist to Supabase
    if (user) {
      const songsMap = Object.fromEntries(songs.map(s => [s.id, s]))
      saveBattleResult(user.id, battleResult).catch(() => {})
      upsertSongRatings(user.id, newRatings, songsMap).catch(() => {})
    }

    // Auto-advance after animation (1.4s)
    setTimeout(() => {
      setResult(null)
      setPair(pickRandomPair(songs, songA.id, songB.id))
    }, 1400)
  }

  // Rankings: songs sorted by ELO descending (only those with a rating)
  const rankings = [...songs]
    .filter(s => battleRatings[s.id] !== undefined)
    .sort((a, b) => (battleRatings[b.id] ?? DEFAULT_RATING) - (battleRatings[a.id] ?? DEFAULT_RATING))
    .slice(0, 10)
    .map(s => ({ ...s, rating: battleRatings[s.id] ?? DEFAULT_RATING }))

  function nextPair() {
    setResult(null)
    setPair(pickRandomPair(songs))
  }

  return {
    pair,
    result,
    streak,
    rankings,
    battleHistory,
    getRating,
    resolveBattle,
    nextPair,
    hasSongs: songs.length >= 2,
  }
}
