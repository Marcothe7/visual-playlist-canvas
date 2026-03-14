import { useState, useEffect, useRef, useCallback } from 'react'
import {
  isSpotifyAuthenticated,
  initiateSpotifyAuth,
  getUserPlaylists,
  getPlaylistTracks,
  searchArtists,
  getArtistAlbums,
  getAlbumTracks,
} from '@/services/spotifyService'
import styles from './ImportTab.module.css'

// ─── Spotify connect prompt ───────────────────────────────────────────────────
function ConnectPrompt() {
  return (
    <div className={styles.connectWrap}>
      <div className={styles.connectIcon}>
        {/* Spotify logo */}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>
      <p className={styles.connectTitle}>Connect Spotify to Import</p>
      <p className={styles.connectSub}>
        Link your Spotify account to import your playlists or browse an artist's albums.
      </p>
      <button className={styles.connectBtn} onClick={initiateSpotifyAuth}>
        Connect Spotify
      </button>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />
}

// ─── Main ImportTab ───────────────────────────────────────────────────────────
export function ImportTab({ onAdd }) {
  const isConnected = isSpotifyAuthenticated()

  // Navigation within the tab: 'home' shows both sections; 'albums' shows album drill-down
  const [view,           setView]           = useState('home')
  const [selectedArtist, setSelectedArtist] = useState(null) // { id, name }

  // Playlists section
  const [playlists,       setPlaylists]       = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [playlistsError,   setPlaylistsError]   = useState(null)

  // Artist search
  const [artistQuery,   setArtistQuery]   = useState('')
  const [artistResults, setArtistResults] = useState([])
  const [artistLoading, setArtistLoading] = useState(false)

  // Album grid (after selecting an artist)
  const [albums,       setAlbums]       = useState([])
  const [albumsLoading, setAlbumsLoading] = useState(false)
  const [albumsError,  setAlbumsError]  = useState(null)

  // Import state
  const [importingId, setImportingId] = useState(null)
  const [importedIds, setImportedIds] = useState(new Set())

  const timerRef = useRef(null)

  // Fetch user playlists on mount (if connected)
  useEffect(() => {
    if (!isConnected) return
    setPlaylistsLoading(true)
    setPlaylistsError(null)
    getUserPlaylists()
      .then(setPlaylists)
      .catch(err => setPlaylistsError(err.message))
      .finally(() => setPlaylistsLoading(false))
  }, [isConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced artist search
  const handleArtistInput = useCallback((e) => {
    const q = e.target.value
    setArtistQuery(q)
    clearTimeout(timerRef.current)
    if (!q.trim()) { setArtistResults([]); return }
    timerRef.current = setTimeout(async () => {
      setArtistLoading(true)
      try {
        setArtistResults(await searchArtists(q))
      } catch {
        setArtistResults([])
      } finally {
        setArtistLoading(false)
      }
    }, 400)
  }, [])

  async function handleSelectArtist(artist) {
    setSelectedArtist(artist)
    setView('albums')
    setAlbumsLoading(true)
    setAlbumsError(null)
    try {
      setAlbums(await getArtistAlbums(artist.id))
    } catch (err) {
      setAlbums([])
      setAlbumsError(err.message || 'Failed to load albums')
    } finally {
      setAlbumsLoading(false)
    }
  }

  async function handleImportPlaylist(playlist) {
    if (importingId || importedIds.has(playlist.id)) return
    setImportingId(playlist.id)
    try {
      const songs = await getPlaylistTracks(playlist.id)
      songs.forEach(song => onAdd(song))
      setImportedIds(prev => new Set(prev).add(playlist.id))
    } catch (err) {
      console.error('Import playlist failed:', err)
    } finally {
      setImportingId(null)
    }
  }

  async function handleImportAlbum(album) {
    if (importingId || importedIds.has(album.id)) return
    setImportingId(album.id)
    try {
      const songs = await getAlbumTracks(album.id)
      songs.forEach(song => onAdd(song))
      setImportedIds(prev => new Set(prev).add(album.id))
    } catch (err) {
      console.error('Import album failed:', err)
    } finally {
      setImportingId(null)
    }
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) return <ConnectPrompt />

  // ── Album drill-down view ─────────────────────────────────────────────────
  if (view === 'albums' && selectedArtist) {
    return (
      <div className={styles.panel}>
        <button className={styles.backBtn} onClick={() => { setView('home'); setAlbumsError(null) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {selectedArtist.name}
        </button>

        {albumsLoading && (
          <div className={styles.center}><Spinner /></div>
        )}

        {albumsError && <p className={styles.errorMsg}>{albumsError}</p>}

        {!albumsLoading && !albumsError && albums.length === 0 && (
          <p className={styles.empty}>No albums found.</p>
        )}

        <div className={styles.albumGrid}>
          {albums.map(album => {
            const isDone      = importedIds.has(album.id)
            const isImporting = importingId === album.id
            const year        = album.releaseDate?.slice(0, 4) ?? ''
            return (
              <div key={album.id} className={styles.albumCard}>
                <div className={styles.albumArt}>
                  {album.imageUrl
                    ? <img src={album.imageUrl} alt="" loading="lazy" />
                    : <div className={styles.albumArtFallback} />
                  }
                </div>
                <p className={styles.albumName}>{album.name}</p>
                {year && <p className={styles.albumYear}>{year} · {album.trackCount} tracks</p>}
                <button
                  className={`${styles.albumImportBtn} ${isDone ? styles.albumImportBtnDone : ''}`}
                  onClick={() => handleImportAlbum(album)}
                  disabled={isImporting || isDone || !!importingId}
                >
                  {isImporting ? <Spinner /> : isDone ? 'Added' : `Import ${album.trackCount} tracks`}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Home view (playlists + artist search) ─────────────────────────────────
  return (
    <div className={styles.panel}>

      {/* ── My Playlists ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>My Playlists</p>

        {playlistsLoading && <div className={styles.center}><Spinner /></div>}
        {playlistsError && <p className={styles.errorMsg}>{playlistsError}</p>}

        {!playlistsLoading && !playlistsError && playlists.length === 0 && (
          <p className={styles.empty}>No playlists found on your Spotify account.</p>
        )}

        <div className={styles.playlistList}>
          {playlists.map(pl => {
            const isDone      = importedIds.has(pl.id)
            const isImporting = importingId === pl.id
            return (
              <div key={pl.id} className={styles.playlistRow}>
                <div className={styles.playlistArt}>
                  {pl.imageUrl
                    ? <img src={pl.imageUrl} alt="" loading="lazy" />
                    : <div className={styles.playlistArtFallback}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                  }
                </div>
                <div className={styles.playlistInfo}>
                  <span className={styles.playlistName}>{pl.name}</span>
                  <span className={styles.playlistCount}>{pl.trackCount} songs</span>
                </div>
                <button
                  className={`${styles.importBtn} ${isDone ? styles.importBtnDone : ''}`}
                  onClick={() => handleImportPlaylist(pl)}
                  disabled={isImporting || isDone || !!importingId}
                  aria-label={`Import ${pl.name}`}
                >
                  {isImporting
                    ? <Spinner />
                    : isDone
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg>
                      : 'Import'
                  }
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── By Artist ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>By Artist</p>

        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search artist…"
            value={artistQuery}
            onChange={handleArtistInput}
            autoComplete="off"
          />
          {artistLoading && <Spinner />}
        </div>

        {!artistQuery.trim() && !artistLoading && (
          <p className={styles.hint}>Search an artist to browse their albums</p>
        )}

        {artistResults.length > 0 && (
          <div className={styles.artistGrid}>
            {artistResults.map(artist => (
              <button
                key={artist.id}
                className={styles.artistCard}
                onClick={() => handleSelectArtist(artist)}
              >
                <div className={styles.artistImg}>
                  {artist.imageUrl
                    ? <img src={artist.imageUrl} alt="" loading="lazy" />
                    : <div className={styles.artistImgFallback}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                  }
                </div>
                <span className={styles.artistName}>{artist.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
