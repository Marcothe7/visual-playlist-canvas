// Serverless endpoint: GET /api/spotify/audio-features?ids=id1,id2,...
// Returns Spotify audio features for up to 100 track IDs per call.
// Uses server-side Client Credentials so the browser never touches secrets.

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

  const { ids } = req.query
  if (!ids || !ids.trim()) {
    return res.status(400).json({ error: 'ids query parameter is required' })
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const appToken = await getClientCredentialsToken(clientId, clientSecret)

    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(ids)}`,
      { headers: { Authorization: `Bearer ${appToken}` } }
    )

    if (!featuresRes.ok) {
      const errBody = await featuresRes.json().catch(() => ({}))
      return res.status(featuresRes.status).json({
        error: errBody.error?.message || 'Spotify audio-features request failed',
      })
    }

    const data = await featuresRes.json()
    // Filter out nulls (tracks Spotify couldn't find audio features for)
    const audio_features = (data.audio_features ?? []).filter(Boolean)
    return res.status(200).json({ audio_features })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
