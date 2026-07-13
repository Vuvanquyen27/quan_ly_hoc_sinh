import { createServerSupabase } from '@/lib/supabase/server'

export type SessionProfile = { full_name: string | null; is_locked: boolean; role: string }
export type SessionSubscription = {
  status: string
  trial_ends_at: string | null
  expires_at: string | null
  plan_id: string | null
}
export type SessionContext = {
  user: { id: string; email: string | null }
  profile: SessionProfile | null
  subscription: SessionSubscription | null
}

/** Lấy ngữ cảnh phiên: user + profile + subscription. Trả null nếu chưa đăng nhập. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('full_name, is_locked, role').eq('id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at, expires_at, plan_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: (profile as SessionProfile | null) ?? null,
    subscription: (subscription as SessionSubscription | null) ?? null,
  }
}

/** Tài khoản có đang ở chế độ chỉ đọc không (khóa hoặc thuê bao hết hạn). */
export function isReadOnly(ctx: SessionContext): boolean {
  if (ctx.profile?.is_locked) return true
  const s = ctx.subscription
  if (!s) return false
  if (s.status === 'expired' || s.status === 'cancelled') return true
  if (s.status === 'trialing' && s.trial_ends_at && new Date(s.trial_ends_at).getTime() < Date.now()) {
    return true
  }
  return false
}
