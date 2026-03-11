import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import styles from './AuthModal.module.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function SignInTab({ onSwitch }) {
  const { signIn, signInWithGoogle } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign in failed.')
    }
  }

  return (
    <div className={styles.tabContent}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <button className={styles.forgotLink} onClick={() => onSwitch('forgot')}>
        Forgot password?
      </button>

      <div className={styles.divider}><span>or</span></div>

      <button className={styles.googleBtn} onClick={handleGoogle}>
        <GoogleIcon />
        Continue with Google
      </button>

      <p className={styles.switchText}>
        Don't have an account?{' '}
        <button className={styles.switchLink} onClick={() => onSwitch('signup')}>Sign up</button>
      </p>
    </div>
  )
}

function SignUpTab({ onSwitch }) {
  const { signUp } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await signUp(email, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✉️</div>
          <p className={styles.successTitle}>Check your email</p>
          <p className={styles.successMsg}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <button className={styles.switchLink} onClick={() => onSwitch('signin')}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            type="password"
            className={styles.input}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat password"
            autoComplete="new-password"
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className={styles.switchText}>
        Already have an account?{' '}
        <button className={styles.switchLink} onClick={() => onSwitch('signin')}>Sign in</button>
      </p>
    </div>
  )
}

function ForgotTab({ onSwitch }) {
  const { sendPasswordReset } = useAuth()
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✉️</div>
          <p className={styles.successTitle}>Reset link sent</p>
          <p className={styles.successMsg}>Check your email for a password reset link.</p>
          <button className={styles.switchLink} onClick={() => onSwitch('signin')}>Back to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className={styles.switchText}>
        <button className={styles.switchLink} onClick={() => onSwitch('signin')}>← Back to sign in</button>
      </p>
    </div>
  )
}

export function AuthModal() {
  const { authModalOpen, authModalTab, closeAuthModal, setTab } = useAuth()

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) closeAuthModal()
  }

  const titles = { signin: 'Sign in', signup: 'Create account', forgot: 'Reset password' }

  return (
    <AnimatePresence>
      {authModalOpen && (
        <motion.div
          className={styles.overlay}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div className={styles.modalHeader}>
              <h2 id="auth-modal-title" className={styles.modalTitle}>
                {titles[authModalTab]}
              </h2>
              <button className={styles.closeBtn} onClick={closeAuthModal} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {authModalTab === 'signin' && (
                <motion.div key="signin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                  <SignInTab onSwitch={setTab} />
                </motion.div>
              )}
              {authModalTab === 'signup' && (
                <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                  <SignUpTab onSwitch={setTab} />
                </motion.div>
              )}
              {authModalTab === 'forgot' && (
                <motion.div key="forgot" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                  <ForgotTab onSwitch={setTab} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
