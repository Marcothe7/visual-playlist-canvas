// Spotify service — OAuth lifecycle + data fetching via backend API routes.
// All Spotify credentials stay server-side; this file only stores user tokens
// in localStorage and builds OAuth redirect URLs.

const TOKEN_KEY = 'vpc-spotify-token'

// ─── Token storage ──────────────────────────────────────────────────────────

function saveToken(data) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data))
}

export function loadToken() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY))
  } catch {
    return null
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isTokenExpired(token) {
  // Refresh 60s before actual expiry to avoid mid-request failures
  return !token || Date.now() >= token.expires_at - 60_000
}

// ─── Internal: auto-refresh ──────────────────────────────────────────────────

async function refreshSpotifyToken(refreshToken) {
  const res = await fetch('/api/spotify/refresh', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const data = await res.json()
  saveToken(data)
  return data
}

export async function getValidToken() {
  const token = loadToken()
  if (!token) return null
  if (!isTokenExpired(token)) return token.access_token
  if (!token.refresh_token) { clearToken(); return null }
  try {
    const refreshed = await refreshSpotifyToken(token.refresh_token)
    return refreshed.access_token
  } catch {
    clearToken()
    return null
  }
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function isSpotifyAuthenticated() {
  const token = loadToken()
  return !!token && !isTokenExpired(token)
}

export function initiateSpotifyAuth() {
  const clientId    = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const redirectUri = import.meta.env.VITE_APP_URL
  if (!clientId || !redirectUri) {
    console.error('VITE_SPOTIFY_CLIENT_ID or VITE_APP_URL not set')
    return
  }
  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    redirect_uri:  redirectUri,
    scope:         'user-read-private user-read-email playlist-read-private',
    show_dialog:   'false',
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function handleAuthCallback(code) {
  const res = await fetch(`/api/spotify/callback?code=${encodeURIComponent(code)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Spotify auth callback failed')
  }
  const tokenData = await res.json()
  saveToken(tokenData)
  return tokenData
}

// ─── Data fetching ───────────────────────────────────────────────────────────

export async function fetchInitialSongs() {
  const res = await fetch('/api/spotify/featured')
  if (!res.ok) throw new Error('Failed to fetch featured songs')
  const { songs } = await res.json()
  return songs
}

export async function searchTracks(query, token) {
  if (!query?.trim()) return []

  if (!token) {
    const err = new Error('Spotify not connected')
    err.code = 'NO_TOKEN'
    throw err
  }

  const res = await fetch(
    `/api/spotify/search?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (res.status === 401) {
    const err = new Error('Spotify token expired')
    err.code = 'TOKEN_EXPIRED'
    throw err
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error || `Spotify search failed (HTTP ${res.status})`
    throw new Error(msg)
  }
  const { results } = await res.json()
  return results
}

// ─── Legacy stubs (kept so existing imports don't break) ─────────────────────
export const hasSpotifyCredentials  = () => true
export const hasSpotifyClientId     = () => !!import.meta.env.VITE_SPOTIFY_CLIENT_ID
