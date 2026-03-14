// Serverless endpoint: GET /api/spotify/search-artists?q={query}
// Uses server-side Client Credentials — no user token needed.
// Returns up to 6 matching artists.

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

  const { q } = req.query
  if (!q?.trim()) {
    return res.status(400).json({ error: 'q query parameter is required' })
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const appToken = await getClientCredentialsToken(clientId, clientSecret)
    const r = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=6`,
      { headers: { Authorization: `Bearer ${appToken}` } }
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
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
