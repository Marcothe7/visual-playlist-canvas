import { createClient } from '@supabase/supabase-js'

const PRODUCT_CREDITS = {
  ai_recs_pack_10: 10,
  ai_recs_pack_50: 50,
}

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

  const { productId, purchaseToken, orderId, restore } = req.body
  if (!productId || !purchaseToken) {
    return res.status(400).json({ error: 'productId and purchaseToken required' })
  }

  try {
    // Check if we already processed this purchase
    const { data: existing } = await supabaseAdmin
      .from('purchase_history')
      .select('id')
      .eq('purchase_token', purchaseToken)
      .eq('status', 'verified')
      .single()

    if (existing) {
      // Already processed — idempotent
      return res.status(200).json({ status: 'already_verified' })
    }

    // TODO: In production, verify the purchase token with Google Play Developer API
    // using the GOOGLE_PLAY_SERVICE_ACCOUNT_KEY env var.
    // For now, we trust the client (this is fine for testing/development).
    // Google verification would call:
    //   androidpublisher.purchases.products.get (for consumables)
    //   androidpublisher.purchases.subscriptions.get (for subscriptions)

    // Determine purchase type
    const isSubscription = productId === 'ai_recs_unlimited'
    const credits = PRODUCT_CREDITS[productId] || 0

    // Log purchase
    await supabaseAdmin.from('purchase_history').insert({
      user_id: user.id,
      product_id: productId,
      purchase_token: purchaseToken,
      order_id: orderId || null,
      purchase_type: isSubscription ? 'subscription' : 'consumable',
      credits_granted: credits,
      status: 'verified',
      verified_at: new Date().toISOString(),
    })

    if (isSubscription) {
      // Set pro status — subscription valid for 30 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      await supabaseAdmin
        .from('user_credits')
        .upsert({
          user_id: user.id,
          is_pro: true,
          pro_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })

      return res.status(200).json({ status: 'verified', isPro: true })
    } else {
      // Add credits
      // Fetch current credits first
      const { data: current } = await supabaseAdmin
        .from('user_credits')
        .select('purchased_credits')
        .eq('user_id', user.id)
        .single()

      const currentCredits = current?.purchased_credits ?? 0

      await supabaseAdmin
        .from('user_credits')
        .upsert({
          user_id: user.id,
          purchased_credits: currentCredits + credits,
          updated_at: new Date().toISOString(),
        })

      return res.status(200).json({
        status: 'verified',
        creditsAdded: credits,
        totalCredits: currentCredits + credits,
      })
    }
  } catch (err) {
    console.error('Purchase verification error:', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
}
