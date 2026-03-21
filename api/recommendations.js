import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const FREE_WEEKLY = 3

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

  let profileContext = ''
  if (tasteProfile && typeof tasteProfile.energy === 'number') {
    const energyLabel    = tasteProfile.energy    > 0.7 ? 'high'   : tasteProfile.energy    > 0.4 ? 'medium' : 'low'
    const valenceLabel   = tasteProfile.valence   > 0.6 ? 'happy'  : tasteProfile.valence   > 0.35 ? 'neutral' : 'melancholic'
    const danceLabel     = tasteProfile.danceability > 0.7 ? 'highly danceable' : tasteProfile.danceability > 0.4 ? 'moderately danceable' : 'non-danceable'
    profileContext = `
Listener's audio taste profile: ${energyLabel} energy, ${valenceLabel} mood, ${danceLabel}.
Use this to calibrate the sonic feel — expand their palette thoughtfully, don't just mirror it.`
  }

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

// ─── Credit helpers ─────────────────────────────────────────────────────────

function getNextMondayUTC() {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? 1 : 8 - day
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return next.toISOString()
}

async function checkAndDeductCredit(supabaseAdmin, userId) {
  // Fetch user credits
  let { data: credits, error } = await supabaseAdmin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // Create row for new user
    const { data: created, error: createErr } = await supabaseAdmin
      .from('user_credits')
      .insert({
        user_id: userId,
        free_credits: FREE_WEEKLY,
        purchased_credits: 0,
        is_pro: false,
        week_reset_at: getNextMondayUTC(),
      })
      .select()
      .single()
    if (createErr) throw createErr
    credits = created
  } else if (error) {
    throw error
  }

  // Lazy weekly reset
  if (new Date() >= new Date(credits.week_reset_at)) {
    const { data: reset, error: resetErr } = await supabaseAdmin
      .from('user_credits')
      .update({ free_credits: FREE_WEEKLY, week_reset_at: getNextMondayUTC() })
      .eq('user_id', userId)
      .select()
      .single()
    if (resetErr) throw resetErr
    credits = reset
  }

  // Pro — allow without deduction
  if (credits.is_pro && credits.pro_expires_at && new Date(credits.pro_expires_at) > new Date()) {
    return { allowed: true, credits }
  }

  // Deduct from free first, then purchased
  if (credits.free_credits > 0) {
    const { data, error: deductErr } = await supabaseAdmin
      .from('user_credits')
      .update({ free_credits: credits.free_credits - 1 })
      .eq('user_id', userId)
      .select()
      .single()
    if (deductErr) throw deductErr
    return { allowed: true, credits: data }
  }

  if (credits.purchased_credits > 0) {
    const { data, error: deductErr } = await supabaseAdmin
      .from('user_credits')
      .update({ purchased_credits: credits.purchased_credits - 1 })
      .eq('user_id', userId)
      .select()
      .single()
    if (deductErr) throw deductErr
    return { allowed: true, credits: data }
  }

  return { allowed: false, credits }
}

// ─── Main handler ───────────────────────────────────────────────────────────

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

  // ─── Credit check (server-side enforcement) ───────────────────────────
  const authHeader = req.headers.authorization
  let creditsRemaining = null

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey)

      // Verify JWT and get user
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
      if (authErr || !user) {
        return res.status(401).json({ error: 'Invalid auth token' })
      }

      try {
        const result = await checkAndDeductCredit(supabaseAdmin, user.id)
        if (!result.allowed) {
          return res.status(402).json({
            error: 'NO_CREDITS',
            creditsRemaining: 0,
            message: 'No AI recommendation credits remaining',
          })
        }
        creditsRemaining = (result.credits.free_credits ?? 0) + (result.credits.purchased_credits ?? 0)
        if (result.credits.is_pro) creditsRemaining = -1 // -1 = unlimited
      } catch (err) {
        // If credit check fails, still allow the request (graceful degradation)
        console.error('Credit check failed:', err.message)
      }
    }
  }
  // Unauthenticated requests: allowed (client-side localStorage tracking only)

  // ─── Call Claude API ──────────────────────────────────────────────────
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

    const result = { recommendations }
    if (creditsRemaining !== null) result.creditsRemaining = creditsRemaining

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
