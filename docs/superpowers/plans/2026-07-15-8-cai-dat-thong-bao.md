# Giai đoạn 8 — Cài đặt & Thông báo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang **Cài đặt** (`/cai-dat`: hồ sơ + tùy chọn + gói chỉ đọc, upload ảnh đại diện) + **Thông báo in-app** (`/thong-bao`: danh sách, đánh dấu đã đọc, nút "Tạo nhắc nhở"), chuông + link Cài đặt ở header — cách ly tuyệt đối theo `user_id`.

**Architecture:** Bảng `notifications` (RLS) + bucket Storage `avatars` (public, ghi theo tiền tố `user_id/`). Server `server/settings/*` (hồ sơ/tùy chọn/avatar) + `server/notifications/*` (list/mark/generate). `generateReminders` quét `v_upcoming_sessions` (GĐ7) + `listUpcomingDue()` (GĐ6), chèn thông báo dedup, gate bởi prefs `notify_*`. Hiển thị tiền/ngày cố định VN cho MVP (prefs được lưu, chưa áp hiển thị).

**Tech Stack:** Next.js App Router (Server Components + Server Actions), TypeScript strict, Supabase (`@supabase/ssr`) + PostgreSQL + RLS + Storage, Zod, Vitest, script raw-fetch cho RLS. **Không thêm dependency.**

**Spec nguồn:** `docs/superpowers/specs/2026-07-15-8-cai-dat-thong-bao-design.md`.

## Global Constraints

- **Ngôn ngữ UI:** tiếng Việt; `vi-VN`. Tiền `formatVND`; ngày `formatDate`/`formatDateTime` (`Asia/Ho_Chi_Minh`) — **cố định VN** ở MVP.
- **`user_id NOT NULL default auth.uid()`** + RLS 4 policy thuần `auth.uid() = user_id` cho `notifications`. Storage `avatars` ghi theo tiền tố `user_id/`.
- Server **không** nhận `user_id` từ client. `updateProfile`/`updateSettings`/`uploadAvatar` gate `requireWritable` + **whitelist cột** (`profiles`: chỉ `full_name`/`phone`/`avatar_url`). Action thông báo (`markRead`/`markAllRead`/`generateReminders`/`delete`) chỉ cần **phiên đăng nhập** (hộp thư cá nhân, không gate read-only).
- **Không** đưa `SUPABASE_SERVICE_ROLE_KEY` vào client.
- Số migration kế tiếp: **`0014`** (notifications) + **`0015`** (avatars storage). Versioned trong `supabase/migrations/`.
- TDD + commit thường xuyên. Test cách ly RLS `notifications` + Storage `avatars` là **release blocker**.

---

### Task 1: Migration `0014_notifications.sql` + `0015_storage_avatars.sql` + test RLS

**Files:**
- Create: `supabase/migrations/0014_notifications.sql`, `supabase/migrations/0015_storage_avatars.sql`
- Create: `scripts/test-rls-notifications.mjs`

**Interfaces:**
- Produces: bảng `public.notifications`; enum `public.notification_type`; bucket Storage `avatars` (public) + policy ghi theo tiền tố.

- [ ] **Step 1: Viết `0014_notifications.sql`**

```sql
-- ============================================================
-- 0014 — Thông báo in-app: notifications + RLS
-- Khớp docs/DATABASE.md §5.5 và specs/2026-07-15-8-cai-dat-thong-bao-design.md
-- ============================================================

create type public.notification_type as enum ('session_reminder','payment_due','system');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_read on public.notifications (user_id, is_read);
create index idx_notifications_user_created on public.notifications (user_id, created_at);

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select using (auth.uid() = user_id);
create policy notifications_insert on public.notifications for insert with check (auth.uid() = user_id);
create policy notifications_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete on public.notifications for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Viết `0015_storage_avatars.sql`**

```sql
-- ============================================================
-- 0015 — Storage bucket 'avatars' (public) + policy ghi theo tiền tố user_id/
-- Đọc công khai (ảnh đại diện); cách ly ở chiều ghi.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_write_own"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_update_own"
  on storage.objects for update
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_delete_own"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
```

- [ ] **Step 3: Áp cả hai migration**

Run:
```bash
node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0014_notifications.sql
node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0015_storage_avatars.sql
```
Expected: cả hai in `✅ Đã áp thành công`.

- [ ] **Step 4: Viết `scripts/test-rls-notifications.mjs`** (notifications RLS + avatars Storage ghi)

```js
// Kiểm thử cách ly RLS notifications + Storage avatars (ghi theo tiền tố).
// Chạy (SAU khi áp 0014+0015): node --env-file=.env.local scripts/test-rls-notifications.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
for (const [k, v] of [['URL', url], ['anon', anon], ['service_role', service]]) {
  if (!v || v.includes('REPLACE-ME')) { console.error(`❌ Thiếu ${k}`); process.exit(1) }
}

