// Serverless endpoint: GET /api/spotify/artist-albums?id={artistId}
// Uses server-side Client Credentials.
// Returns albums + singles for the given artist.

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
    const r = await fetch(
      `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&limit=50&market=US`,
      { headers: { Authorization: `Bearer ${appToken}` } }
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
      type:        alb.album_type, // 'album' | 'single'
    }))

    return res.status(200).json({ albums })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
