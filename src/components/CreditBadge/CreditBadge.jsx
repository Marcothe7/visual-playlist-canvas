import { useCredits } from '@/context/CreditContext'
import { hapticLight } from '@/lib/haptics'
import styles from './CreditBadge.module.css'

export function CreditBadge() {
  const { isPro, totalCredits, openPaywall, loading } = useCredits()

  if (loading) return null

  function handleClick() {
    hapticLight()
    openPaywall()
  }

  if (isPro) {
    return (
      <button className={styles.badgePro} onClick={handleClick} aria-label="Pro subscription active">
        <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span>PRO</span>
      </button>
    )
  }

  return (
    <button className={styles.badge} onClick={handleClick} aria-label={`${totalCredits} AI Picks remaining`}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <span className={styles.count}>{totalCredits}</span>
      <span>AI Picks</span>
    </button>
  )
}
