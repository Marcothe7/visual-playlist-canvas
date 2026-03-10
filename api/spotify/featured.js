const TOP_HITS_PLAYLIST_ID = '37i9dQZEVXbMDoHDwVN2tF' // Spotify Global Top 50

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
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Spotify token error: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const token = await getClientCredentialsToken(clientId, clientSecret)

    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${TOP_HITS_PLAYLIST_ID}/tracks?limit=50&fields=items(track(id,name,artists,album,preview_url))`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!tracksRes.ok) {
      return res.status(tracksRes.status).json({ error: 'Failed to fetch playlist tracks' })
    }

    const data  = await tracksRes.json()
    const songs = (data.items ?? [])
      .map(item => spotifyTrackToSong(item?.track))
      .filter(Boolean)

    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).json({ songs })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
