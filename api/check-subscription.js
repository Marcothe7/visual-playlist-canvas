import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // Auth
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7))
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  try {
    const { data: credits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!credits) {
      return res.status(200).json({ isPro: false })
    }

    // Check if subscription has expired
    if (credits.is_pro && credits.pro_expires_at) {
      const expiresAt = new Date(credits.pro_expires_at)

      if (expiresAt <= new Date()) {
        // Subscription expired — revoke pro status
        // TODO: In production, also check Google Play subscription status
        // to handle auto-renewal via androidpublisher API
        await supabaseAdmin
          .from('user_credits')
          .update({
            is_pro: false,
            pro_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        return res.status(200).json({
          isPro: false,
          expired: true,
          message: 'Your subscription has expired',
        })
      }

      return res.status(200).json({
        isPro: true,
        expiresAt: credits.pro_expires_at,
      })
    }

    return res.status(200).json({ isPro: credits.is_pro || false })
  } catch (err) {
    console.error('Subscription check error:', err)
    return res.status(500).json({ error: 'Failed to check subscription' })
  }
}
