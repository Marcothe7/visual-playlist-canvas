/**
 * MusicMap — SVG canvas with pan and song nodes.
 * X-axis: Calm → Energetic (energy)
 * Y-axis: Dark → Happy (valence, inverted on screen)
 */

import { useState, useRef, useCallback } from 'react'
import { SongNode } from './SongNode'
import styles from './MusicMap.module.css'

const MAP_W = 800
const MAP_H = 600
const DEFAULT_VB = { x: 0, y: 0, w: MAP_W, h: MAP_H }

export function MusicMap({ songNodes, recNodes }) {
  const [vb, setVb]           = useState(DEFAULT_VB)  // viewBox: { x, y, w, h }
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const svgRef  = useRef(null)

  // ── Drag pan (Pointer Events — works for mouse AND touch) ─────────────────
  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return  // left-click only on desktop
    e.currentTarget.setPointerCapture(e.pointerId)           // track pointer past SVG boundary
    dragRef.current = { startX: e.clientX, startY: e.clientY, vb: { ...vb } }
    setIsDragging(true)
  }

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = -(e.clientX - dragRef.current.startX) / rect.width  * dragRef.current.vb.w
    const dy = -(e.clientY - dragRef.current.startY) / rect.height * dragRef.current.vb.h
    setVb({ ...dragRef.current.vb, x: dragRef.current.vb.x + dx, y: dragRef.current.vb.y + dy })
  }, [])

  function handlePointerUp() { dragRef.current = null; setIsDragging(false) }

  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`

  return (
    <div className={styles.wrapper}>
      {/* Axis labels */}
      <div className={styles.axisX}>← Sad &nbsp;·&nbsp; Happy →</div>
      <div className={styles.axisY}>↑ Energetic &nbsp;·&nbsp; Calm ↓</div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={styles.svg}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        aria-label="Music Map"
      >
        {/* Subtle dot-grid background */}
        <defs>
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.04)" />
          </pattern>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="var(--color-bg)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#mapGrid)" />

        {/* Center crosshairs */}
        <line x1={MAP_W / 2} y1={0} x2={MAP_W / 2} y2={MAP_H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={0} y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Quadrant corner labels */}
        <text x={16} y={18} fontSize="11" fill="rgba(255,255,255,0.2)" dominantBaseline="hanging">😢 Sad &amp; Energetic</text>
        <text x={MAP_W - 16} y={18} fontSize="11" fill="rgba(255,255,255,0.2)" textAnchor="end" dominantBaseline="hanging">🎉 Happy &amp; Energetic</text>
        <text x={16} y={MAP_H - 18} fontSize="11" fill="rgba(255,255,255,0.2)">😔 Sad &amp; Calm</text>
        <text x={MAP_W - 16} y={MAP_H - 18} fontSize="11" fill="rgba(255,255,255,0.2)" textAnchor="end">😊 Happy &amp; Calm</text>

        {/* Recommendation nodes (behind song nodes) */}
        {recNodes.map(node => (
          <SongNode key={node.id} node={node} mapWidth={MAP_W} mapHeight={MAP_H} />
        ))}

        {/* Song nodes */}
        {songNodes.map(node => (
          <SongNode key={node.id} node={node} mapWidth={MAP_W} mapHeight={MAP_H} />
        ))}
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendDot} style={{ background: '#1db954' }} /> Your songs
        <span className={styles.legendDot} style={{ background: '#fb923c', marginLeft: 12 }} /> Recommendations
      </div>

      {/* Reset view — handy on mobile where there's no double-click to recenter */}
      <button
        className={styles.resetBtn}
        onClick={() => setVb(DEFAULT_VB)}
        aria-label="Reset map view"
      >
        Reset view
      </button>
    </div>
  )
}
