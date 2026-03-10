/**
 * claudeService.js
 *
 * Calls the /api/recommendations backend route, which proxies to the
 * Anthropic Messages API server-side. The API key never touches the browser.
 */

function parseRecommendations(items) {
  if (!Array.isArray(items)) throw new Error('Response is not an array')
  return items.map(item => ({
    title:    String(item.title || 'Unknown Title'),
    artist:   String(item.artist || 'Unknown Artist'),
    album:    String(item.album || ''),
    albumArt: item.albumArt || null,
    reason:   String(item.reason || ''),
  }))
}

export async function getRecommendations(songs) {
  const response = await fetch('/api/recommendations', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ songs }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      err?.error || `Recommendations request failed: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  return parseRecommendations(data.recommendations)
}
