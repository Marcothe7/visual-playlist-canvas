import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState } from '@/context/AppContext'
import styles from './ExportMenu.module.css'

export function ExportMenu() {
  const { songs } = useAppState()
  const [isOpen,  setIsOpen]  = useState(false)
  const [copied,  setCopied]  = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    function onMouseDown(e) {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  function handleCopyText() {
    const text = songs
      .map((s, i) => {
        const parts = [s.title, '—', s.artist]
        if (s.album) parts.push(`(${s.album}`)
        if (s.year)  parts[parts.length - 1] += `, ${s.year})`
        else if (s.album) parts[parts.length - 1] += ')'
        return `${i + 1}. ${parts.join(' ')}`
      })
      .join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownloadJSON() {
    const clean = songs.map(({ isSelected, ...rest }) => rest)
    const blob  = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `playlist-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(o => !o)}
        aria-label="Export playlist"
        title="Export playlist"
        disabled={songs.length === 0}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.menu}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            <button className={styles.menuItem} onClick={handleCopyText}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? 'Copied!' : 'Copy as text'}
            </button>
            <button className={styles.menuItem} onClick={handleDownloadJSON}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="18" />
                <line x1="15" y1="15" x2="12" y2="18" />
              </svg>
              Download JSON
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
