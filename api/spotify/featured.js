// Curated search queries rotated to give varied initial songs.
// These use the /search endpoint which works fine with client credentials.
const SEED_QUERIES = [
  'top hits 2024',
  'popular songs 2024',
  'best songs ever',
]

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

    // Use search instead of playlist endpoint (playlists require user auth since 2024)
    const query = SEED_QUERIES[Math.floor(Math.random() * SEED_QUERIES.length)]
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: 'Failed to fetch featured tracks' })
    }

    const data  = await searchRes.json()
    const songs = (data.tracks?.items ?? [])
      .map(spotifyTrackToSong)
      .filter(Boolean)

    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).json({ songs })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
