/**
 * MusicIdentityCard — displays the generated music identity and provides
 * a "Share" button that exports the card as a downloadable PNG via Canvas API.
 */

import { useRef } from 'react'
import { GenreDistributionBar } from './GenreDistributionBar'
import styles from './MusicIdentityCard.module.css'

function shareIdentityCard(identity, profile) {
  const canvas = document.createElement('canvas')
  canvas.width  = 800
  canvas.height = 520
  const ctx = canvas.getContext('2d')

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 520)
  grad.addColorStop(0, '#0d0d0d')
  grad.addColorStop(1, '#111827')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 800, 520)

  // Accent border top
  ctx.fillStyle = '#8B5CF6'
  ctx.fillRect(0, 0, 800, 4)

  // Title
  ctx.fillStyle = '#a0a0a0'
  ctx.font      = '500 14px system-ui, sans-serif'
  ctx.fillText('YOUR MUSIC IDENTITY', 48, 50)

  // Identity name
  ctx.fillStyle = '#8B5CF6'
  ctx.font      = '700 42px system-ui, sans-serif'
  ctx.fillText(identity.name, 48, 110)

  // Description
  ctx.fillStyle = '#d1d5db'
  ctx.font      = '400 16px system-ui, sans-serif'
  const words = identity.description.split(' ')
  let line = '', y = 150
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word
    if (ctx.measureText(test).width > 480 && line) {
      ctx.fillText(line, 48, y); y += 24; line = word
    } else { line = test }
  }
  if (line) ctx.fillText(line, 48, y)

  // Mood tags
  const moods = identity.moodCharacteristics ?? []
  let mx = 48
  const tagY = 220
  ctx.font = '500 13px system-ui, sans-serif'
  moods.forEach(mood => {
    const w = ctx.measureText(mood).width + 24
    ctx.fillStyle = 'rgba(29,185,84,0.15)'
    roundRect(ctx, mx, tagY - 14, w, 24, 12)
    ctx.fillStyle = '#8B5CF6'
    ctx.fillText(mood, mx + 12, tagY)
    mx += w + 8
  })

  // Profile bars on the right
  if (profile) {
    const bars = [
      { label: 'Energy',     value: profile.energy       },
      { label: 'Mood',       value: profile.valence      },
      { label: 'Rhythm',     value: profile.danceability },
      { label: 'Acoustic',   value: profile.acousticness },
    ]
    let bx = 560, by = 60
    ctx.fillStyle = '#6b7280'
    ctx.font = '500 12px system-ui, sans-serif'
    ctx.fillText('AUDIO PROFILE', bx, by - 10)
    bars.forEach(({ label, value }) => {
      ctx.fillStyle = '#6b7280'
      ctx.font = '400 12px system-ui, sans-serif'
      ctx.fillText(label, bx, by + 14)
      // bar track
      ctx.fillStyle = '#1f2937'
      roundRect(ctx, bx, by + 20, 180, 8, 4)
      // bar fill
      ctx.fillStyle = '#8B5CF6'
      roundRect(ctx, bx, by + 20, Math.max(4, 180 * (value ?? 0)), 8, 4)
      by += 42
    })
  }

  // Genre distribution
  const genres = identity.genreDistribution ?? []
  if (genres.length) {
    ctx.fillStyle = '#6b7280'
    ctx.font      = '500 12px system-ui, sans-serif'
    ctx.fillText('GENRES', 48, 290)
    const segColors = ['#8B5CF6', '#a78bfa', '#60a5fa', '#fb923c', '#f472b6']
    const total = genres.reduce((s, g) => s + g.pct, 0)
    let gx = 48
    genres.slice(0, 5).forEach((g, i) => {
      const w = Math.max(4, ((g.pct / total) * 700))
      ctx.fillStyle = segColors[i % segColors.length]
      roundRect(ctx, gx, 300, w - 4, 10, 5)
      gx += w
    })
  }

  // Footer
  ctx.fillStyle = '#374151'
  ctx.font      = '400 12px system-ui, sans-serif'
  ctx.fillText('Visual Playlist Canvas', 48, 500)

  // Download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `music-identity-${identity.name.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

// Helper: filled rounded rect for canvas
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

export function MusicIdentityCard({ identity, profile, onReanalyze }) {
  const cardRef = useRef(null)

  return (
    <div className={styles.card} ref={cardRef}>
      <div className={styles.cardAccent} />
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>Your Music Identity</p>
          <h2 className={styles.identityName}>{identity.name}</h2>
        </div>
        <button
          className={styles.reanalyzeBtn}
          onClick={onReanalyze}
          title="Re-analyze"
        >
          ↺
        </button>
      </div>

      <p className={styles.description}>{identity.description}</p>

      <div className={styles.moods}>
        {(identity.moodCharacteristics ?? []).map(m => (
          <span key={m} className={styles.moodTag}>{m}</span>
        ))}
      </div>

      <div className={styles.genreSection}>
        <h3 className={styles.sectionLabel}>Genre Mix</h3>
        <GenreDistributionBar genreDistribution={identity.genreDistribution} />
      </div>

      <button
        className={styles.shareBtn}
        onClick={() => shareIdentityCard(identity, profile)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share Your Identity
      </button>
    </div>
  )
}
