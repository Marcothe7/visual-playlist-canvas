import { useState } from 'react'
import { PlaylistSwitcher } from '@/components/PlaylistSwitcher/PlaylistSwitcher'
import { SearchBar } from '@/components/SearchBar/SearchBar'
import { ExportMenu } from '@/components/ExportMenu/ExportMenu'
import { ShortcutsModal } from '@/components/ShortcutsModal/ShortcutsModal'
import { UserMenu } from '@/components/Header/UserMenu'
import { CreditBadge } from '@/components/CreditBadge/CreditBadge'
import { useAuth } from '@/context/AuthContext'
import styles from './Header.module.css'

export function Header({ onAddSong, density, onDensityChange, spotifyConnected, onSpotifyConnect }) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { user, openAuthModal } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.titleRow}>
          <svg className={styles.logo} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <h1 className={styles.title}>
            Playlist <span>Canvas</span>
          </h1>
        </div>
        <p className={styles.subtitle}>Curate · Discover · Play</p>
      </div>

      <div className={styles.playlistSwitcherWrap}>
        <PlaylistSwitcher />
      </div>

      <SearchBar />

      <div className={styles.actions}>
        <div className={styles.densityToggle} role="group" aria-label="Grid size">
          <button
            className={`${styles.densityBtn} ${density === 'compact' ? styles.densityActive : ''}`}
            onClick={() => onDensityChange('compact')}
            aria-label="Compact grid"
            title="Compact"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="4" height="4" rx="0.5" />
              <rect x="6" y="1" width="4" height="4" rx="0.5" />
              <rect x="11" y="1" width="4" height="4" rx="0.5" />
              <rect x="1" y="6" width="4" height="4" rx="0.5" />
              <rect x="6" y="6" width="4" height="4" rx="0.5" />
              <rect x="11" y="6" width="4" height="4" rx="0.5" />
              <rect x="1" y="11" width="4" height="4" rx="0.5" />
              <rect x="6" y="11" width="4" height="4" rx="0.5" />
              <rect x="11" y="11" width="4" height="4" rx="0.5" />
            </svg>
          </button>
          <button
            className={`${styles.densityBtn} ${density === 'normal' ? styles.densityActive : ''}`}
            onClick={() => onDensityChange('normal')}
            aria-label="Normal grid"
            title="Normal"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6.5" height="6.5" rx="0.5" />
              <rect x="8.5" y="1" width="6.5" height="6.5" rx="0.5" />
              <rect x="1" y="8.5" width="6.5" height="6.5" rx="0.5" />
              <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="0.5" />
            </svg>
          </button>
          <button
            className={`${styles.densityBtn} ${density === 'large' ? styles.densityActive : ''}`}
            onClick={() => onDensityChange('large')}
            aria-label="Large grid"
            title="Large"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="14" height="14" rx="1" />
            </svg>
          </button>
        </div>

        <button
          className={`${styles.spotifyBtn} ${spotifyConnected ? styles.spotifyConnected : ''}`}
          onClick={onSpotifyConnect}
          disabled={spotifyConnected}
          aria-label={spotifyConnected ? 'Spotify connected' : 'Connect Spotify'}
          title={spotifyConnected ? 'Spotify connected' : 'Connect Spotify'}
        >
          {/* Spotify logo */}
          <svg className={styles.spotifyIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.24-3.021-1.858-6.832-2.278-11.322-1.237-.418.1-.851-.16-.949-.578-.1-.418.16-.852.579-.95 4.911-1.121 9.122-.64 12.521 1.43.37.24.489.72.24 1.1l.032-.005zm1.47-3.267c-.301.459-.917.6-1.377.3-3.461-2.129-8.732-2.75-12.821-1.503-.501.15-1.021-.13-1.172-.629-.15-.5.131-1.02.629-1.172 4.671-1.418 10.472-.73 14.412 1.714.461.3.6.917.3 1.377l.029-.087zm.129-3.399c-4.149-2.462-11.001-2.688-14.961-1.488-.601.18-1.238-.16-1.42-.759-.18-.601.16-1.239.76-1.421 4.549-1.381 12.121-1.111 16.893 1.721.54.321.721 1.021.4 1.56-.32.541-1.02.721-1.56.4l-.112-.013z"/>
          </svg>
          <span>{spotifyConnected ? 'Connected' : 'Connect Spotify'}</span>
        </button>

        <button
          className={styles.shortcutsBtn}
          onClick={() => setShowShortcuts(true)}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
        >
          ?
        </button>

        <ExportMenu />

        <CreditBadge />

        {user ? (
          <UserMenu />
        ) : (
          <button
            className={styles.signInBtn}
            onClick={() => openAuthModal('signin')}
            aria-label="Sign in"
          >
            Sign in
          </button>
        )}

        <button className={`${styles.addButton} ${styles.addButtonDesktop}`} onClick={onAddSong} aria-label="Add a song">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Add Song</span>
        </button>
      </div>

      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </header>
  )
}
