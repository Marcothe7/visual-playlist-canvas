/**
 * useMusicMap — computes 2D coordinates for songs based on audio features.
 * X-axis: valence (0 = sad/left,    1 = happy/right)
 * Y-axis: energy  (0 = calm/bottom, 1 = energetic/top) — inverted on screen so up = energetic
 *
 * Coordinates are centered at (0,0) in SVG units; SongNode adds mapWidth/2, mapHeight/2.
 * Songs without audio features get a stable hash-based position (consistent across reloads).
 */

import { useState, useEffect } from 'react'
import { useAppState } from '@/context/AppContext'
import { getAudioFeatures } from '@/services/spotifyService'

const MAP_W  = 800
const MAP_H  = 600
const JITTER = 20   // SVG units — prevents exact overlap for songs with identical features

// Deterministic −0.5…+0.5 value from a string seed (stable across reloads)
function seeded(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) & 0x7fffffff
  }
  return h / 0x7fffffff - 0.5
}

export function useMusicMap() {
  const { songs, recommendations, tasteProfile } = useAppState()
  const [songNodes, setSongNodes]     = useState([])
  const [recNodes,  setRecNodes]      = useState([])
  const [loading,   setLoading]       = useState(false)
  const [error,     setError]         = useState(null)
  const [featuresCache, setFeaturesCache] = useState({}) // { spotifyId: audioFeatures }

  useEffect(() => {
    buildNodes()
  }, [songs, recommendations, tasteProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function buildNodes() {
    setLoading(true)
    setError(null)

    try {
      // IDs we still need to fetch (not in cache)
      const allSongs  = songs
      const allRecs   = recommendations

      const idsNeeded = [
        ...allSongs.filter(s => s.spotifyId && !featuresCache[s.spotifyId]).map(s => s.spotifyId),
        ...allRecs.filter(r => r.spotifyId  && !featuresCache[r.spotifyId]).map(r => r.spotifyId),
      ]

      let newCache = { ...featuresCache }

      if (idsNeeded.length > 0) {
        const features = await getAudioFeatures(idsNeeded)
        features.forEach(f => {
          if (f?.id) newCache[f.id] = f
        })
        setFeaturesCache(newCache)
      }

      // Build song nodes
      const nodes = allSongs.map(song => {
        const f  = newCache[song.spotifyId] ?? null
        const jx = (Math.random() - 0.5) * JITTER
        const jy = (Math.random() - 0.5) * JITTER
        // IMPORTANT: use prefix-based seeds ('x:'+id vs 'y:'+id) so the hash
        // diverges from the first character. Suffix 'x'/'y' (ASCII 120/121) differ
        // by only 1 bit, producing nearly identical hashes → diagonal line bug.
        const fallbackX = seeded('x:' + song.id) * MAP_W
        const fallbackY = seeded('y:' + song.id) * MAP_H
        const x = f ? (f.valence - 0.5) * MAP_W + jx : fallbackX
        const y = f ? (0.5 - f.energy)  * MAP_H + jy : fallbackY
        if (f) console.log('[MusicMap]', song.title, '| valence:', f.valence.toFixed(3), '| energy:', f.energy.toFixed(3), '| x:', x.toFixed(1), '| y:', y.toFixed(1))
        return {
          id:         song.id,
          title:      song.title,
          artist:     song.artist,
          albumArt:   song.albumArt,
          previewUrl: song.previewUrl,
          // Centered SVG-space coords: x = valence (left=sad, right=happy),
          // y = energy inverted (up=energetic, down=calm). Fallback = stable hash spread.
          x,
          y,
          valence:    f ? f.valence : null,
          energy:     f ? f.energy  : null,
          hasFeatures: !!f,
          type: 'song',
        }
      })

      // Build recommendation nodes
      const rNodes = allRecs.map(rec => {
        const f  = newCache[rec.spotifyId] ?? null
        const jx = (Math.random() - 0.5) * JITTER
        const jy = (Math.random() - 0.5) * JITTER
        const x = f ? (f.valence - 0.5) * MAP_W + jx : seeded('x:' + rec.id) * MAP_W
        const y = f ? (0.5 - f.energy)  * MAP_H + jy : seeded('y:' + rec.id) * MAP_H
        return {
          id:         rec.id,
          title:      rec.title,
          artist:     rec.artist,
          albumArt:   rec.albumArt,
          previewUrl: rec.previewUrl,
          x,
          y,
          valence:    f ? f.valence : null,
          energy:     f ? f.energy  : null,
          hasFeatures: !!f,
          type: 'recommendation',
        }
      })

      setSongNodes(nodes)
      setRecNodes(rNodes)
    } catch (err) {
      setError('Could not load audio features for the map.')
      console.error('useMusicMap error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { songNodes, recNodes, loading, error, refresh: buildNodes }
}
