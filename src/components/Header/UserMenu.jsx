import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { getGradientFromString } from '@/utils/colorFromString'
import styles from './UserMenu.module.css'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (!user) return null

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const initials    = displayName.slice(0, 2).toUpperCase()
  const { from, to } = getGradientFromString(user.email || displayName)

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.user_metadata?.avatar_url ? (
          <img className={styles.avatarImg} src={user.user_metadata.avatar_url} alt={displayName} />
        ) : (
          <div
            className={styles.avatarInitials}
            style={{ '--from': from, '--to': to }}
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.dropdownInfo}>
              <p className={styles.dropdownName}>{displayName}</p>
              <p className={styles.dropdownEmail}>{user.email}</p>
            </div>
            <div className={styles.dropdownDivider} />
            <button
              className={styles.dropdownItem}
              onClick={() => { signOut(); setOpen(false) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
