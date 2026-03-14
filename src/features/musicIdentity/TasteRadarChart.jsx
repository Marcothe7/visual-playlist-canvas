/**
 * TasteRadarChart — pure SVG hexagonal radar chart.
 * 6 axes: Energy, Mood, Danceability, Acousticness, Depth, Rhythm
 * Draws concentric grid hexagons + a filled polygon for the data.
 */

import { useEffect, useRef } from 'react'
import styles from './TasteRadarChart.module.css'

const AXES = [
  { key: 'energy',           label: 'Energy'      },
  { key: 'danceability',     label: 'Rhythm'      },
  { key: 'valence',          label: 'Mood'        },
  { key: 'acousticness',     label: 'Acoustic'    },
  { key: 'instrumentalness', label: 'Depth'       },
  // Tempo normalized to 0–1 range (60–200 BPM typical range)
  { key: '_rhythmNorm',      label: 'Tempo'       },
]

const NUM_AXES   = AXES.length
const SIZE       = 220          // SVG viewport
const CENTER     = SIZE / 2
const RADIUS     = 80           // outer ring radius
const GRID_STEPS = 4            // number of concentric rings

/** Get x,y coordinates for a point on axis i at a given radius */
function axisPoint(i, r) {
  const angle = (Math.PI * 2 * i) / NUM_AXES - Math.PI / 2
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  }
}

/** Build the points string for a polygon at given data values (0–1 per axis) */
function polygonPoints(values) {
  return values
    .map((v, i) => {
      const { x, y } = axisPoint(i, v * RADIUS)
      return `${x},${y}`
    })
    .join(' ')
}

export function TasteRadarChart({ profile }) {
  const svgRef = useRef(null)

  // Normalize tempo: 60 → 0, 200 → 1
  const tempoNorm = Math.max(0, Math.min(1, ((profile?.tempo ?? 120) - 60) / 140))
  const normalized = {
    ...profile,
    _rhythmNorm: tempoNorm,
  }

  const dataValues = AXES.map(ax => Math.max(0, Math.min(1, normalized[ax.key] ?? 0)))

  // Grid hexagon coordinates for each step
  const gridRings = Array.from({ length: GRID_STEPS }, (_, i) => {
    const r = RADIUS * ((i + 1) / GRID_STEPS)
    return Array.from({ length: NUM_AXES }, (_, ai) => axisPoint(ai, r))
      .map(p => `${p.x},${p.y}`)
      .join(' ')
  })

  // Axis lines from center to outer ring
  const axisLines = Array.from({ length: NUM_AXES }, (_, i) => ({
    ...axisPoint(i, RADIUS),
    key: i,
  }))

  // Label positions (slightly outside outer ring)
  const labelPositions = AXES.map((ax, i) => {
    const { x, y } = axisPoint(i, RADIUS + 18)
    return { ...ax, x, y }
  })

  return (
    <div className={styles.wrapper}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.svg}
        aria-label="Taste radar chart"
      >
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Axis lines */}
        {axisLines.map(({ x, y, key }) => (
          <line
            key={key}
            x1={CENTER} y1={CENTER}
            x2={x} y2={y}
            stroke="var(--color-border)"
            strokeWidth="1"
            opacity="0.4"
          />
        ))}

        {/* Data polygon — filled */}
        <polygon
          points={polygonPoints(dataValues)}
          fill="var(--color-accent)"
          fillOpacity="0.25"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          className={styles.dataPoly}
        />

        {/* Data dots on each axis */}
        {dataValues.map((v, i) => {
          const { x, y } = axisPoint(i, v * RADIUS)
          return (
            <circle
              key={i}
              cx={x} cy={y} r="4"
              fill="var(--color-accent)"
              stroke="var(--color-bg)"
              strokeWidth="1.5"
            />
          )
        })}

        {/* Axis labels */}
        {labelPositions.map(({ label, x, y }) => (
          <text
            key={label}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-text-secondary)"
            fontSize="10"
            fontFamily="inherit"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}
