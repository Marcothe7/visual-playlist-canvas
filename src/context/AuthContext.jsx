import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── State ────────────────────────────────────────────────────────────────────
const initialState = {
  user:           null,
  session:        null,
  loading:        true,
  authModalOpen:  false,
  authModalTab:   'signin', // 'signin' | 'signup' | 'forgot'
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, user: action.payload?.user ?? null, session: action.payload, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'OPEN_MODAL':
      return { ...state, authModalOpen: true, authModalTab: action.payload ?? 'signin' }
    case 'CLOSE_MODAL':
      return { ...state, authModalOpen: false }
    case 'SET_TAB':
      return { ...state, authModalTab: action.payload }
    default:
      return state
  }
}

// ─── Contexts ─────────────────────────────────────────────────────────────────
const AuthStateCtx    = createContext(null)
const AuthDispatchCtx = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    // Hydrate from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', payload: session })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_SESSION', payload: session })
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthStateCtx.Provider value={state}>
      <AuthDispatchCtx.Provider value={dispatch}>
        {children}
      </AuthDispatchCtx.Provider>
    </AuthStateCtx.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useAuthState() {
  const ctx = useContext(AuthStateCtx)
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider')
  return ctx
}

export function useAuthDispatch() {
  const ctx = useContext(AuthDispatchCtx)
  if (!ctx) throw new Error('useAuthDispatch must be used within AuthProvider')
  return ctx
}

export function useAuth() {
  const state    = useAuthState()
  const dispatch = useAuthDispatch()

  const openAuthModal = useCallback((tab = 'signin') => {
    dispatch({ type: 'OPEN_MODAL', payload: tab })
  }, [dispatch])

  const closeAuthModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' })
  }, [dispatch])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    dispatch({ type: 'CLOSE_MODAL' })
  }, [dispatch])

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // Don't close modal — show "check your email" state in the modal
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }, [])

  return {
    user:           state.user,
    session:        state.session,
    loading:        state.loading,
    authModalOpen:  state.authModalOpen,
    authModalTab:   state.authModalTab,
    openAuthModal,
    closeAuthModal,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    sendPasswordReset,
    setTab: (tab) => dispatch({ type: 'SET_TAB', payload: tab }),
  }
}
