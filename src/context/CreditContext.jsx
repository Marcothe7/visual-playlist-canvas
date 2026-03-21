import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { useAuthState } from '@/context/AuthContext'
import {
  fetchUserCredits,
  deductCredit as deductCreditService,
  grantAdCredit as grantAdCreditService,
  getAnonRemaining,
  useAnonCredit,
} from '@/services/creditService'
import { apiBase } from '@/lib/api'

// ─── State ──────────────────────────────────────────────────────────────────
const initialState = {
  freeCredits: 3,
  purchasedCredits: 0,
  isPro: false,
  proExpiresAt: null,
  weekResetAt: null,
  loading: true,
  paywallOpen: false,
}

function creditReducer(state, action) {
  switch (action.type) {
    case 'SET_CREDITS':
      return {
        ...state,
        freeCredits: action.payload.free_credits ?? 0,
        purchasedCredits: action.payload.purchased_credits ?? 0,
        isPro: action.payload.is_pro ?? false,
        proExpiresAt: action.payload.pro_expires_at ?? null,
        weekResetAt: action.payload.week_reset_at ?? null,
        loading: false,
      }
    case 'SET_ANON_CREDITS':
      return {
        ...state,
        freeCredits: action.payload,
        purchasedCredits: 0,
        isPro: false,
        loading: false,
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'OPEN_PAYWALL':
      return { ...state, paywallOpen: true }
    case 'CLOSE_PAYWALL':
      return { ...state, paywallOpen: false }
    default:
      return state
  }
}

// ─── Context ────────────────────────────────────────────────────────────────
const CreditCtx = createContext(null)

// ─── Provider ───────────────────────────────────────────────────────────────
export function CreditProvider({ children }) {
  const { user, session } = useAuthState()
  const [state, dispatch] = useReducer(creditReducer, initialState)

  // Fetch credits on auth change + check subscription status
  useEffect(() => {
    if (user?.id && session) {
      dispatch({ type: 'SET_LOADING', payload: true })
      fetchUserCredits(user.id)
        .then(async (data) => {
          dispatch({ type: 'SET_CREDITS', payload: data })
          // If user is pro, verify subscription is still active
          if (data.is_pro && session.access_token) {
            try {
              const res = await fetch(apiBase + '/api/check-subscription', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  'authorization': `Bearer ${session.access_token}`,
                },
              })
              if (res.ok) {
                const sub = await res.json()
                if (sub.expired) {
                  // Re-fetch credits to get updated non-pro state
                  const refreshed = await fetchUserCredits(user.id)
                  dispatch({ type: 'SET_CREDITS', payload: refreshed })
                }
              }
            } catch { /* silent — subscription check is best-effort */ }
          }
        })
        .catch(() => dispatch({ type: 'SET_LOADING', payload: false }))
    } else {
      // Anonymous — use localStorage
      const remaining = getAnonRemaining()
      dispatch({ type: 'SET_ANON_CREDITS', payload: remaining })
    }
  }, [user?.id, session])

  const refreshCredits = useCallback(async () => {
    if (!user?.id) {
      const remaining = getAnonRemaining()
      dispatch({ type: 'SET_ANON_CREDITS', payload: remaining })
      return
    }
    try {
      const data = await fetchUserCredits(user.id)
      dispatch({ type: 'SET_CREDITS', payload: data })
    } catch { /* silent */ }
  }, [user?.id])

  const deductCredit = useCallback(async () => {
    if (!user?.id) {
      // Anonymous
      const ok = useAnonCredit()
      if (!ok) throw new Error('NO_CREDITS')
      const remaining = getAnonRemaining()
      dispatch({ type: 'SET_ANON_CREDITS', payload: remaining })
      return
    }
    const data = await deductCreditService(user.id)
    dispatch({ type: 'SET_CREDITS', payload: data })
  }, [user?.id])

  const grantAdReward = useCallback(async () => {
    if (!user?.id) throw new Error('SIGN_IN_REQUIRED')
    const data = await grantAdCreditService(user.id)
    dispatch({ type: 'SET_CREDITS', payload: data })
  }, [user?.id])

  const openPaywall = useCallback(() => {
    dispatch({ type: 'OPEN_PAYWALL' })
  }, [])

  const closePaywall = useCallback(() => {
    dispatch({ type: 'CLOSE_PAYWALL' })
  }, [])

  const value = {
    ...state,
    totalCredits: state.isPro ? Infinity : state.freeCredits + state.purchasedCredits,
    hasCredits: state.isPro || (state.freeCredits + state.purchasedCredits) > 0,
    refreshCredits,
    deductCredit,
    grantAdReward,
    openPaywall,
    closePaywall,
  }

  return <CreditCtx.Provider value={value}>{children}</CreditCtx.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useCredits() {
  const ctx = useContext(CreditCtx)
  if (!ctx) throw new Error('useCredits must be used within CreditProvider')
  return ctx
}
