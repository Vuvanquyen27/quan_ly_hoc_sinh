import { assertAdmin } from '@/lib/admin'
import { createAdminSupabase } from '@/lib/supabase/admin'

// ---------- Kiểu dữ liệu ----------

export type AccountSub = {
  id: string | null
  status: string
  plan_id: string | null
  plan_name: string | null
  billing_cycle: string | null
  trial_ends_at: string | null
  started_at: string | null
  expires_at: string | null
  cancelled_at: string | null
}

export type AdminAccount = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  is_locked: boolean
  role: string
  created_at: string
  sub: AccountSub | null
}

export type Plan = {
  id: string
  code: string
  name: string
  description: string | null
  price: number
  billing_cycle: string
  is_active: boolean
  sort_order: number
}

export type SubPayment = {
  id: string
  plan_id: string | null
  kind: string
  amount: number
  currency: string
  billing_cycle: string | null
  method: string | null
  status: string
  period_start: string | null
  period_end: string | null
  reference: string | null
  note: string | null
  confirmed_at: string | null
  created_at: string
}

export type AuditEntry = {
  id: string
  actor_id: string
  actor_email: string | null
  action: string
  target_user_id: string | null
  target_email: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type PlatformStats = {
  totalUsers: number
  byStatus: Record<string, number>
  lockedCount: number
  newLast30Days: number
}

export const ACCOUNTS_PAGE_SIZE = 20
export const AUDIT_PAGE_SIZE = 30

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  is_locked: boolean
  role: string
  created_at: string
}
type SubRow = {
  id: string
  user_id: string
  status: string
  plan_id: string | null
  billing_cycle: string | null
  trial_ends_at: string | null
  started_at: string | null
  expires_at: string | null
  cancelled_at: string | null
}

/** Bỏ ký tự có thể phá cú pháp `or`/`ilike` của PostgREST. */
function sanitize(term: string): string {
  return term.replace(/[,()*%]/g, ' ').trim()
}

function mergeSub(sub: SubRow | undefined, planName: (id: string | null) => string | null): AccountSub | null {
  if (!sub) return null
  return {
    id: sub.id,
    status: sub.status,
    plan_id: sub.plan_id,
    plan_name: planName(sub.plan_id),
    billing_cycle: sub.billing_cycle,
    trial_ends_at: sub.trial_ends_at,
    started_at: sub.started_at,
    expires_at: sub.expires_at,
    cancelled_at: sub.cancelled_at,
  }
}

/**
 * Danh sách tài khoản USER (profiles + subscriptions), có tìm kiếm/lọc trạng thái + phân trang.
 * Dùng admin client (service_role) SAU assertAdmin. Ghép trong JS (MVP: quy mô nhỏ);
 * chuyển sang view nếu số tài khoản lớn.
 */
export async function listAccounts(
  params: { search?: string; status?: string; page?: number } = {},
): Promise<{ rows: AdminAccount[]; total: number; page: number; pageSize: number }> {
  await assertAdmin()
  const admin = createAdminSupabase()
  const page = Math.max(1, params.page ?? 1)

  let profQ = admin
    .from('profiles')
    .select('id,email,full_name,phone,is_locked,role,created_at')
    .order('created_at', { ascending: false })
  const search = params.search ? sanitize(params.search) : ''
  // PostgREST or(): dùng wildcard '*' (không phải '%' — sẽ bị encode thành literal).
  if (search) profQ = profQ.or(`email.ilike.*${search}*,full_name.ilike.*${search}*`)

  const [{ data: profs }, { data: subs }, { data: plans }] = await Promise.all([
    profQ,
    admin.from('subscriptions').select('id,user_id,status,plan_id,billing_cycle,trial_ends_at,started_at,expires_at,cancelled_at'),
    admin.from('plans').select('id,name'),
  ])

  const planName = (id: string | null) =>
    (id && (plans as { id: string; name: string }[] | null)?.find((p) => p.id === id)?.name) || null
  const subByUser = new Map<string, SubRow>()
  for (const s of (subs as SubRow[] | null) ?? []) subByUser.set(s.user_id, s)

  let rows: AdminAccount[] = ((profs as ProfileRow[] | null) ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    phone: p.phone,
    is_locked: p.is_locked,
    role: p.role,
    created_at: p.created_at,
    sub: mergeSub(subByUser.get(p.id), planName),
  }))

  if (params.status) rows = rows.filter((r) => r.sub?.status === params.status)

  const total = rows.length
  const from = (page - 1) * ACCOUNTS_PAGE_SIZE
  return {
    rows: rows.slice(from, from + ACCOUNTS_PAGE_SIZE),
    total,
    page,
    pageSize: ACCOUNTS_PAGE_SIZE,
  }
}

