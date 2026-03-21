import { AnimatePresence, motion } from 'framer-motion'
import { useCredits } from '@/context/CreditContext'
import { useAuth } from '@/context/AuthContext'
import { isNativePlatform } from '@/lib/platform'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import styles from './PaywallModal.module.css'

export function PaywallModal({ onWatchAd, onPurchase, onRestore, adReady, purchasing }) {
  const { paywallOpen, closePaywall, freeCredits, purchasedCredits, isPro, totalCredits } = useCredits()
  const { user, openAuthModal } = useAuth()
  const isNative = isNativePlatform()

  if (!paywallOpen) return null

  const remaining = isPro ? '...' : totalCredits

  function handleWatchAd() {
    hapticMedium()
    onWatchAd?.()
  }

  function handlePurchase(productId) {
    if (!user) {
      hapticLight()
      openAuthModal('signin')
      return
    }
    hapticMedium()
    onPurchase?.(productId)
  }

  function handleRestore() {
    hapticLight()
    onRestore?.()
  }

  return (
    <AnimatePresence>
      {paywallOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePaywall}
        >
          <motion.div
            className={styles.modal}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerInfo}>
                <h2 className={styles.title}>AI Picks</h2>
                <p className={styles.subtitle}>Get personalized song recommendations</p>
              </div>
              <button className={styles.closeBtn} onClick={closePaywall} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Credit display */}
            <div className={styles.creditDisplay}>
              <span className={styles.creditCount}>{remaining}</span>
              <span className={styles.creditLabel}>
                {isPro ? 'Unlimited picks' : `AI Pick${totalCredits !== 1 ? 's' : ''} remaining`}
              </span>
            </div>

            {/* Watch ad for free credit */}
            {!isPro && isNative && (
              <div className={styles.adSection}>
                <button
                  className={styles.adBtn}
                  onClick={handleWatchAd}
                  disabled={!adReady}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Watch Ad for +1 AI Pick</span>
                </button>
                <p className={styles.adHint}>Free! Watch a short video to earn 1 AI Pick</p>
              </div>
            )}

            {/* Purchase packs */}
            {!isPro && (
              <div className={styles.packs}>
                <p className={styles.packsTitle}>Get more AI Picks</p>

                {/* Small pack */}
                <button
                  className={styles.packCard}
                  onClick={() => handlePurchase('ai_recs_pack_10')}
                  disabled={purchasing}
                >
                  <div className={styles.packIcon}>10</div>
                  <div className={styles.packInfo}>
                    <p className={styles.packName}>Starter Pack</p>
                    <p className={styles.packDesc}>10 AI Picks</p>
                  </div>
                  <span className={styles.packPrice}>$0.99</span>
                </button>

                {/* Big pack */}
                <button
                  className={styles.packCard}
                  onClick={() => handlePurchase('ai_recs_pack_50')}
                  disabled={purchasing}
                >
                  <div className={styles.packIcon}>50</div>
                  <div className={styles.packInfo}>
                    <p className={styles.packName}>Value Pack</p>
                    <p className={styles.packDesc}>50 AI Picks</p>
                  </div>
                  <span className={styles.packPrice}>$2.99</span>
                </button>

                {/* Unlimited subscription */}
                <button
                  className={styles.packCardPro}
                  onClick={() => handlePurchase('ai_recs_unlimited')}
                  disabled={purchasing}
                >
                  <span className={styles.bestBadge}>Best Value</span>
                  <div className={styles.packIcon}>∞</div>
                  <div className={styles.packInfo}>
                    <p className={styles.packName}>Unlimited Pro</p>
                    <p className={styles.packDesc}>Unlimited AI Picks</p>
                    <div className={styles.proPerks}>
                      <span className={styles.perk}>No ads</span>
                      <span className={styles.perk}>Unlimited</span>
                    </div>
                  </div>
                  <span className={styles.packPrice}>$4.99/mo</span>
                </button>
              </div>
            )}

            {/* Restore purchases */}
            {isNative && (
              <div className={styles.footer}>
                <button className={styles.restoreBtn} onClick={handleRestore}>
                  Restore purchases
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
