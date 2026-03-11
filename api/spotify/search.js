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

async function getDeezerPreview(title, artist) {
  try {
    const q   = encodeURIComponent(`${title} ${artist}`)
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`)
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0]?.preview ?? null
  } catch {
    return null
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

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const appToken  = await getClientCredentialsToken(clientId, clientSecret)
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10&market=US`,
      { headers: { Authorization: `Bearer ${appToken}` } }
    )

    if (!spotifyRes.ok) {
      const errBody = await spotifyRes.json().catch(() => ({}))
      return res.status(spotifyRes.status).json({
        error: errBody.error?.message || 'Spotify search failed',
        status: spotifyRes.status,
      })
    }

    const data    = await spotifyRes.json()
    const results = (data.tracks?.items ?? [])
      .map(spotifyTrackToSong)
      .filter(Boolean)

    // For tracks missing Spotify preview_url (deprecated for most markets),
    // fall back to Deezer which still provides 30s previews for free.
    await Promise.all(
      results.map(async (song) => {
        if (!song.previewUrl) {
          song.previewUrl = await getDeezerPreview(song.title, song.artist)
        }
      })
    )

    return res.status(200).json({ results })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