/** Chi tiết một tài khoản: hồ sơ + thuê bao + lịch sử thanh toán + danh mục gói. */
export async function getAccountDetail(
  id: string,
): Promise<{ account: AdminAccount; payments: SubPayment[]; plans: Plan[] } | null> {
  await assertAdmin()
  const admin = createAdminSupabase()

  const [{ data: prof }, { data: sub }, { data: payments }, { data: plans }] = await Promise.all([
    admin.from('profiles').select('id,email,full_name,phone,is_locked,role,created_at').eq('id', id).maybeSingle(),
    admin.from('subscriptions').select('id,user_id,status,plan_id,billing_cycle,trial_ends_at,started_at,expires_at,cancelled_at').eq('user_id', id).maybeSingle(),
    admin.from('subscription_payments').select('id,plan_id,kind,amount,currency,billing_cycle,method,status,period_start,period_end,reference,note,confirmed_at,created_at').eq('user_id', id).order('created_at', { ascending: false }),
    admin.from('plans').select('id,code,name,description,price,billing_cycle,is_active,sort_order').order('sort_order', { ascending: true }),
  ])

  if (!prof) return null
  const p = prof as ProfileRow
  const planList = (plans as Plan[] | null) ?? []
  const planName = (pid: string | null) => (pid && planList.find((x) => x.id === pid)?.name) || null

  return {
    account: {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      is_locked: p.is_locked,
      role: p.role,
      created_at: p.created_at,
      sub: mergeSub((sub as SubRow | null) ?? undefined, planName),
    },
    payments: (payments as SubPayment[] | null) ?? [],
    plans: planList,
  }
}

/** Toàn bộ gói (kể cả không mở bán) cho khu admin. */
export async function listPlansAdmin(): Promise<Plan[]> {
  await assertAdmin()
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('plans')
    .select('id,code,name,description,price,billing_cycle,is_active,sort_order')
    .order('sort_order', { ascending: true })
  return (data as Plan[] | null) ?? []
}

/** Một gói theo id (cho trang sửa). */
export async function getPlan(id: string): Promise<Plan | null> {
  await assertAdmin()
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('plans')
    .select('id,code,name,description,price,billing_cycle,is_active,sort_order')
    .eq('id', id)
    .maybeSingle()
  return (data as Plan | null) ?? null
}

/** Thống kê tổng hợp nền tảng (KHÔNG lộ dữ liệu nghiệp vụ cá nhân). */
export async function getPlatformStats(): Promise<PlatformStats> {
  await assertAdmin()
  const admin = createAdminSupabase()
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: totalUsers }, { data: subs }, { count: lockedCount }, { count: newLast30Days }] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('subscriptions').select('status'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_locked', true),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyAgo),
    ])

  const byStatus: Record<string, number> = {}
  for (const s of (subs as { status: string }[] | null) ?? []) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1
  }

  return {
    totalUsers: totalUsers ?? 0,
    byStatus,
    lockedCount: lockedCount ?? 0,
    newLast30Days: newLast30Days ?? 0,
  }
}

/** Nhật ký kiểm toán (lọc theo action) + phân trang; đính kèm email actor/target. */
export async function listAuditLogs(
  params: { action?: string; page?: number } = {},
): Promise<{ rows: AuditEntry[]; total: number; page: number; pageSize: number }> {
  await assertAdmin()
  const admin = createAdminSupabase()
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * AUDIT_PAGE_SIZE
  const to = from + AUDIT_PAGE_SIZE - 1

  let q = admin
    .from('admin_audit_logs')
    .select('id,actor_id,action,target_user_id,metadata,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (params.action) q = q.eq('action', params.action)

  const { data, count } = await q
  const logs = (data as Omit<AuditEntry, 'actor_email' | 'target_email'>[] | null) ?? []

  const ids = Array.from(
    new Set(logs.flatMap((l) => [l.actor_id, l.target_user_id].filter(Boolean) as string[])),
  )
  const emailById = new Map<string, string | null>()
  if (ids.length) {
    const { data: profs } = await admin.from('profiles').select('id,email').in('id', ids)
    for (const p of (profs as { id: string; email: string | null }[] | null) ?? []) {
      emailById.set(p.id, p.email)
    }
  }

  return {
    rows: logs.map((l) => ({
      ...l,
      actor_email: emailById.get(l.actor_id) ?? null,
      target_email: l.target_user_id ? emailById.get(l.target_user_id) ?? null : null,
    })),
    total: count ?? 0,
    page,
    pageSize: AUDIT_PAGE_SIZE,
  }
}
