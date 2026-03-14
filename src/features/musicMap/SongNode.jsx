/**
 * SongNode — a single song point on the Music Map.
 * Renders as a circular album art image (or initials fallback).
 * Shows a tooltip on hover and plays preview on click.
 */

import { useAudio } from '@/context/AudioContext'
import styles from './SongNode.module.css'

const NODE_R = 22   // radius in SVG units

export function SongNode({ node, mapWidth, mapHeight }) {
  const { playingId, play, stop } = useAudio()
  const isPlaying = playingId === node.id

  // node.x / node.y are centered at (0,0) in SVG units; offset by map center
  const cx = mapWidth  / 2 + node.x
  const cy = mapHeight / 2 + node.y

  const isRec    = node.type === 'recommendation'
  const accent   = isRec ? '#fb923c' : '#1db954'
  const initials = node.title.slice(0, 1).toUpperCase()

  function handleClick() {
    if (!node.previewUrl) return
    if (isPlaying) {
      stop()
    } else {
      play(node.id, node.previewUrl)
    }
  }

  return (
    // Outer g: SVG position only — no CSS transform here
    <g transform={`translate(${cx},${cy})`}>
    {/* Inner g: CSS hover scale — isolated from the SVG translate */}
    <g
      className={styles.node}
      onClick={handleClick}
      role="button"
      aria-label={`${node.title} by ${node.artist}`}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <title>{node.title} — {node.artist}{isRec ? ' (Recommended)' : ''}</title>

      {/* Glow ring for playing state */}
      {isPlaying && (
        <circle
          r={NODE_R + 5}
          fill="none"
          stroke={accent}
          strokeWidth="2"
          opacity="0.6"
          className={styles.playingRing}
        />
      )}

      {/* Outer accent ring */}
      <circle
        r={NODE_R + 2}
        fill={accent}
        opacity={isRec ? 0.3 : 0.15}
        className={styles.ring}
      />

      {/* Album art — foreignObject avoids clipPath/CSS-transform conflicts */}
      {node.albumArt ? (
        <foreignObject x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
          <img
            src={node.albumArt}
            alt=""
            style={{
              width: '100%', height: '100%',
              borderRadius: '50%', objectFit: 'cover', display: 'block',
            }}
          />
        </foreignObject>
      ) : (
        /* Fallback: colored circle with initials */
        <>
          <circle r={NODE_R} fill={isRec ? '#431407' : '#052e16'} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={accent}
            fontSize="14"
            fontWeight="700"
            fontFamily="inherit"
          >
            {initials}
          </text>
        </>
      )}

      {/* Stroke border */}
      <circle
        r={NODE_R}
        fill="none"
        stroke={accent}
        strokeWidth={isPlaying ? 2.5 : 1.5}
        opacity={isPlaying ? 1 : 0.6}
      />

      {/* Debug label: shows raw valence / energy values */}
      {node.valence !== null && (
        <text
          y={NODE_R + 12}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(255,255,255,0.55)"
          fontFamily="monospace"
        >
          v:{node.valence.toFixed(2)} e:{node.energy.toFixed(2)}
        </text>
      )}
    </g>
    </g>
  )
}
