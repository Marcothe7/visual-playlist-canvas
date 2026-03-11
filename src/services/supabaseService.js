import { supabase } from '@/lib/supabase'

const MIGRATION_PREFIX = 'vpc-migrated-'

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

// ─── localStorage Migration ───────────────────────────────────────────────────
export async function migrateLocalStorage(userId) {
  const migrationKey = MIGRATION_PREFIX + userId
  if (localStorage.getItem(migrationKey)) return // already done

  const raw = localStorage.getItem('vpc-playlists')
  if (!raw) {
    localStorage.setItem(migrationKey, '1')
    return
  }

  try {
    const localPlaylists = JSON.parse(raw)
    for (const localPl of localPlaylists) {
      const dbPl = await createPlaylist(userId, localPl.name || 'My Library')
      if (localPl.songs?.length > 0) {
        await upsertSongs(dbPl.id, userId, localPl.songs)
      }
    }
    // Also migrate grid density preference
    const density = localStorage.getItem('vpc-grid-density')
    if (density) {
      await upsertPreferences(userId, { grid_density: density })
    }
  } catch (err) {
    console.warn('Migration partially failed:', err)
  }

  localStorage.setItem(migrationKey, '1')
}

// ─── Shape converters ─────────────────────────────────────────────────────────
function appSongToDb(song, playlistId, userId, position) {
  return {
    id:          song.id,
    playlist_id: playlistId,
    user_id:     userId,
    position,
    title:       song.title,
    artist:      song.artist,
    album:       song.album   || null,
    album_art:   song.albumArt || null,
    preview_url: song.previewUrl || null,
    year:        song.year    || null,
    spotify_id:  song.spotifyId || null,
  }
}

function dbSongToApp(row) {
  return {
    id:         row.id,
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
