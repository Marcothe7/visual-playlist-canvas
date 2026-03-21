import { useState, useEffect, useCallback, useRef } from 'react'
import { isNativePlatform } from '@/lib/platform'
import { useCredits } from '@/context/CreditContext'
import { useAuthState } from '@/context/AuthContext'

// Replace with real Ad Unit IDs from AdMob console
const REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917'   // Test ID
const INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712' // Test ID

/**
 * AdMob hook — dynamically imports the plugin, no-ops on web.
 * Provides rewarded ads (+1 AI credit) and interstitial ads (post-recommendation).
 */
export function useAds() {
  const [admob, setAdmob] = useState(null)
  const [rewardedReady, setRewardedReady] = useState(false)
  const [interstitialReady, setInterstitialReady] = useState(false)
  const [showingAd, setShowingAd] = useState(false)
  const interstitialCount = useRef(0)
  const { grantAdReward, isPro } = useCredits()
  const { session } = useAuthState()

  // Load AdMob plugin on native only
  useEffect(() => {
    if (!isNativePlatform()) return

    async function init() {
      try {
        const mod = await import('@capacitor-community/admob')
        const AdMob = mod.AdMob || mod.default

        if (!AdMob) return

        await AdMob.initialize({
          initializeForTesting: true, // Set to false in production
        })

        setAdmob(AdMob)

        // Pre-load ads
        try {
          await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID })
          setRewardedReady(true)
        } catch { /* ad not ready */ }

        if (!isPro) {
          try {
            await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID })
            setInterstitialReady(true)
          } catch { /* ad not ready */ }
        }

        // Listen for reward event
        AdMob.addListener('onRewardedVideoAdReward', () => {
          // Reward will be granted via the showRewardedAd flow
        })

      } catch {
        console.log('AdMob plugin not available')
      }
    }
    init()
  }, [isPro])

  const showRewardedAd = useCallback(async () => {
    if (!admob || !session || showingAd) return false
    setShowingAd(true)

    try {
      // Ensure ad is loaded
      if (!rewardedReady) {
        await admob.prepareRewardVideoAd({ adId: REWARDED_AD_ID })
      }

      // Show the ad — returns when dismissed
      const result = await admob.showRewardVideoAd()

      // Grant the credit
      if (result?.type === 'earned' || result) {
        await grantAdReward()
        // Reload next ad
        try {
          await admob.prepareRewardVideoAd({ adId: REWARDED_AD_ID })
          setRewardedReady(true)
        } catch {
          setRewardedReady(false)
        }
        return true
      }
      return false
    } catch {
      setRewardedReady(false)
      return false
    } finally {
      setShowingAd(false)
    }
  }, [admob, session, showingAd, rewardedReady, grantAdReward])

  const showInterstitial = useCallback(async () => {
    if (!admob || isPro || showingAd) return

    // Frequency cap: show every 2nd recommendation fetch
    interstitialCount.current += 1
    if (interstitialCount.current % 2 !== 0) return

    try {
      if (!interstitialReady) {
        await admob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID })
      }

      setShowingAd(true)
      await admob.showInterstitial()

      // Reload next ad
      try {
        await admob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID })
        setInterstitialReady(true)
      } catch {
        setInterstitialReady(false)
      }
    } catch {
      setInterstitialReady(false)
    } finally {
      setShowingAd(false)
    }
  }, [admob, isPro, showingAd, interstitialReady])

  return {
    available: !!admob,
    rewardedReady,
    showRewardedAd,
    showInterstitial,
    showingAd,
  }
}
