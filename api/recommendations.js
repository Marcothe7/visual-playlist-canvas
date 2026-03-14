const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a bold, adventurous music curator with deep knowledge of obscure and mainstream music across all genres and eras.
When given a playlist, recommend tracks that match the SONIC FEEL — the mood, energy, tempo, and texture — but push beyond the obvious.

Rules you MUST follow:
- At least 3 of the 5 recommendations must be from artists NOT already in the input playlist.
- If you recommend the same artist as an input track, pick a deep cut, B-side, or lesser-known album track — NEVER their most-streamed or most recognizable song.
- Vary the eras: mix older classics with newer tracks when it fits the vibe.
- Think laterally across adjacent genres — if the playlist has indie rock, try shoegaze, post-punk, or art pop.
- Prioritize interesting, lesser-known gems over obvious chart hits.
- You MUST respond with a valid JSON array only — no markdown fences, no explanation, no extra text.
- Each object must have exactly these fields: title, artist, album, albumArt, reason.
- Set albumArt to null. reason should be 1–2 punchy sentences on why this track fits the vibe.`

function buildUserPrompt(songs, tasteProfile, topBattleWinners) {
  const list = songs
    .map((s, i) => `${i + 1}. "${s.title}" by ${s.artist}${s.album ? ` (${s.album})` : ''}${s.year ? `, ${s.year}` : ''}${s.genre?.length ? ` [${s.genre.join(', ')}]` : ''}`)
    .join('\n')

  // Optional taste profile context
  let profileContext = ''
  if (tasteProfile && typeof tasteProfile.energy === 'number') {
    const energyLabel    = tasteProfile.energy    > 0.7 ? 'high'   : tasteProfile.energy    > 0.4 ? 'medium' : 'low'
    const valenceLabel   = tasteProfile.valence   > 0.6 ? 'happy'  : tasteProfile.valence   > 0.35 ? 'neutral' : 'melancholic'
    const danceLabel     = tasteProfile.danceability > 0.7 ? 'highly danceable' : tasteProfile.danceability > 0.4 ? 'moderately danceable' : 'non-danceable'
    profileContext = `
Listener's audio taste profile: ${energyLabel} energy, ${valenceLabel} mood, ${danceLabel}.
Use this to calibrate the sonic feel — expand their palette thoughtfully, don't just mirror it.`
  }

  // Optional battle winner context
  let battleContext = ''
  if (topBattleWinners?.length) {
    const winnerList = topBattleWinners.map(w => `"${w.title}" by ${w.artist}`).join(', ')
    battleContext = `\nThe listener has voted for these songs in head-to-head battles: ${winnerList}. Weight recommendations toward songs that share sonic DNA with these winners.`
  }

  return `Based on this playlist:
${list}
${profileContext}${battleContext}

Recommend exactly 5 songs that match the sonic vibe of this playlist. Be bold and surprising — avoid the most famous songs by these artists.
Frame the "reason" field as "You might like this because…" followed by 1–2 punchy sentences about what connects it to their taste.
Return ONLY a JSON array with objects: { "title": string, "artist": string, "album": string, "albumArt": null, "reason": string }
Do not include any text before or after the JSON array.`
}

function parseRecommendations(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Response is not an array')
  return parsed.map(item => ({
    title:    String(item.title || 'Unknown Title'),
    artist:   String(item.artist || 'Unknown Artist'),
    album:    String(item.album || ''),
    albumArt: item.albumArt || null,
    reason:   String(item.reason || ''),
  }))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { songs, tasteProfile, topBattleWinners } = req.body
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: 'songs array is required' })
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key':        apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildUserPrompt(songs, tasteProfile, topBattleWinners) }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: err?.error?.message || `Anthropic API error: ${response.status}`,
      })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text ?? ''
    const recommendations = parseRecommendations(text)

    return res.status(200).json({ recommendations })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
