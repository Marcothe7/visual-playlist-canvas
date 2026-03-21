import { useState, useEffect, useCallback } from 'react'
import { isNativePlatform } from '@/lib/platform'
import { useCredits } from '@/context/CreditContext'
import { useAuthState } from '@/context/AuthContext'
import { apiBase } from '@/lib/api'

const PRODUCTS = [
  { id: 'ai_recs_pack_10', type: 'consumable', credits: 10 },
  { id: 'ai_recs_pack_50', type: 'consumable', credits: 50 },
  { id: 'ai_recs_unlimited', type: 'subscription', credits: 0 },
]

/**
 * Google Play Billing hook.
 * Dynamically imports the billing plugin — no-ops gracefully on web.
 */
export function useBilling() {
  const [billing, setBilling] = useState(null)
  const [products, setProducts] = useState([])
  const [purchasing, setPurchasing] = useState(false)
  const { refreshCredits } = useCredits()
  const { session } = useAuthState()

  // Load billing plugin on native only
  useEffect(() => {
    if (!isNativePlatform()) return

    async function init() {
      try {
        // Dynamic import — won't crash if plugin not installed
        const mod = await import('@capawesome-team/capacitor-android-billing')
        const plugin = mod.Billing || mod.default
        if (plugin) {
          setBilling(plugin)
          // Fetch product details
          try {
            const result = await plugin.getProducts({
              productIds: PRODUCTS.map(p => p.id),
            })
            setProducts(result.products || [])
          } catch { /* products not set up yet in Play Console */ }
        }
      } catch {
        // Plugin not installed — billing disabled
        console.log('Billing plugin not available')
      }
    }
    init()
  }, [])

  const purchase = useCallback(async (productId) => {
    if (!billing || !session?.access_token) return
    setPurchasing(true)

    try {
      // Initiate purchase via Google Play
      const result = await billing.purchaseProduct({ productId })

      if (result?.purchaseToken) {
        // Verify purchase server-side
        const response = await fetch(apiBase + '/api/verify-purchase', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            productId,
            purchaseToken: result.purchaseToken,
            orderId: result.orderId || null,
          }),
        })

        if (response.ok) {
          // Refresh credit state
          await refreshCredits()
        }
      }
    } catch (err) {
      console.error('Purchase failed:', err)
    } finally {
      setPurchasing(false)
    }
  }, [billing, session?.access_token, refreshCredits])

  const restorePurchases = useCallback(async () => {
    if (!billing || !session?.access_token) return
    setPurchasing(true)

    try {
      const result = await billing.restorePurchases()
      const purchases = result?.purchases || []

      for (const p of purchases) {
        if (p.purchaseToken) {
          await fetch(apiBase + '/api/verify-purchase', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              productId: p.productId,
              purchaseToken: p.purchaseToken,
              orderId: p.orderId || null,
              restore: true,
            }),
          })
        }
      }

      await refreshCredits()
    } catch (err) {
      console.error('Restore failed:', err)
    } finally {
      setPurchasing(false)
    }
  }, [billing, session?.access_token, refreshCredits])

  return {
    available: !!billing,
    products,
    purchasing,
    purchase,
    restorePurchases,
  }
}
