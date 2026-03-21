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

  // Mobile sends redirect_uri=visualplaylist://callback explicitly.
  // Web omits it and we fall back to the app's public URL.
  // Note: VITE_ prefix on a server-side var is unusual but correct here —
  // Vercel exposes all project env vars to serverless functions regardless of prefix.
  // The same var is also baked into the browser bundle by Vite for building the auth URL,
  // so a single entry in the Vercel dashboard covers both sides.
  const ALLOWED_REDIRECT_URIS = [
    process.env.VITE_APP_URL,
    'visualplaylist://callback',
  ].filter(Boolean)
  const redirectUri = req.query.redirect_uri || process.env.VITE_APP_URL

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ error: 'Spotify credentials not configured' })
  }
  if (!ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect_uri' })
  }

  // PKCE: if the client sent a code_verifier, pass it to Spotify.
  // Required when the auth request included code_challenge (PKCE flow).
  const codeVerifier = req.query.code_verifier || null

  try {
    const tokenBody = new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri,
    })
    if (codeVerifier) tokenBody.set('code_verifier', codeVerifier)

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: tokenBody.toString(),
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
