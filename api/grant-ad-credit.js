import { createClient } from '@supabase/supabase-js'

const MAX_AD_REWARDS_PER_DAY = 5

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
    // Check daily limit
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const { count, error: countErr } = await supabaseAdmin
      .from('ad_reward_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())

    if (countErr) throw countErr

    if (count >= MAX_AD_REWARDS_PER_DAY) {
      return res.status(429).json({
        error: 'DAILY_AD_LIMIT',
        message: `Maximum ${MAX_AD_REWARDS_PER_DAY} ad rewards per day`,
      })
    }

    // Log the reward
    const { error: logErr } = await supabaseAdmin
      .from('ad_reward_log')
      .insert({
        user_id: user.id,
        ad_type: 'rewarded',
        credits_granted: 1,
      })
    if (logErr) throw logErr

    // Add credit
    const { data: credits } = await supabaseAdmin
      .from('user_credits')
      .select('purchased_credits')
      .eq('user_id', user.id)
      .single()

    const currentCredits = credits?.purchased_credits ?? 0

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('user_credits')
      .upsert({
        user_id: user.id,
        purchased_credits: currentCredits + 1,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (updateErr) throw updateErr

    return res.status(200).json({
      status: 'credited',
      creditsAdded: 1,
      purchasedCredits: updated.purchased_credits,
      remainingAdRewards: MAX_AD_REWARDS_PER_DAY - count - 1,
    })
  } catch (err) {
    console.error('Ad credit error:', err)
    return res.status(500).json({ error: 'Failed to grant ad credit' })
  }
}
