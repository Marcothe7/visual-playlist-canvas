// Serverless endpoint: GET /api/spotify/browse
// Uses server-side Client Credentials.
//
// ?action=search-artists&q={query}   → { artists: [{ id, name, imageUrl, genres }] }
// ?action=artist-albums&id={artistId} → { albums: [{ id, name, imageUrl, releaseDate, trackCount, type }] }

async function getClientCredentialsToken(clientId, clientSecret) {
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  })
  if (!tokenRes.ok) throw new Error('Failed to get Spotify app token')
  const data = await tokenRes.json()
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, q, id } = req.query

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const appToken = await getClientCredentialsToken(clientId, clientSecret)
    const authHeader = { Authorization: `Bearer ${appToken}` }
    const safeLimit = (n) => Math.min(n || 20, 50)

    // ── Search artists ───────────────────────────────────────────────────────
    if (action === 'search-artists') {
      if (!q?.trim()) return res.status(400).json({ error: 'q query parameter is required' })

      const r = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=${safeLimit(6)}`,
        { headers: authHeader }
      )
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || 'Artist search failed' })
      }
      const data = await r.json()
      const artists = (data.artists?.items ?? []).map(a => ({
        id:       a.id,
        name:     a.name,
        imageUrl: a.images?.[0]?.url ?? null,
        genres:   a.genres?.slice(0, 2) ?? [],
      }))
      return res.status(200).json({ artists })
    }

    // ── Artist albums ────────────────────────────────────────────────────────
    if (action === 'artist-albums') {
      if (!id?.trim()) return res.status(400).json({ error: 'id query parameter is required' })

      const r = await fetch(
        `https://api.spotify.com/v1/artists/${id}/albums?limit=${safeLimit(20)}`,
        { headers: authHeader }
      )
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || 'Failed to fetch albums' })
      }
      const data = await r.json()
      const albums = (data.items ?? []).map(alb => ({
        id:          alb.id,
        name:        alb.name,
        imageUrl:    alb.images?.[0]?.url ?? null,
        releaseDate: alb.release_date ?? '',
        trackCount:  alb.total_tracks ?? 0,
        type:        alb.album_type,
      }))
      return res.status(200).json({ albums })
    }

    return res.status(400).json({ error: 'Invalid action. Use search-artists or artist-albums.' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
