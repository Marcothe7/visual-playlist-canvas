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

/**
 * Get top battle winners from battleRatings + songs to send as extra context.
 * Returns the top 3 songs by ELO rating, if available.
 */
function getTopBattleWinners(battleRatings, songs) {
  if (!battleRatings || !songs?.length) return []
  return [...songs]
    .filter(s => battleRatings[s.id] !== undefined)
    .sort((a, b) => (battleRatings[b.id] ?? 1000) - (battleRatings[a.id] ?? 1000))
    .slice(0, 3)
    .map(s => ({ title: s.title, artist: s.artist }))
}

export async function getRecommendations(songs, { tasteProfile, battleRatings, allSongs } = {}) {
  const topBattleWinners = getTopBattleWinners(battleRatings, allSongs)

  const response = await fetch('/api/recommendations', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ songs, tasteProfile: tasteProfile ?? null, topBattleWinners }),
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
