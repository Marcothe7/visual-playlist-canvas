// Serverless endpoint: GET /api/spotify/user-playlists
// Requires Authorization: Bearer {user_access_token} header.
// Returns the authenticated user's Spotify playlists.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userToken = req.headers.authorization?.replace('Bearer ', '')
  if (!userToken) {
    return res.status(401).json({ error: 'Spotify user token required' })
  }

  try {
    const r = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${userToken}` },
    })

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return res.status(r.status).json({ error: err.error?.message || 'Failed to fetch playlists' })
    }

    const data = await r.json()
    const playlists = (data.items ?? []).map(pl => ({
      id:         pl.id,
      name:       pl.name,
      imageUrl:   pl.images?.[0]?.url ?? null,
      trackCount: pl.tracks?.total ?? 0,
    }))

    return res.status(200).json({ playlists })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
