// Serverless endpoint: GET /api/spotify/playlist-tracks?id={playlistId}
// Requires Authorization: Bearer {user_access_token} header.
// Fetches all tracks (handles Spotify pagination) and maps them to song objects.

function spotifyTrackToSong(track) {
  if (!track || !track.id) return null
  return {
    id:         track.id,
    title:      track.name,
    artist:     track.artists?.[0]?.name ?? '',
    album:      track.album?.name ?? '',
    albumArt:   track.album?.images?.[0]?.url ?? null,
    previewUrl: track.preview_url ?? null,
    genre:      [],
    year:       track.album?.release_date ? parseInt(track.album.release_date) : null,
    spotifyId:  track.id,
    isSelected: false,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id?.trim()) {
    return res.status(400).json({ error: 'id query parameter is required' })
  }

  const userToken = req.headers.authorization?.replace('Bearer ', '')
  if (!userToken) {
    return res.status(401).json({ error: 'Spotify user token required' })
  }

  try {
    const safeLimit = Math.min(50, 50)
    const songs = []
    let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=${safeLimit}`

    while (url) {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${userToken}` },
      })

      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || 'Failed to fetch tracks' })
      }

      const data = await r.json()
      ;(data.items ?? []).forEach(item => {
        // item.track can be null for local files or deleted tracks
        const song = spotifyTrackToSong(item?.track)
        if (song) songs.push(song)
      })

      console.log('Playlist tracks page:', data.items?.length ?? 0, 'total so far:', songs.length)
      url = data.next ?? null
    }

    console.log('Playlist tracks:', songs.length)
    return res.status(200).json({ songs })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
