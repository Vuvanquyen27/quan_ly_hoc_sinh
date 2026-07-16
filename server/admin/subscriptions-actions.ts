'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin, writeAudit } from '@/lib/admin'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { activateSchema, renewSchema, changePlanSchema } from '@/lib/validators/admin'
import { todayVnDate } from '@/lib/datetime'

export type SubscriptionActionState = { error?: string } | null

// ---------- Helpers ngày/chu kỳ (giờ VN) ----------

/** 'YYYY-MM-DD' (giờ VN) → UTC ISO tại 00:00 VN. */
function isoAtVnMidnight(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00+07:00').toISOString()
}

/** Cộng một chu kỳ (tháng/năm) vào ngày lịch 'YYYY-MM-DD'. */
function addCycleDate(dateStr: string, cycle: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  if (cycle === 'yearly') base.setUTCFullYear(base.getUTCFullYear() + 1)
  else base.setUTCMonth(base.getUTCMonth() + 1)
  return base.toISOString().slice(0, 10)
}

/** Ngày lịch VN 'YYYY-MM-DD' của một timestamptz. */
function vnDateOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

type PlanRow = { id: string; billing_cycle: string; price: number }
type SubRow = { id: string; status: string; expires_at: string | null; started_at: string | null }

async function loadPlanAndSub(
  admin: ReturnType<typeof createAdminSupabase>,
  userId: string,
  planId: string,
): Promise<{ plan: PlanRow; sub: SubRow } | { error: string }> {
  const [{ data: plan }, { data: sub }] = await Promise.all([
    admin.from('plans').select('id,billing_cycle,price').eq('id', planId).maybeSingle(),
    admin.from('subscriptions').select('id,status,expires_at,started_at').eq('user_id', userId).maybeSingle(),
  ])
  if (!plan) return { error: 'Không tìm thấy gói.' }
  if (!sub) return { error: 'Tài khoản chưa có bản ghi thuê bao.' }
  return { plan: plan as PlanRow, sub: sub as SubRow }
}

/**
 * Xác nhận thanh toán & KÍCH HOẠT: tạo subscription_payments (activation, confirmed);
 * đặt subscriptions {plan, billing_cycle, started_at, expires_at, status='active'}; audit.
 */
