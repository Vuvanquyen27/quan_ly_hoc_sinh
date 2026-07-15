import { createServerSupabase } from '@/lib/supabase/server'

export type SettingsData = {
  email: string | null
  profile: { full_name: string | null; phone: string | null; avatar_url: string | null } | null
  settings: {
    currency: string
    timezone: string
    date_format: string
    default_session_duration_min: number
    notify_session_reminder: boolean
    notify_payment_due: boolean
  } | null
  subscription: {
    status: string
    trial_ends_at: string | null
    expires_at: string | null
    billing_cycle: string | null
  } | null
}

/** Hồ sơ + tùy chọn + gói của USER hiện tại. */
export async function getSettings(): Promise<SettingsData | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: settings }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', user.id).maybeSingle(),
    supabase
      .from('user_settings')
      .select(
        'currency, timezone, date_format, default_session_duration_min, notify_session_reminder, notify_payment_due',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at, expires_at, billing_cycle')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])
  return {
    email: user.email ?? null,
    profile: (profile as SettingsData['profile']) ?? null,
    settings: (settings as SettingsData['settings']) ?? null,
    subscription: (subscription as SettingsData['subscription']) ?? null,
  }
}
