// Serverless endpoint: GET /api/spotify/album-tracks?id={albumId}
// Uses server-side Client Credentials.
// Fetches album metadata and tracks in parallel, returns mapped song objects.

function spotifyAlbumTrackToSong(track, album) {
  if (!track || !track.id) return null
  return {
    id:         track.id,
    title:      track.name,
    artist:     track.artists?.[0]?.name ?? '',
    album:      album.name ?? '',
    albumArt:   album.images?.[0]?.url ?? null,
    previewUrl: track.preview_url ?? null,
    genre:      [],
    year:       album.release_date ? parseInt(album.release_date) : null,
    spotifyId:  track.id,
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id?.trim()) {
    return res.status(400).json({ error: 'id query parameter is required' })
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const appToken = await getClientCredentialsToken(clientId, clientSecret)
    const authHeader = { Authorization: `Bearer ${appToken}` }

    // Fetch album info and track list in parallel
    const [albumRes, tracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/albums/${id}`,              { headers: authHeader }),
      fetch(`https://api.spotify.com/v1/albums/${id}/tracks?limit=50`, { headers: authHeader }),
    ])

    if (!albumRes.ok || !tracksRes.ok) {
      const err = await (albumRes.ok ? tracksRes : albumRes).json().catch(() => ({}))
      return res.status(400).json({ error: err.error?.message || 'Failed to fetch album data' })
    }

    const [albumData, tracksData] = await Promise.all([albumRes.json(), tracksRes.json()])

    const songs = (tracksData.items ?? [])
      .map(track => spotifyAlbumTrackToSong(track, albumData))
      .filter(Boolean)

    return res.status(200).json({ songs })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