export async function confirmPaymentAndActivate(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { error: 'Thiếu mã tài khoản.' }

  const parsed = activateSchema.safeParse({
    planId: String(formData.get('planId') ?? ''),
    method: String(formData.get('method') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    periodStart: String(formData.get('periodStart') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const admin = createAdminSupabase()
  const loaded = await loadPlanAndSub(admin, userId, d.planId)
  if ('error' in loaded) return loaded
  const { plan, sub } = loaded

  const startDate = d.periodStart
  const endDate = addCycleDate(startDate, plan.billing_cycle)
  const periodStartIso = isoAtVnMidnight(startDate)
  const periodEndIso = isoAtVnMidnight(endDate)
  const nowIso = new Date().toISOString()

  const { error: payErr } = await admin.from('subscription_payments').insert({
    subscription_id: sub.id,
    user_id: userId,
    plan_id: plan.id,
    kind: 'activation',
    amount: d.amount,
    currency: 'VND',
    billing_cycle: plan.billing_cycle,
    period_start: periodStartIso,
    period_end: periodEndIso,
    status: 'confirmed',
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
    confirmed_by: actor.id,
    confirmed_at: nowIso,
    note: (d.note ?? '').trim() || null,
  })
  if (payErr) return { error: 'Không ghi được thanh toán.' }

  const { error: subErr } = await admin
    .from('subscriptions')
    .update({
      plan_id: plan.id,
      billing_cycle: plan.billing_cycle,
      status: 'active',
      started_at: sub.started_at ?? periodStartIso,
      expires_at: periodEndIso,
      cancelled_at: null,
    })
    .eq('id', sub.id)
  if (subErr) return { error: 'Không cập nhật được thuê bao.' }

  await writeAudit({
    actorId: actor.id,
    action: 'activate_subscription',
    targetUserId: userId,
    targetSubscriptionId: sub.id,
    metadata: { plan_id: plan.id, amount: d.amount, method: d.method, period_start: startDate, period_end: endDate },
  })

  revalidatePath(`/admin/tai-khoan/${userId}`)
  revalidatePath('/admin/tai-khoan')
  return null
}

/**
 * GIA HẠN: tạo subscription_payments (renewal); đẩy expires_at thêm một chu kỳ
 * kể từ hạn hiện tại (nếu còn hạn) hoặc từ hôm nay (nếu đã hết hạn); audit.
 */
export async function renewSubscription(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { error: 'Thiếu mã tài khoản.' }

  const parsed = renewSchema.safeParse({
    planId: String(formData.get('planId') ?? ''),
    method: String(formData.get('method') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    reference: String(formData.get('reference') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const admin = createAdminSupabase()
  const loaded = await loadPlanAndSub(admin, userId, d.planId)
  if ('error' in loaded) return loaded
  const { plan, sub } = loaded

  const nowMs = Date.now()
  const stillValid = sub.expires_at && new Date(sub.expires_at).getTime() > nowMs
  const startDate = stillValid ? vnDateOf(sub.expires_at as string) : todayVnDate()
  const endDate = addCycleDate(startDate, plan.billing_cycle)
  const periodStartIso = isoAtVnMidnight(startDate)
  const periodEndIso = isoAtVnMidnight(endDate)
  const nowIso = new Date().toISOString()

  const { error: payErr } = await admin.from('subscription_payments').insert({
    subscription_id: sub.id,
    user_id: userId,
    plan_id: plan.id,
    kind: 'renewal',
    amount: d.amount,
    currency: 'VND',
    billing_cycle: plan.billing_cycle,
    period_start: periodStartIso,
    period_end: periodEndIso,
    status: 'confirmed',
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
    confirmed_by: actor.id,
    confirmed_at: nowIso,
    note: (d.note ?? '').trim() || null,
  })
  if (payErr) return { error: 'Không ghi được thanh toán gia hạn.' }

  const { error: subErr } = await admin
    .from('subscriptions')
    .update({
      plan_id: plan.id,
      billing_cycle: plan.billing_cycle,
      status: 'active',
      started_at: sub.started_at ?? periodStartIso,
      expires_at: periodEndIso,
      cancelled_at: null,
    })
    .eq('id', sub.id)
  if (subErr) return { error: 'Không cập nhật được thuê bao.' }

  await writeAudit({
    actorId: actor.id,
    action: 'renew_subscription',
    targetUserId: userId,
    targetSubscriptionId: sub.id,
    metadata: { plan_id: plan.id, amount: d.amount, method: d.method, period_start: startDate, period_end: endDate },
  })

  revalidatePath(`/admin/tai-khoan/${userId}`)
  revalidatePath('/admin/tai-khoan')
  return null
}

/** ĐỔI GÓI (không phát sinh thanh toán): đổi plan_id + billing_cycle; audit change_plan. */
export async function changePlan(formData: FormData): Promise<void> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  const parsed = changePlanSchema.safeParse({ planId: String(formData.get('planId') ?? '') })
  if (!userId || !parsed.success) return

  const admin = createAdminSupabase()
  const loaded = await loadPlanAndSub(admin, userId, parsed.data.planId)
  if ('error' in loaded) return
  const { plan, sub } = loaded

  const { error } = await admin
    .from('subscriptions')
    .update({ plan_id: plan.id, billing_cycle: plan.billing_cycle })
    .eq('id', sub.id)
  if (error) return

  await writeAudit({
    actorId: actor.id,
    action: 'change_plan',
    targetUserId: userId,
    targetSubscriptionId: sub.id,
    metadata: { plan_id: plan.id, billing_cycle: plan.billing_cycle },
  })
  revalidatePath(`/admin/tai-khoan/${userId}`)
}

/** HỦY THUÊ BAO: status='cancelled', cancelled_at=now; audit cancel_subscription. */
export async function cancelSubscription(formData: FormData): Promise<void> {
  const actor = await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return

  const admin = createAdminSupabase()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!sub) return

  const { error } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', (sub as { id: string }).id)
  if (error) return

  await writeAudit({
    actorId: actor.id,
    action: 'cancel_subscription',
    targetUserId: userId,
    targetSubscriptionId: (sub as { id: string }).id,
  })
  revalidatePath(`/admin/tai-khoan/${userId}`)
  revalidatePath('/admin/tai-khoan')
}
