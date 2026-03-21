import { supabase } from '@/lib/supabase'

const ANON_KEY = 'vpc_anon_credits'
const FREE_WEEKLY = 3
const MAX_AD_REWARDS_PER_DAY = 5

// ─── Helpers ────────────────────────────────────────────────────────────────

function getNextMondayUTC() {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon
  const diff = day === 0 ? 1 : 8 - day
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return next.toISOString()
}

function shouldResetWeek(weekResetAt) {
  if (!weekResetAt) return true
  return new Date() >= new Date(weekResetAt)
}

// ─── Supabase (authenticated users) ────────────────────────────────────────

export async function fetchUserCredits(userId) {
  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // Row doesn't exist yet — create it
    const newRow = {
      user_id: userId,
      free_credits: FREE_WEEKLY,
      purchased_credits: 0,
      is_pro: false,
      pro_expires_at: null,
      week_reset_at: getNextMondayUTC(),
    }
    const { data: created, error: createErr } = await supabase
      .from('user_credits')
      .insert(newRow)
      .select()
      .single()
    if (createErr) throw createErr
    return created
  }

  if (error) throw error

  // Lazy weekly reset
  if (shouldResetWeek(data.week_reset_at)) {
    const updated = {
      free_credits: FREE_WEEKLY,
      week_reset_at: getNextMondayUTC(),
      updated_at: new Date().toISOString(),
    }
    const { data: refreshed, error: updateErr } = await supabase
      .from('user_credits')
      .update(updated)
      .eq('user_id', userId)
      .select()
      .single()
    if (updateErr) throw updateErr
    return refreshed
  }

  return data
}

export async function deductCredit(userId) {
  const credits = await fetchUserCredits(userId)

  // Pro users — no deduction
  if (credits.is_pro && credits.pro_expires_at && new Date(credits.pro_expires_at) > new Date()) {
    return credits
  }

  if (credits.free_credits > 0) {
    const { data, error } = await supabase
      .from('user_credits')
      .update({ free_credits: credits.free_credits - 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  if (credits.purchased_credits > 0) {
    const { data, error } = await supabase
      .from('user_credits')
      .update({ purchased_credits: credits.purchased_credits - 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  throw new Error('NO_CREDITS')
}

export async function addCredits(userId, amount) {
  const credits = await fetchUserCredits(userId)
  const { data, error } = await supabase
    .from('user_credits')
    .update({
      purchased_credits: credits.purchased_credits + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setProStatus(userId, isPro, expiresAt) {
  const { data, error } = await supabase
    .from('user_credits')
    .update({
      is_pro: isPro,
      pro_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function grantAdCredit(userId) {
  // Check daily limit
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { count, error: countErr } = await supabase
    .from('ad_reward_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())

  if (countErr) throw countErr
  if (count >= MAX_AD_REWARDS_PER_DAY) {
    throw new Error('DAILY_AD_LIMIT')
  }

  // Log the reward
  const { error: logErr } = await supabase
    .from('ad_reward_log')
    .insert({ user_id: userId, ad_type: 'rewarded', credits_granted: 1 })
  if (logErr) throw logErr

  // Add the credit
  return addCredits(userId, 1)
}

// ─── Anonymous (localStorage) ──────────────────────────────────────────────

export function getAnonCredits() {
  try {
    const raw = localStorage.getItem(ANON_KEY)
    if (!raw) return { used: 0, weekStart: getWeekStartTimestamp() }
    const parsed = JSON.parse(raw)
    // Reset if we're past the week boundary
    if (Date.now() >= parsed.weekStart + 7 * 24 * 60 * 60 * 1000) {
      return { used: 0, weekStart: getWeekStartTimestamp() }
    }
    return parsed
  } catch {
    return { used: 0, weekStart: getWeekStartTimestamp() }
  }
}

export function useAnonCredit() {
  const credits = getAnonCredits()
  if (credits.used >= FREE_WEEKLY) return false
  credits.used += 1
  localStorage.setItem(ANON_KEY, JSON.stringify(credits))
  return true
}

export function getAnonRemaining() {
  const credits = getAnonCredits()
  return Math.max(0, FREE_WEEKLY - credits.used)
}

function getWeekStartTimestamp() {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = start of week
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return monday.getTime()
}
