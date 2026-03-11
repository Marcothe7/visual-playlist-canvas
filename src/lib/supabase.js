import { createClient } from '@supabase/supabase-js'

// When the user initiates Spotify OAuth, a flag is set in sessionStorage so the
// Supabase client won't intercept the Spotify ?code= callback as a Supabase auth
// code (which would fire SIGNED_OUT and clear the user's session).
const spotifyOAuthPending = sessionStorage.getItem('spotify-oauth-pending') === '1'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { detectSessionInUrl: !spotifyOAuthPending } }
)
