import { supabase } from '@/lib/supabase'

function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

function requireOnline() {
  if (!isOnline()) throw new Error('You are offline. Changes will sync when you reconnect.')
}

// ─── Playlists ────────────────────────────────────────────────────────────────
export async function fetchPlaylists(userId) {
  requireOnline()
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createPlaylist(userId, name) {
  requireOnline()
  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePlaylist(playlistId) {
  requireOnline()
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
  if (error) throw error
}

export async function renamePlaylist(playlistId, name) {
  requireOnline()
  const { error } = await supabase
    .from('playlists')
    .update({ name })
    .eq('id', playlistId)
  if (error) throw error
}

// ─── Songs ────────────────────────────────────────────────────────────────────
export async function fetchPlaylistSongs(playlistId) {
  requireOnline()
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
  if (error) throw error
  // Map DB columns back to app's camelCase shape
  return data.map(dbSongToApp)
}

export async function upsertSongs(playlistId, userId, songs) {
  requireOnline()
  // Delete all existing songs for this playlist, then insert new batch
  await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId)
  if (!songs || songs.length === 0) return
  const rows = songs.map((s, i) => appSongToDb(s, playlistId, userId, i))
  const { error } = await supabase.from('playlist_songs').insert(rows)
  if (error) throw error
}

// ─── Recommendation History ───────────────────────────────────────────────────
export async function saveRecommendationHistory(userId, playlistId, seedSongs, recs) {
  const { error } = await supabase.from('recommendation_history').insert({
    user_id:    userId,
    playlist_id: playlistId || null,
    seed_songs: seedSongs,
    recs,
  })
  if (error) throw error
}

export async function fetchRecommendationHistory(userId, limit = 5) {
  const { data, error } = await supabase
    .from('recommendation_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  // Return in chronological order (oldest first) for history navigation
  return data.reverse()
}

// ─── User Preferences ─────────────────────────────────────────────────────────
export async function fetchPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

export async function upsertPreferences(userId, prefs) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Taste Profile ────────────────────────────────────────────────────────────
export async function saveTasteProfile(userId, profile) {
  const { error } = await supabase
    .from('taste_profiles')
    .upsert({
      user_id:              userId,
      energy:               profile.energy               ?? null,
      danceability:         profile.danceability         ?? null,
      valence:              profile.valence              ?? null,
      tempo:                profile.tempo                ?? null,
      acousticness:         profile.acousticness         ?? null,
      instrumentalness:     profile.instrumentalness     ?? null,
      genre_distribution:   profile.genreDistribution    ?? [],
      identity_name:        profile.name                 ?? null,
      identity_description: profile.description          ?? null,
      updated_at:           new Date().toISOString(),
    })
  if (error) throw error
}

export async function fetchTasteProfile(userId) {
  const { data, error } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

// ─── Battle Results ───────────────────────────────────────────────────────────
export async function saveBattleResult(userId, battle) {
  const { error } = await supabase.from('battle_results').insert({
    user_id:       userId,
    winner_id:     battle.winnerId,
    winner_title:  battle.winnerTitle,
    winner_artist: battle.winnerArtist,
    loser_id:      battle.loserId,
    loser_title:   battle.loserTitle,
    loser_artist:  battle.loserArtist,
  })
  if (error) throw error
}

// ─── Song ELO Ratings ─────────────────────────────────────────────────────────
export async function upsertSongRatings(userId, ratingsMap, songsMap) {
  // ratingsMap: { [songId]: number }
  // songsMap:   { [songId]: { title, artist, albumArt } }
  const rows = Object.entries(ratingsMap).map(([songId, rating]) => ({
    user_id:     userId,
    song_id:     songId,
    song_title:  songsMap[songId]?.title  ?? '',
    song_artist: songsMap[songId]?.artist ?? '',
    album_art:   songsMap[songId]?.albumArt ?? null,
    rating,
    updated_at:  new Date().toISOString(),
  }))
  if (!rows.length) return
  const { error } = await supabase.from('song_ratings').upsert(rows)
  if (error) throw error
}

export async function fetchSongRatings(userId) {
  const { data, error } = await supabase
    .from('song_ratings')
    .select('song_id, rating')
    .eq('user_id', userId)
  if (error) throw error
  return Object.fromEntries((data ?? []).map(r => [r.song_id, r.rating]))
}

// ─── Shape converters ─────────────────────────────────────────────────────────
function appSongToDb(song, playlistId, userId, position) {
  return {
    // Always use a fresh UUID for the DB row so Spotify IDs (non-UUID strings)
    // don't cause a type-cast failure on UUID-typed id columns.
    id:          crypto.randomUUID(),
    playlist_id: playlistId,
    user_id:     userId,
    position,
    title:       song.title,
    artist:      song.artist,
    album:       song.album    || null,
    album_art:   song.albumArt || null,
    preview_url: song.previewUrl || null,
    year:        song.year     || null,
    // Store the original song id in spotify_id so we can round-trip it back.
    // For Spotify tracks this is the Spotify track ID; for manual songs it's
    // the locally-generated UUID from generateId().
    spotify_id:  song.id || null,
  }
}

function dbSongToApp(row) {
  return {
    // Restore the original app-side song id from spotify_id (stored above).
    id:         row.spotify_id || row.id,
    title:      row.title,
    artist:     row.artist,
    album:      row.album      || '',
    albumArt:   row.album_art  || null,
    previewUrl: row.preview_url || null,
    year:       row.year       || null,
    spotifyId:  row.spotify_id || null,
    genre:      [],
    isSelected: false,
  }
}
