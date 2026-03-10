function spotifyTrackToSong(track) {
  if (!track || !track.id) return null
  return {
    id:         track.id,
    title:      track.name,
    artist:     track.artists?.[0]?.name ?? '',
    album:      track.album?.name ?? '',
    albumArt:   track.album?.images?.[0]?.url ?? null,
    previewUrl: track.preview_url ?? null,
    genre:      [],
    year:       track.album?.release_date
                  ? parseInt(track.album.release_date)
                  : null,
    isSelected: false,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { q } = req.query
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'q query parameter is required' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' })
  }

  try {
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=12`,
      { headers: { Authorization: authHeader } }
    )

    if (spotifyRes.status === 401) {
      return res.status(401).json({ error: 'Spotify token expired', code: 'TOKEN_EXPIRED' })
    }

    if (!spotifyRes.ok) {
      const errBody = await spotifyRes.json().catch(() => ({}))
      return res.status(spotifyRes.status).json({
        error: errBody.error?.message || errBody.error_description || 'Spotify search failed',
        status: spotifyRes.status,
        spotify_error: errBody,
      })
    }

    const data    = await spotifyRes.json()
    const results = (data.tracks?.items ?? [])
      .map(spotifyTrackToSong)
      .filter(Boolean)

    return res.status(200).json({ results })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