const svc = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
let pass = true
const ok = (m) => console.log('✅ ' + m)
const bad = (m) => { pass = false; console.log('❌ ' + m) }

async function mkUser(admin = false) {
  const email = `eduflow.noti.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
  const password = 'MatKhauTest123!'
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata: admin ? { role: 'admin' } : {} }),
  })
  const b = await r.json()
  return { id: b.id ?? b.user?.id, email, password }
}
const del = (id) => fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svc })
async function token(u) {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password }),
  })
  return (await r.json()).access_token
}
const head = (t) => ({ apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' })
const rep = (t) => ({ ...head(t), Prefer: 'return=representation' })
const putAvatar = (t, path) => fetch(`${url}/storage/v1/object/avatars/${path}`, {
  method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'text/plain' }, body: 'avatar-bytes',
})
const rmAvatar = (path) => fetch(`${url}/storage/v1/object/avatars/${path}`, { method: 'DELETE', headers: svc })

let A, B, C
const created = []
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // --- notifications ---
  const n = await (await fetch(`${url}/rest/v1/notifications`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ type: 'system', title: 'Xin chào' }),
  })).json()
  n[0]?.id ? ok('A tạo thông báo thành công') : bad(`A tạo thông báo lỗi: ${JSON.stringify(n).slice(0, 150)}`)

  const aN = await (await fetch(`${url}/rest/v1/notifications?select=id`, { headers: head(aT) })).json()
  aN.length === 1 ? ok('A đọc được thông báo của mình') : bad(`A thấy ${aN.length} (mong 1)`)

  const bN = await (await fetch(`${url}/rest/v1/notifications?select=id`, { headers: head(bT) })).json()
  Array.isArray(bN) && bN.length === 0 ? ok('B KHÔNG đọc được thông báo của A') : bad('B thấy thông báo của A!')

  const forge = await fetch(`${url}/rest/v1/notifications`, {
    method: 'POST', headers: head(bT), body: JSON.stringify({ user_id: A.id, type: 'system', title: 'gian lan' }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn thông báo user_id=A!') : ok(`B KHÔNG giả mạo user_id (HTTP ${forge.status})`)

  const bUpd = await fetch(`${url}/rest/v1/notifications?id=eq.${n[0].id}`, {
    method: 'PATCH', headers: rep(bT), body: JSON.stringify({ is_read: true }),
  })
  const bUpdBody = await bUpd.json()
  Array.isArray(bUpdBody) && bUpdBody.length === 0 ? ok('B KHÔNG cập nhật được thông báo của A') : bad('B sửa được thông báo của A!')

  const cN = await (await fetch(`${url}/rest/v1/notifications?select=id`, { headers: head(cT) })).json()
  Array.isArray(cN) && cN.length === 0 ? ok('ADMIN KHÔNG đọc được thông báo của USER') : bad('ADMIN đọc được thông báo!')

  // --- avatars storage ---
  const aOwn = `${A.id}/avatar.txt`
  created.push(aOwn)
  const aUp = await putAvatar(aT, aOwn)
  aUp.ok ? ok('A upload avatar vào tiền tố của mình') : bad(`A upload avatar lỗi (HTTP ${aUp.status})`)

  const bHack = await putAvatar(bT, `${A.id}/hack.txt`)
  if (bHack.ok) { created.push(`${A.id}/hack.txt`); bad('LỖ HỔNG: B upload được vào tiền tố avatars/A!') }
  else ok(`B KHÔNG upload được vào tiền tố của A (HTTP ${bHack.status})`)

  const bOwn = `${B.id}/avatar.txt`
  const bUp = await putAvatar(bT, bOwn)
  if (bUp.ok) { created.push(bOwn); ok('B upload avatar vào tiền tố của mình') }
  else bad(`B upload avatar của mình lỗi (HTTP ${bUp.status})`)
} catch (e) {
  if (!['setup'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const p of created) await rmAvatar(p)
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user + object test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS NOTIFICATIONS + AVATARS ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
```

- [ ] **Step 5: Chạy test**

Run: `node --env-file=.env.local scripts/test-rls-notifications.mjs`
Expected: `✅ CÁCH LY RLS NOTIFICATIONS + AVATARS ĐẠT.` (exit 0).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0014_notifications.sql supabase/migrations/0015_storage_avatars.sql scripts/test-rls-notifications.mjs
git commit -m "feat(db): notifications + RLS + bucket avatars (public, cach ly ghi) + test (GD8)"
```

---

### Task 2: Validators cài đặt + nhãn thông báo + test

**Files:**
- Create: `lib/validators/settings.ts`, `lib/validators/settings.test.ts`
- Create: `lib/validators/notification.ts`

**Interfaces:**
- Produces: `profileSchema`/`ProfileInput`; `settingsSchema`/`SettingsInput`; `CURRENCIES`, `TIMEZONES`, `DATE_FORMATS`; `NOTIFICATION_TYPE_LABEL`.

- [ ] **Step 1: Viết test (fail trước)** `lib/validators/settings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { settingsSchema, profileSchema } from './settings'

describe('settings validators', () => {
  it('profile chấp nhận rỗng', () => {
    expect(profileSchema.safeParse({}).success).toBe(true)
  })
  it('settings hợp lệ', () => {
    expect(settingsSchema.safeParse({
      currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', dateFormat: 'dd/MM/yyyy',
      defaultSessionDurationMin: 90, notifySessionReminder: true, notifyPaymentDue: false,
    }).success).toBe(true)
  })
  it('settings từ chối thời lượng ngoài biên', () => {
    expect(settingsSchema.safeParse({
      currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', dateFormat: 'dd/MM/yyyy',
      defaultSessionDurationMin: 5, notifySessionReminder: true, notifyPaymentDue: true,
    }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy — FAIL**

Run: `npm test -- settings`
Expected: FAIL (`Cannot find module './settings'`).

- [ ] **Step 3: Viết `lib/validators/settings.ts`**
```ts
import { z } from 'zod'

export const CURRENCIES = ['VND'] as const
export const TIMEZONES = ['Asia/Ho_Chi_Minh'] as const
export const DATE_FORMATS = ['dd/MM/yyyy', 'yyyy-MM-dd'] as const

export const profileSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
})

export const settingsSchema = z.object({
  currency: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
  dateFormat: z.string().trim().min(1),
  defaultSessionDurationMin: z.coerce.number().int('Phải là số nguyên').min(15, 'Tối thiểu 15 phút').max(600, 'Tối đa 600 phút'),
  notifySessionReminder: z.boolean(),
  notifyPaymentDue: z.boolean(),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
```

- [ ] **Step 4: Viết `lib/validators/notification.ts`**
```ts
export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  session_reminder: 'Nhắc buổi học',
  payment_due: 'Nhắc thanh toán',
  system: 'Hệ thống',
}
```

- [ ] **Step 5: Chạy — PASS**

Run: `npm test -- settings`
Expected: PASS (3 test).

- [ ] **Step 6: Commit**
```bash
git add lib/validators/settings.ts lib/validators/settings.test.ts lib/validators/notification.ts
git commit -m "feat(settings): validators ho so/tuy chon + nhan thong bao (GD8)"
```

---

### Task 3: Server cài đặt (hồ sơ + tùy chọn + avatar)

**Files:**
- Create: `server/settings/queries.ts`, `server/settings/actions.ts`

**Interfaces:**
- Consumes: `createServerSupabase`, `getSessionContext`/`isReadOnly` (`@/lib/auth`), `profileSchema`/`settingsSchema`.
- Produces: `getSettings()`; actions `updateProfile`, `updateSettings`, `uploadAvatar` (state `{error?,ok?}`).

- [ ] **Step 1: Viết `server/settings/queries.ts`**
```ts
import { createServerSupabase } from '@/lib/supabase/server'

export type SettingsData = {
  email: string | null
  profile: { full_name: string | null; phone: string | null; avatar_url: string | null } | null
  settings: {
    currency: string; timezone: string; date_format: string; default_session_duration_min: number
    notify_session_reminder: boolean; notify_payment_due: boolean
  } | null
  subscription: { status: string; trial_ends_at: string | null; expires_at: string | null; billing_cycle: string | null } | null
}

/** Hồ sơ + tùy chọn + gói của USER hiện tại. */
export async function getSettings(): Promise<SettingsData | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: settings }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('user_settings').select('currency, timezone, date_format, default_session_duration_min, notify_session_reminder, notify_payment_due').eq('user_id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('status, trial_ends_at, expires_at, billing_cycle').eq('user_id', user.id).maybeSingle(),
  ])
  return {
    email: user.email ?? null,
    profile: (profile as SettingsData['profile']) ?? null,
    settings: (settings as SettingsData['settings']) ?? null,
    subscription: (subscription as SettingsData['subscription']) ?? null,
  }
}
```

- [ ] **Step 2: Viết `server/settings/actions.ts`**
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { profileSchema, settingsSchema } from '@/lib/validators/settings'

export type SettingsActionState = { error?: string; ok?: boolean } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  return null
}

/** Cập nhật hồ sơ — CHỈ full_name/phone (whitelist; không đụng role/is_locked/avatar). */
export async function updateProfile(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const parsed = profileSchema.safeParse({
    fullName: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: (d.fullName ?? '').trim() || null, phone: (d.phone ?? '').trim() || null })
    .eq('id', user.id)
  if (error) return { error: 'Không lưu được hồ sơ.' }
  revalidatePath('/cai-dat')
  return { ok: true }
}

/** Cập nhật tùy chọn user_settings. */
export async function updateSettings(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const parsed = settingsSchema.safeParse({
    currency: String(formData.get('currency') ?? 'VND'),
    timezone: String(formData.get('timezone') ?? 'Asia/Ho_Chi_Minh'),
    dateFormat: String(formData.get('dateFormat') ?? 'dd/MM/yyyy'),
    defaultSessionDurationMin: String(formData.get('defaultSessionDurationMin') ?? '90'),
    notifySessionReminder: formData.get('notifySessionReminder') === 'on',
    notifyPaymentDue: formData.get('notifyPaymentDue') === 'on',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const { error } = await supabase
    .from('user_settings')
    .update({
      currency: d.currency,
      timezone: d.timezone,
      date_format: d.dateFormat,
      default_session_duration_min: d.defaultSessionDurationMin,
      notify_session_reminder: d.notifySessionReminder,
      notify_payment_due: d.notifyPaymentDue,
    })
    .eq('user_id', user.id)
  if (error) return { error: 'Không lưu được tùy chọn.' }
  revalidatePath('/cai-dat')
  return { ok: true }
}

const AVATAR_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Upload ảnh đại diện → avatars/{uid}/avatar.<ext> → set profiles.avatar_url. */
export async function uploadAvatar(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) return { error: 'Chưa chọn ảnh.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Ảnh vượt quá 2MB.' }
  const ext = AVATAR_TYPES[file.type]
  if (!ext) return { error: 'Chỉ nhận ảnh JPEG/PNG/WebP.' }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const path = `${user.id}/avatar.${ext}`
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true })
  if (upErr) return { error: 'Không tải được ảnh: ' + upErr.message }
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
  if (error) return { error: 'Không lưu được ảnh đại diện.' }
  revalidatePath('/cai-dat')
  return { ok: true }
}
```

- [ ] **Step 3: `npx tsc --noEmit`** → 0 lỗi.
- [ ] **Step 4: Commit**
```bash
git add server/settings/queries.ts server/settings/actions.ts
git commit -m "feat(settings): server ho so/tuy chon + upload avatar (GD8)"
```

---

### Task 4: Server thông báo (list/mark/generate)

**Files:**
- Create: `server/notifications/queries.ts`, `server/notifications/actions.ts`

**Interfaces:**
- Consumes: `createServerSupabase`, `upcomingSessions` (`@/server/reports/queries`), `listUpcomingDue` (`@/server/finance/ledger`), `formatVND`/`formatDate`/`formatDateTime` (`@/lib/format`).
- Produces: `listNotifications({page?})`, `unreadCount()`; actions `markRead(formData)`, `markAllRead()`, `deleteNotification(formData)`, `generateReminders()` (state `{error?,ok?,created?}`).

- [ ] **Step 1: Viết `server/notifications/queries.ts`**
```ts
import { createServerSupabase } from '@/lib/supabase/server'

export const NOTIFICATIONS_PAGE_SIZE = 30

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

/** Danh sách thông báo (mới nhất trước), phân trang. */
export async function listNotifications(params: { page?: number } = {}): Promise<{
  rows: NotificationRow[]; total: number; page: number; pageSize: number
}> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * NOTIFICATIONS_PAGE_SIZE
  const to = from + NOTIFICATIONS_PAGE_SIZE - 1
  const supabase = await createServerSupabase()
  const { data, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  return { rows: (data ?? []) as NotificationRow[], total: count ?? 0, page, pageSize: NOTIFICATIONS_PAGE_SIZE }
}

/** Số thông báo chưa đọc. */
export async function unreadCount(): Promise<number> {
  const supabase = await createServerSupabase()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  return count ?? 0
}
```

- [ ] **Step 2: Viết `server/notifications/actions.ts`**
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { upcomingSessions } from '@/server/reports/queries'
import { listUpcomingDue } from '@/server/finance/ledger'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'

export type NotificationActionState = { error?: string; ok?: boolean; created?: number } | null

async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Đánh dấu 1 thông báo đã đọc. */
export async function markRead(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createServerSupabase()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  revalidatePath('/thong-bao')
}

/** Đánh dấu tất cả đã đọc. */
export async function markAllRead(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
  revalidatePath('/thong-bao')
}

/** Xóa 1 thông báo. */
export async function deleteNotification(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createServerSupabase()
  await supabase.from('notifications').delete().eq('id', id)
  revalidatePath('/thong-bao')
}

/** Sinh nhắc nhở từ buổi sắp tới + khoản quá hạn (dedup theo type+entity_id, gate prefs). */
export async function generateReminders(): Promise<NotificationActionState> {
  const uid = await currentUserId()
  if (!uid) return { error: 'Chưa đăng nhập.' }
  const supabase = await createServerSupabase()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_session_reminder, notify_payment_due')
    .eq('user_id', uid)
    .maybeSingle()

  const candidates: {
    type: 'session_reminder' | 'payment_due'
    title: string; body: string; entity_type: string; entity_id: string
  }[] = []

  if (settings?.notify_session_reminder ?? true) {
    const sessions = await upcomingSessions()
    for (const s of sessions) {
      candidates.push({
        type: 'session_reminder',
        title: `Buổi sắp tới: ${s.student_name ?? '—'}`,
        body: formatDateTime(s.start_time),
        entity_type: 'session',
        entity_id: s.id,
      })
    }
  }
  if (settings?.notify_payment_due ?? true) {
    const { overdue } = await listUpcomingDue()
    for (const d of overdue) {
      candidates.push({
        type: 'payment_due',
        title: `Quá hạn ${d.kind === 'receivable' ? 'thu' : 'trả'}: ${d.name ?? '—'}`,
        body: `${formatVND(d.remaining)} · hạn ${formatDate(d.due_date)}`,
        entity_type: d.kind === 'receivable' ? 'invoice' : 'payable',
        entity_id: d.id,
      })
    }
  }

  if (candidates.length === 0) return { ok: true, created: 0 }

  // Dedup theo (type, entity_id) đã tồn tại
  const { data: existing } = await supabase
    .from('notifications')
    .select('type, entity_id')
    .in('entity_id', candidates.map((c) => c.entity_id))
  const seen = new Set((existing ?? []).map((e) => `${e.type}:${e.entity_id}`))
  const toInsert = candidates.filter((c) => !seen.has(`${c.type}:${c.entity_id}`))
  if (toInsert.length === 0) return { ok: true, created: 0 }

  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('notifications').insert(toInsert)
  if (error) return { error: 'Không tạo được nhắc nhở.' }
  revalidatePath('/thong-bao')
  return { ok: true, created: toInsert.length }
}
```

- [ ] **Step 3: `npx tsc --noEmit`** → 0 lỗi.
- [ ] **Step 4: Commit**
```bash
git add server/notifications/queries.ts server/notifications/actions.ts
git commit -m "feat(notifications): server list/mark/generate reminders (dedup, gate prefs) (GD8)"
```

---

### Task 5: UI trang Cài đặt `/cai-dat` + upload avatar

**Files:**
- Create: `app/(app)/cai-dat/page.tsx`
- Create: `components/settings/profile-form.tsx`, `components/settings/settings-form.tsx`, `components/settings/avatar-upload.tsx`

**Interfaces:**
- Consumes: `getSettings` (Task 3), `updateProfile`/`updateSettings`/`uploadAvatar` (Task 3), `formatDate`/`formatVND`, `TIMEZONES`/`DATE_FORMATS`/`CURRENCIES`.

- [ ] **Step 1: `components/settings/avatar-upload.tsx`** (client)
```tsx
'use client'

import { useActionState } from 'react'
import { uploadAvatar, type SettingsActionState } from '@/server/settings/actions'
import { Button } from '@/components/ui/button'

export default function AvatarUpload({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(uploadAvatar, null)
  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="%23e5e7eb"/></svg>'}
        alt="Ảnh đại diện"
        className="size-16 rounded-full border border-border object-cover"
      />
      <div className="space-y-2">
        <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" required
          className="block text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm" />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? 'Đang tải…' : 'Cập nhật ảnh'}</Button>
        {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
        {state?.ok && <p className="text-xs text-primary">Đã cập nhật ảnh.</p>}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: `components/settings/profile-form.tsx`** (client)
```tsx
'use client'

import { useActionState } from 'react'
import { updateProfile, type SettingsActionState } from '@/server/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ProfileForm({ fullName, phone, email }: { fullName: string | null; phone: string | null; email: string | null }) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(updateProfile, null)
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Đã lưu hồ sơ.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">Tên hiển thị</label>
          <Input id="fullName" name="fullName" defaultValue={fullName ?? ''} placeholder="vd: Cô Lan" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">Số điện thoại</label>
          <Input id="phone" name="phone" defaultValue={phone ?? ''} placeholder="vd: 0901234567" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input value={email ?? ''} disabled readOnly />
        </div>
      </div>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">{pending ? 'Đang lưu…' : 'Lưu hồ sơ'}</Button>
    </form>
  )
}
```

- [ ] **Step 3: `components/settings/settings-form.tsx`** (client)
```tsx
'use client'

import { useActionState } from 'react'
import { updateSettings, type SettingsActionState } from '@/server/settings/actions'
import { CURRENCIES, TIMEZONES, DATE_FORMATS } from '@/lib/validators/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type S = { currency: string; timezone: string; date_format: string; default_session_duration_min: number; notify_session_reminder: boolean; notify_payment_due: boolean }

export default function SettingsForm({ s }: { s: S }) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(updateSettings, null)
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Đã lưu tùy chọn.</p>}
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Bản này hiển thị cố định theo Việt Nam (VND · dd/MM/yyyy · giờ Hồ Chí Minh). Tùy chọn được lưu cho các bản sau.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="currency" className="text-sm font-medium text-foreground">Tiền tệ</label>
          <select id="currency" name="currency" defaultValue={s.currency} className={selectClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-medium text-foreground">Múi giờ</label>
          <select id="timezone" name="timezone" defaultValue={s.timezone} className={selectClass}>
            {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dateFormat" className="text-sm font-medium text-foreground">Định dạng ngày</label>
          <select id="dateFormat" name="dateFormat" defaultValue={s.date_format} className={selectClass}>
            {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dur" className="text-sm font-medium text-foreground">Thời lượng buổi mặc định (phút)</label>
          <Input id="dur" name="defaultSessionDurationMin" inputMode="numeric" defaultValue={String(s.default_session_duration_min)} />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Nhắc nhở</legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="notifySessionReminder" defaultChecked={s.notify_session_reminder} className="size-4" /> Nhắc buổi học sắp tới
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="notifyPaymentDue" defaultChecked={s.notify_payment_due} className="size-4" /> Nhắc hạn thanh toán
        </label>
      </fieldset>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">{pending ? 'Đang lưu…' : 'Lưu tùy chọn'}</Button>
    </form>
  )
}
```

- [ ] **Step 4: `app/(app)/cai-dat/page.tsx`**
```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSettings } from '@/server/settings/queries'
import { formatDate } from '@/lib/format'
import ProfileForm from '@/components/settings/profile-form'
import SettingsForm from '@/components/settings/settings-form'
import AvatarUpload from '@/components/settings/avatar-upload'

export const metadata: Metadata = { title: 'Cài đặt — EduFlow' }

const SUB_STATUS: Record<string, string> = {
  trialing: 'Đang dùng thử', active: 'Đang hoạt động', past_due: 'Quá hạn thanh toán', expired: 'Đã hết hạn', cancelled: 'Đã hủy',
}

export default async function CaiDatPage() {
  const data = await getSettings()
  if (!data) notFound()
  const s = data.settings ?? {
    currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', date_format: 'dd/MM/yyyy',
    default_session_duration_min: 90, notify_session_reminder: true, notify_payment_due: true,
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cài đặt</h1>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-lg font-medium text-foreground">Hồ sơ</h2>
        <AvatarUpload current={data.profile?.avatar_url ?? null} />
        <ProfileForm fullName={data.profile?.full_name ?? null} phone={data.profile?.phone ?? null} email={data.email} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Tùy chọn</h2>
        <SettingsForm s={s} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-medium text-foreground">Gói thuê bao</h2>
        {data.subscription ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="inline text-muted-foreground">Trạng thái: </dt><dd className="inline text-foreground">{SUB_STATUS[data.subscription.status] ?? data.subscription.status}</dd></div>
            {data.subscription.trial_ends_at && <div><dt className="inline text-muted-foreground">Dùng thử đến: </dt><dd className="inline text-foreground">{formatDate(data.subscription.trial_ends_at)}</dd></div>}
            {data.subscription.expires_at && <div><dt className="inline text-muted-foreground">Hết hạn: </dt><dd className="inline text-foreground">{formatDate(data.subscription.expires_at)}</dd></div>}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có thông tin gói.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Kích hoạt/gia hạn do quản trị viên xử lý.</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: `npx tsc --noEmit && npm run build`** → route `/cai-dat`.
- [ ] **Step 6: Commit**
```bash
git add "app/(app)/cai-dat" components/settings
git commit -m "feat(settings): trang /cai-dat (ho so + avatar + tuy chon + goi) (GD8)"
```

---

### Task 6: UI Thông báo `/thong-bao` + chuông & Cài đặt ở header

**Files:**
- Create: `app/(app)/thong-bao/page.tsx`
- Modify: `app/(app)/layout.tsx` (thêm chuông + link Cài đặt)

**Interfaces:**
- Consumes: `listNotifications`/`unreadCount` (Task 4), `markRead`/`markAllRead`/`deleteNotification`/`generateReminders` (Task 4), `NOTIFICATION_TYPE_LABEL`, `formatDateTime`.

- [ ] **Step 1: `app/(app)/thong-bao/page.tsx`**
```tsx
import type { Metadata } from 'next'
import { listNotifications } from '@/server/notifications/queries'
import { markRead, markAllRead, deleteNotification, generateReminders } from '@/server/notifications/actions'
import { NOTIFICATION_TYPE_LABEL } from '@/lib/validators/notification'
import { formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Thông báo — EduFlow' }

type SearchParams = { page?: string }

export default async function ThongBaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows, total, pageSize } = await listNotifications({ page })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Thông báo</h1>
        <div className="flex gap-2">
          <form action={generateReminders}><Button type="submit" variant="outline">Tạo nhắc nhở</Button></form>
          <form action={markAllRead}><Button type="submit" variant="ghost">Đọc hết</Button></form>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có thông báo. Bấm "Tạo nhắc nhở" để tổng hợp buổi sắp tới &amp; khoản quá hạn.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${n.is_read ? '' : 'bg-secondary/40'}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="inline-block size-2 shrink-0 rounded-full bg-primary" />}
                  <span className="font-medium text-foreground">{n.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">{NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}</span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!n.is_read && (
                  <form action={markRead}><input type="hidden" name="id" value={n.id} /><Button type="submit" variant="ghost" className="h-8 px-2 text-xs">Đã đọc</Button></form>
                )}
                <form action={deleteNotification}><input type="hidden" name="id" value={n.id} /><Button type="submit" variant="ghost" className="h-8 px-2 text-xs text-destructive">Xóa</Button></form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <Link href={`/thong-bao?page=${page - 1}`} className={buttonVariants({ variant: 'outline' })}>← Trước</Link> : <Button variant="outline" disabled>← Trước</Button>}
            {page < totalPages ? <Link href={`/thong-bao?page=${page + 1}`} className={buttonVariants({ variant: 'outline' })}>Sau →</Link> : <Button variant="outline" disabled>Sau →</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Sửa `app/(app)/layout.tsx`** — thêm chuông (unreadCount) + link Cài đặt vào cụm phải header.

Thêm import ở đầu file:
```tsx
import { Bell, Settings } from 'lucide-react'
import { unreadCount } from '@/server/notifications/queries'
```
Trong hàm, sau `const readOnly = isReadOnly(ctx)` thêm:
```tsx
  const unread = await unreadCount()
```
Thay cụm phải (giữa `<ThemeToggle />` và form Đăng xuất, chèn 2 link trước `<ThemeToggle />`):
```tsx
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{ctx.user.email}</span>
            <Link href="/thong-bao" aria-label="Thông báo" className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground">
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-medium text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link href="/cai-dat" aria-label="Cài đặt" className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
              <Settings className="size-5" />
            </Link>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button variant="outline" size="sm">Đăng xuất</Button>
            </form>
          </div>
```

- [ ] **Step 3: `npx tsc --noEmit && npm run build`** → route `/thong-bao`; header có chuông + Cài đặt.
- [ ] **Step 4: Commit**
```bash
git add "app/(app)/thong-bao" "app/(app)/layout.tsx"
git commit -m "feat(notifications): trang /thong-bao + chuong & Cai dat o header (GD8)"
```

---

### Task 7: Đóng giai đoạn — kiểm thử + tài liệu + merge

**Files:** Modify `docs/IMPLEMENTATION_STATUS.md`, `CLAUDE.md §2`

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run lint && npm run build` → test PASS (54 + **settings 3** = 57); build có `/cai-dat` + `/thong-bao`.
- [ ] **Step 2:** Chạy lại toàn bộ test cách ly RLS (không hồi quy):
```bash
node --env-file=.env.local scripts/test-rls-notifications.mjs
node --env-file=.env.local scripts/test-rls-report-views.mjs
node --env-file=.env.local scripts/test-rls-payables.mjs
node --env-file=.env.local scripts/test-rls-finance.mjs
```
Expected: tất cả `✅ … ĐẠT.`.
- [ ] **Step 3:** Đối chiếu tay: bấm "Tạo nhắc nhở" 2 lần → lần 2 không nhân đôi (created=0); đánh dấu đã đọc đổi trạng thái. (Kiểm bằng dữ liệu USER thật hoặc quan sát trên trang.)
- [ ] **Step 4:** Cập nhật `docs/IMPLEMENTATION_STATUS.md` (GĐ8 xong, kế tiếp GĐ9; thêm hàng §1, mục chi tiết, migration `0014`/`0015`, lệnh test, §5 57 test).
- [ ] **Step 5:** Cập nhật `CLAUDE.md §2` (GĐ8 xong → GĐ9).
- [ ] **Step 6:** Commit `docs(gd8): dong GD8 - cai dat & thong bao dat DoD`.
- [ ] **Step 7:** Merge `feat/gd8-cai-dat` → `main` (theo `superpowers:finishing-a-development-branch`).

---

## Self-Review

**1. Spec coverage:**
- §3 notifications (0014) + avatars bucket (0015) → Task 1 ✓
- §4 server settings (getSettings/updateProfile whitelist/updateSettings/uploadAvatar) → Task 3; server notifications (list/unread/mark/markAll/delete/generate) → Task 4 ✓
- §5 UI cài đặt (hồ sơ+avatar+tùy chọn+gói) → Task 5; thông báo + chuông header + Cài đặt → Task 6 ✓
- §6 test RLS notifications + avatars → Task 1; generate dedup + mark → Task 4 (logic) + Task 7 Step 3 (đối chiếu) ✓
- §7 ghi chú bảo mật (RLS cột profiles) → whitelist cột ở Task 3; ghi nhận GĐ9/10 ✓
- §8 DoD → Task 7 ✓

**2. Placeholder scan:** Không "TBD/TODO"; mọi bước có code thật.

**3. Type consistency:**
- `SettingsActionState` (Task 3) dùng ở 3 form Task 5; `NotificationActionState` (Task 4) — `generateReminders` trả `{ok,created}`.
- `getSettings()` trả `{email, profile{full_name,phone,avatar_url}, settings{...}, subscription{...}}` — Task 5 dùng đúng field.
- `NotificationRow` (Task 4) khớp Task 6.
- `upcomingSessions()` (GĐ7) trả `{id, student_name, start_time,...}`; `listUpcomingDue()` (GĐ6) trả `{overdue:[{kind,id,name,remaining,due_date}]}` — Task 4 dùng đúng.

**Đã xác minh trước bàn giao:**
- `profiles` có `full_name/phone/avatar_url`; `user_settings` có `currency/timezone/date_format/default_session_duration_min/notify_session_reminder/notify_payment_due` (migration 0001).
- Header `app/(app)/layout.tsx` là async Server Component (thêm `await unreadCount()` được); đã có link `/cai-dat` ở banner hết hạn.
- Storage upload pattern khớp `server/documents/storage.ts`; `getPublicUrl` cho bucket public.
- `Bell`/`Settings` là icon lucide-react hợp lệ (như `BarChart3` GĐ7).
- Migration kế tiếp `0014`/`0015` (0013 đã dùng).
