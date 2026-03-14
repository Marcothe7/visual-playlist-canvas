export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query
  if (!code) {
    return res.status(400).json({ error: 'No code provided' })
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri  = process.env.VITE_APP_URL

  if (!clientId || !clientSecret || !redirectUri) {
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
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}))
      return res.status(tokenRes.status).json({
        error: err.error_description || 'Token exchange failed',
      })
    }

    const { access_token, refresh_token, expires_in, scope } = await tokenRes.json()
    const expires_at = Date.now() + expires_in * 1000

    return res.status(200).json({ access_token, refresh_token, expires_at, scope })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
