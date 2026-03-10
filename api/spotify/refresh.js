export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { refresh_token } = req.body
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' })
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}))
      return res.status(tokenRes.status).json({
        error: err.error_description || 'Token refresh failed',
      })
    }

    const data = await tokenRes.json()
    const expires_at = Date.now() + data.expires_in * 1000

    return res.status(200).json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token ?? refresh_token, // Spotify may or may not rotate
      expires_at,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
