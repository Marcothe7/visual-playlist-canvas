// Spotify service — OAuth lifecycle + data fetching via backend API routes.
// All Spotify credentials stay server-side; this file only stores user tokens
// in localStorage and builds OAuth redirect URLs.

import { apiBase } from '@/lib/api'

const TOKEN_KEY = 'vpc-spotify-token'
const PKCE_KEY  = 'vpc-spotify-pkce'   // { verifier, state, ts }
const PKCE_TTL  = 10 * 60 * 1000       // 10 minutes — max time to complete auth

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

// ─── PKCE + OAuth state storage ─────────────────────────────────────────────
// Stored in localStorage so values survive:
//   • same-tab page navigation (web flow)
//   • app backgrounding/kill → reopen (mobile cold-start flow)

function savePkce(verifier, state) {
  localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, ts: Date.now() }))
}

export function loadPkce() {
  try {
    const data = JSON.parse(localStorage.getItem(PKCE_KEY))
    if (!data) return null
    if (Date.now() - data.ts > PKCE_TTL) {
      localStorage.removeItem(PKCE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearPkce() {
  localStorage.removeItem(PKCE_KEY)
}

// ─── PKCE helpers (Web Crypto — available in secure contexts + Capacitor WV) ─

function generateRandom(byteLen) {
  const buf = new Uint8Array(byteLen)
  crypto.getRandomValues(buf)
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function sha256Base64Url(plain) {
  const data   = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ─── Internal: auto-refresh ──────────────────────────────────────────────────

async function refreshSpotifyToken(refreshToken) {
  const res = await fetch(apiBase + '/api/spotify/refresh', {
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

// ─── In-flight guard ─────────────────────────────────────────────────────────
// Prevents duplicate Browser.open() calls if the user taps Login repeatedly.

let authInFlight = false

export function clearAuthInFlight() {
  authInFlight = false
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function isSpotifyAuthenticated() {
  const token = loadToken()
  return !!token && !isTokenExpired(token)
}

export async function initiateSpotifyAuth() {
  if (authInFlight) {
    console.warn('[Spotify] Auth already in progress — ignoring duplicate tap')
    return
  }

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  if (!clientId) {
    console.error('[Spotify] VITE_SPOTIFY_CLIENT_ID not set')
    return
  }

  // Generate PKCE verifier + challenge and a per-request state nonce
  const verifier   = generateRandom(64)
  const challenge  = await sha256Base64Url(verifier)
  const state      = generateRandom(16)
  savePkce(verifier, state)

  const { Capacitor } = await import('@capacitor/core')

  if (Capacitor.isNativePlatform()) {
    // ── Native path ─────────────────────────────────────────────────────
    const mobileRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI_MOBILE
    if (!mobileRedirectUri) {
      console.error('[Spotify] VITE_SPOTIFY_REDIRECT_URI_MOBILE not set in .env.mobile')
      clearPkce()
      return
    }

    authInFlight = true
    const { Browser } = await import('@capacitor/browser')

    // Release the lock if the user dismisses the browser without completing auth
    Browser.addListener('browserFinished', () => {
      // Small delay so a near-simultaneous callback can still arrive first
      setTimeout(() => {
        authInFlight = false
        Browser.removeAllListeners()
      }, 800)
    })

    const params = new URLSearchParams({
      client_id:             clientId,
      response_type:         'code',
      redirect_uri:          mobileRedirectUri,
      scope:                 'user-read-private user-read-email playlist-read-private',
      show_dialog:           'false',
      state,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    })

    console.log('[Spotify] Opening native auth browser')
    await Browser.open({
      url:               `https://accounts.spotify.com/authorize?${params}`,
      presentationStyle: 'popover',
    })
  } else {
    // ── Web path — navigate away (flag not needed, page reloads) ────────
    const redirectUri = import.meta.env.VITE_APP_URL
    if (!redirectUri) {
      console.error('[Spotify] VITE_APP_URL not set')
      clearPkce()
      return
    }
    sessionStorage.setItem('spotify-oauth-pending', '1')
    const params = new URLSearchParams({
      client_id:             clientId,
      response_type:         'code',
      redirect_uri:          redirectUri,
      scope:                 'user-read-private user-read-email playlist-read-private',
      show_dialog:           'false',
      state,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    })
    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }
}

/**
 * Exchange an authorization code for tokens.
 *
 * @param {string} code          - Authorization code from Spotify
 * @param {string} [redirectUri] - Redirect URI used (required for mobile)
 * @param {string} [receivedState] - State value from the callback URL (for CSRF check)
 */
export async function handleAuthCallback(code, redirectUri, receivedState) {
  // ── CSRF / state validation ──────────────────────────────────────────────
  const pkce = loadPkce()

  if (pkce) {
    if (!receivedState || pkce.state !== receivedState) {
      clearPkce()
      clearAuthInFlight()
      throw new Error('OAuth state mismatch — possible CSRF or stale auth request')
    }
  } else if (receivedState) {
    // PKCE data expired but state came back — treat as stale
    clearAuthInFlight()
    throw new Error('OAuth session expired — please try logging in again')
  }

  const verifier = pkce?.verifier ?? null

  let url = apiBase + `/api/spotify/callback?code=${encodeURIComponent(code)}`
  if (redirectUri) {
    url += `&redirect_uri=${encodeURIComponent(redirectUri)}`
  }
  if (verifier) {
    url += `&code_verifier=${encodeURIComponent(verifier)}`
  }

  try {
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Spotify auth callback failed')
    }
    const tokenData = await res.json()
    saveToken(tokenData)
    console.log('[Spotify] Auth successful — token stored')
    return tokenData
  } finally {
    clearPkce()
    clearAuthInFlight()
  }
}

// ─── Data fetching ───────────────────────────────────────────────────────────

export async function fetchInitialSongs() {
  const res = await fetch(apiBase + '/api/spotify/featured')
  if (!res.ok) throw new Error('Failed to fetch featured songs')
  const { songs } = await res.json()
  return songs
}

export async function searchTracks(query) {
  if (!query?.trim()) return []

  const res = await fetch(apiBase + `/api/spotify/search?q=${encodeURIComponent(query)}`)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error || `Spotify search failed (HTTP ${res.status})`
    throw new Error(msg)
  }
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Search is unavailable. Try again on the live site or use manual entry.')
  }
  return data.results ?? []
}

// ─── Audio features ──────────────────────────────────────────────────────────

/**
 * Fetch Spotify audio features for a list of Spotify track IDs.
 * Batches into groups of 100 (Spotify API limit).
 * Returns an array of audio feature objects with nulls removed.
 */
export async function getAudioFeatures(spotifyIds) {
  if (!spotifyIds?.length) return []

  const BATCH_SIZE = 100
  const results = []

  for (let i = 0; i < spotifyIds.length; i += BATCH_SIZE) {
    const batch = spotifyIds.slice(i, i + BATCH_SIZE)
    const res   = await fetch(apiBase + `/api/spotify/audio-features?ids=${batch.join(',')}`)
    if (!res.ok) {
      console.warn('Audio features fetch failed for batch', i)
      continue
    }
    const data = await res.json()
    results.push(...(data.audio_features ?? []))
  }

  return results
}

// ─── Import helpers ──────────────────────────────────────────────────────────

export async function getUserPlaylists() {
  const token = await getValidToken()
  if (!token) throw new Error('Spotify not connected')
  const res = await fetch(apiBase + '/api/spotify/user-playlists', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to fetch playlists')
  }
  const { playlists } = await res.json()
  return playlists ?? []
}

export async function getPlaylistTracks(playlistId) {
  const token = await getValidToken()
  if (!token) throw new Error('Spotify not connected')
  const res = await fetch(apiBase + `/api/spotify/playlist-tracks?id=${encodeURIComponent(playlistId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to fetch playlist tracks')
  }
  const { songs } = await res.json()
  return songs ?? []
}

export async function searchArtists(query) {
  if (!query?.trim()) return []
  const res = await fetch(apiBase + `/api/spotify/browse?action=search-artists&q=${encodeURIComponent(query)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Artist search failed')
  }
  const { artists } = await res.json()
  return artists ?? []
}

export async function getArtistAlbums(artistId) {
  const res = await fetch(apiBase + `/api/spotify/browse?action=artist-albums&id=${encodeURIComponent(artistId)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to fetch artist albums')
  }
  const { albums } = await res.json()
  return albums ?? []
}

export async function getAlbumTracks(albumId) {
  const res = await fetch(apiBase + `/api/spotify/album-tracks?id=${encodeURIComponent(albumId)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to fetch album tracks')
  }
  const { songs } = await res.json()
  return songs ?? []
}

// ─── Legacy stubs (kept so existing imports don't break) ─────────────────────
export const hasSpotifyCredentials  = () => true
export const hasSpotifyClientId     = () => !!import.meta.env.VITE_SPOTIFY_CLIENT_ID
