// Serverless endpoint: POST /api/deezer-preview
// Accepts { songs: [{id, title, artist}] }
// Returns { previews: { [id]: previewUrl | null } }
// Used to enrich songs that have no preview URL (e.g. loaded from Supabase without one).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { songs } = req.body ?? {}
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(200).json({ previews: {} })
  }

  const previews = {}

  await Promise.all(
    songs.map(async ({ id, title, artist }) => {
      try {
        const q   = encodeURIComponent(`${title} ${artist}`)
        const r   = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`)
        if (!r.ok) { previews[id] = null; return }
        const d   = await r.json()
        previews[id] = d.data?.[0]?.preview ?? null
      } catch {
        previews[id] = null
      }
    })
  )

  return res.status(200).json({ previews })
}
