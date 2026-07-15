# Giai đoạn 7 — Báo cáo & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang **Báo cáo** (`/bao-cao`) + nâng cấp **Dashboard** (`/tong-quan`) với số liệu thu/chi/dòng tiền/công nợ từ 4 view `security_invoker`, biểu đồ dòng tiền vẽ bằng CSS/SVG — cách ly tuyệt đối theo `user_id`.

**Architecture:** 4 PostgreSQL view (`security_invoker=true`) kế thừa RLS của bảng cơ sở làm nguồn số liệu đọc-thôi; `server/reports/queries.ts` đọc view; UI Server Component render thẻ + bảng + biểu đồ (không thư viện chart). Tái dùng `listUpcomingDue()` (GĐ6) cho cảnh báo quá hạn.

**Tech Stack:** Next.js App Router (Server Components), TypeScript strict, Supabase (`@supabase/ssr`) + PostgreSQL view + RLS, Tailwind + shadcn/ui, script raw-fetch cho RLS. **Không thêm dependency.**

**Spec nguồn:** `docs/superpowers/specs/2026-07-15-7-bao-cao-dashboard-design.md` · **Views:** `docs/DATABASE.md §9`.

## Global Constraints

- **Ngôn ngữ UI:** tiếng Việt; `vi-VN`. Tiền `bigint` VND qua `formatVND`. Ngày `formatDate`/`formatDateTime` (`Asia/Ho_Chi_Minh`).
- **Views `security_invoker=true`** + `grant select ... to authenticated` — RLS bảng cơ sở áp theo người gọi; A **không** thấy số của B.
- **Gom tháng theo giờ VN:** `date_trunc('month', occurred_at at time zone 'Asia/Ho_Chi_Minh')`.
- Server đọc dùng `createServerSupabase()`; **không** nhận `user_id` từ client; read module **không** `'use server'`.
- Số migration kế tiếp: **`0013`**. Migration versioned trong `supabase/migrations/`.
- **Không thêm thư viện** (biểu đồ CSS/SVG). Responsive, mobile-first, LCP < 2.5s.
- TDD + commit thường xuyên. Test cách ly RLS view là **release blocker**.

---

### Task 1: Migration `0013_report_views.sql` — 4 view + grants + test RLS

**Files:**
- Create: `supabase/migrations/0013_report_views.sql`
- Create: `scripts/test-rls-report-views.mjs`

**Interfaces:**
- Produces: view `public.v_cashflow_monthly(user_id, month, total_income, total_expense, net_cashflow)`, `public.v_receivables_outstanding(user_id, student_id, student_name, outstanding)`, `public.v_payables_outstanding(user_id, outstanding)`, `public.v_upcoming_sessions(user_id, id, student_id, student_name, start_time, end_time, status)`.

- [ ] **Step 1: Viết migration**

Tạo `supabase/migrations/0013_report_views.sql`:

```sql
-- ============================================================
-- 0013 — Views báo cáo (security_invoker; gom tháng theo giờ VN)
-- Khớp docs/DATABASE.md §9 và specs/2026-07-15-7-bao-cao-dashboard-design.md
-- ============================================================

create view public.v_cashflow_monthly with (security_invoker = true) as
select
  user_id,
  date_trunc('month', (occurred_at at time zone 'Asia/Ho_Chi_Minh')) as month,
  coalesce(sum(amount) filter (where type = 'income'), 0)  as total_income,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as total_expense,
  coalesce(sum(amount) filter (where type = 'income'), 0)
    - coalesce(sum(amount) filter (where type = 'expense'), 0) as net_cashflow
from public.transactions
group by user_id, date_trunc('month', (occurred_at at time zone 'Asia/Ho_Chi_Minh'));

create view public.v_receivables_outstanding with (security_invoker = true) as
select i.user_id, i.student_id, s.full_name as student_name,
  sum(i.total_amount - i.amount_paid) as outstanding
from public.invoices i
join public.students s on s.id = i.student_id
where i.status not in ('paid','cancelled')
group by i.user_id, i.student_id, s.full_name;

create view public.v_payables_outstanding with (security_invoker = true) as
select user_id, sum(total_amount - amount_paid) as outstanding
from public.payables
where status not in ('paid','cancelled')
group by user_id;

create view public.v_upcoming_sessions with (security_invoker = true) as
select se.user_id, se.id, se.student_id, st.full_name as student_name,
  se.start_time, se.end_time, se.status
from public.sessions se
join public.students st on st.id = se.student_id
where se.status = 'scheduled'
  and se.start_time >= now()
  and se.start_time < now() + interval '7 days';

grant select on
  public.v_cashflow_monthly,
  public.v_receivables_outstanding,
  public.v_payables_outstanding,
  public.v_upcoming_sessions
to authenticated;
```

- [ ] **Step 2: Áp migration**

Run: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0013_report_views.sql`
Expected: `✅ Đã áp thành công: ...`.

- [ ] **Step 3: Viết `scripts/test-rls-report-views.mjs`**

```js
// Kiểm thử cách ly RLS cho 4 view báo cáo (security_invoker).
// Chạy (SAU khi áp 0013): node --env-file=.env.local scripts/test-rls-report-views.mjs

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
  const email = `eduflow.rep.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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
const count = async (t, view) =>
  (await (await fetch(`${url}/rest/v1/${view}?select=user_id`, { headers: head(t) })).json())

const VIEWS = ['v_cashflow_monthly', 'v_receivables_outstanding', 'v_payables_outstanding', 'v_upcoming_sessions']

let A, B, C
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // A tạo dữ liệu chạm cả 4 view
  const st = (await (await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ full_name: 'HS báo cáo', default_fee: 300000 }),
  })).json())[0]
  if (!st?.id) { bad(`Tạo học sinh lỗi: ${JSON.stringify(st).slice(0, 150)}`); throw new Error('create') }

  await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ type: 'income', amount: 500000, student_id: st.id }),
  })
  await fetch(`${url}/rest/v1/invoices`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ student_id: st.id, title: 'HP', subtotal: 500000, total_amount: 500000 }),
  })
  await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ creditor_name: 'Chủ nhà', total_amount: 200000 }),
  })
  const start = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const end = new Date(Date.now() + 25 * 3600 * 1000).toISOString()
  await fetch(`${url}/rest/v1/sessions`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ student_id: st.id, status: 'scheduled', start_time: start, end_time: end }),
  })
  ok('A đã tạo dữ liệu (transaction/invoice/payable/session)')

  // A thấy dữ liệu qua cả 4 view
  for (const v of VIEWS) {
    const rows = await count(aT, v)
    Array.isArray(rows) && rows.length >= 1 ? ok(`A thấy ${v} (${rows.length} dòng)`) : bad(`A KHÔNG thấy ${v}: ${JSON.stringify(rows).slice(0, 120)}`)
  }

  // B & admin KHÔNG thấy dòng nào qua bất kỳ view nào
  for (const [label, t] of [['B', bT], ['ADMIN', cT]]) {
    for (const v of VIEWS) {
      const rows = await count(t, v)
      Array.isArray(rows) && rows.length === 0 ? ok(`${label} KHÔNG thấy ${v} của A`) : bad(`RÒ RỈ: ${label} thấy ${v} của A! ${JSON.stringify(rows).slice(0, 120)}`)
    }
  }
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS VIEW BÁO CÁO ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
```

- [ ] **Step 4: Chạy test RLS view**

Run: `node --env-file=.env.local scripts/test-rls-report-views.mjs`
Expected: `✅ CÁCH LY RLS VIEW BÁO CÁO ĐẠT.` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0013_report_views.sql scripts/test-rls-report-views.mjs
git commit -m "feat(db): 4 view bao cao (security_invoker, gom thang gio VN) + RLS test (GD7)"
```

---

### Task 2: Server `server/reports/queries.ts` + helper tháng + unit test

**Files:**
- Create: `lib/reports.ts` (helper thuần, testable)
- Create: `lib/reports.test.ts`
- Create: `server/reports/queries.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (`@/lib/supabase/server`).
- Produces:
  - `lib/reports.ts`: `vnYearMonth(d: Date): string` ('YYYY-MM' theo giờ VN); `lastNMonths(n: number, endYM: string): string[]`; `monthLabel(ym: string): string` ('MM/YY'); type `CashflowMonth`.
  - `server/reports/queries.ts`: `cashflowMonthly(n?: number)`, `cashflowRange(fromYM, toYM)`, `reportSummary(fromYM, toYM)`, `receivablesOutstanding()`, `payablesOutstanding()`, `upcomingSessions()`, `dashboardStats()`.

- [ ] **Step 1: Viết test helper (fail trước)**

`lib/reports.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { lastNMonths, monthLabel } from './reports'

describe('reports helper', () => {
  it('lastNMonths trả n tháng liên tục kết thúc endYM', () => {
    expect(lastNMonths(3, '2026-01')).toEqual(['2025-11', '2025-12', '2026-01'])
  })
  it('lastNMonths qua năm', () => {
    expect(lastNMonths(2, '2026-02')).toEqual(['2026-01', '2026-02'])
  })
  it('monthLabel định dạng MM/YY', () => {
    expect(monthLabel('2026-07')).toBe('07/26')
  })
})
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

Run: `npm test -- reports`
Expected: FAIL (`Cannot find module './reports'`).

- [ ] **Step 3: Viết `lib/reports.ts`**

```ts
export type CashflowMonth = {
  ym: string // 'YYYY-MM'
  total_income: number
  total_expense: number
  net_cashflow: number
}

/** 'YYYY-MM' của một Date theo giờ Asia/Ho_Chi_Minh. */
export function vnYearMonth(d: Date): string {
  const s = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d) // 'YYYY-MM-DD'
  return s.slice(0, 7)
}

/** Mảng n tháng liên tục ('YYYY-MM') kết thúc tại endYM (bao gồm). */
export function lastNMonths(n: number, endYM: string): string[] {
  const [ey, em] = endYM.split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    let y = ey
    let m = em - i
    while (m <= 0) {
      m += 12
      y -= 1
    }
    out.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return out
}

/** 'YYYY-MM' → 'MM/YY'. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${m}/${y.slice(2)}`
}
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run: `npm test -- reports`
Expected: PASS (3 test).

- [ ] **Step 5: Viết `server/reports/queries.ts`**

```ts
import { createServerSupabase } from '@/lib/supabase/server'
import { vnYearMonth, lastNMonths, type CashflowMonth } from '@/lib/reports'

/** Đọc v_cashflow_monthly → map theo 'YYYY-MM'. */
async function cashflowMap(): Promise<Map<string, CashflowMonth>> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('v_cashflow_monthly')
    .select('month, total_income, total_expense, net_cashflow')
  const map = new Map<string, CashflowMonth>()
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const ym = String(r.month).slice(0, 7) // 'YYYY-MM' (month là timestamp giờ VN)
    map.set(ym, {
      ym,
      total_income: (r.total_income as number) ?? 0,
      total_expense: (r.total_expense as number) ?? 0,
      net_cashflow: (r.net_cashflow as number) ?? 0,
    })
  }
  return map
}

const zero = (ym: string): CashflowMonth => ({ ym, total_income: 0, total_expense: 0, net_cashflow: 0 })

/** N tháng gần nhất (liên tục, điền 0), kết thúc tháng hiện tại (giờ VN). */
export async function cashflowMonthly(n = 6): Promise<CashflowMonth[]> {
  const map = await cashflowMap()
  const end = vnYearMonth(new Date())
  return lastNMonths(n, end).map((ym) => map.get(ym) ?? zero(ym))
}

/** Các tháng trong [fromYM, toYM] (liên tục, điền 0). */
export async function cashflowRange(fromYM: string, toYM: string): Promise<CashflowMonth[]> {
  const map = await cashflowMap()
  // số tháng giữa from..to
  const [fy, fm] = fromYM.split('-').map(Number)
  const [ty, tm] = toYM.split('-').map(Number)
  const n = (ty - fy) * 12 + (tm - fm) + 1
  if (n <= 0) return []
  return lastNMonths(n, toYM).map((ym) => map.get(ym) ?? zero(ym))
}

/** Tổng thu/chi/lợi nhuận/ròng trong kỳ. */
export async function reportSummary(fromYM: string, toYM: string): Promise<{
  income: number; expense: number; profit: number; net: number
}> {
  const rows = await cashflowRange(fromYM, toYM)
  const income = rows.reduce((s, r) => s + r.total_income, 0)
  const expense = rows.reduce((s, r) => s + r.total_expense, 0)
  return { income, expense, profit: income - expense, net: income - expense }
}

export type ReceivableRow = { student_id: string; student_name: string | null; outstanding: number }

/** Công nợ phải thu theo học sinh + tổng (v_receivables_outstanding). */
export async function receivablesOutstanding(): Promise<{ rows: ReceivableRow[]; total: number }> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('v_receivables_outstanding')
    .select('student_id, student_name, outstanding')
    .order('outstanding', { ascending: false })
  const rows = (data ?? []).map((r) => ({
    student_id: r.student_id as string,
    student_name: (r.student_name as string | null) ?? null,
    outstanding: (r.outstanding as number) ?? 0,
  }))
  return { rows, total: rows.reduce((s, r) => s + r.outstanding, 0) }
}

/** Tổng công nợ phải trả (v_payables_outstanding). */
export async function payablesOutstanding(): Promise<number> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('v_payables_outstanding').select('outstanding')
  return (data ?? []).reduce((s, r) => s + ((r.outstanding as number) ?? 0), 0)
}

export type UpcomingSession = {
  id: string; student_id: string; student_name: string | null; start_time: string; end_time: string
}

/** Buổi sắp tới (7 ngày, v_upcoming_sessions), sắp theo giờ tăng. */
export async function upcomingSessions(): Promise<UpcomingSession[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('v_upcoming_sessions')
    .select('id, student_id, student_name, start_time, end_time')
    .order('start_time', { ascending: true })
  return (data ?? []) as UpcomingSession[]
}

/** Chỉ số nhanh cho dashboard. */
export async function dashboardStats(): Promise<{
  activeStudents: number
  upcomingCount: number
  receivableTotal: number
  monthIncome: number
  monthExpense: number
}> {
  const supabase = await createServerSupabase()
  const nowYm = vnYearMonth(new Date())
  const [studentsRes, upcoming, receivable, cashflow] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).is('archived_at', null),
    upcomingSessions(),
    receivablesOutstanding(),
    cashflowMonthly(1),
  ])
  const cur = cashflow.find((c) => c.ym === nowYm)
  return {
    activeStudents: studentsRes.count ?? 0,
    upcomingCount: upcoming.length,
    receivableTotal: receivable.total,
    monthIncome: cur?.total_income ?? 0,
    monthExpense: cur?.total_expense ?? 0,
  }
}
```

- [ ] **Step 6: Kiểm tra biên dịch**

Run: `npx tsc --noEmit`
Expected: 0 lỗi.

- [ ] **Step 7: Commit**

```bash
git add lib/reports.ts lib/reports.test.ts server/reports/queries.ts
git commit -m "feat(reports): helper thang + server queries doc view bao cao (GD7)"
```

---

### Task 3: Biểu đồ CSS/SVG + Trang Báo cáo `/bao-cao`

**Files:**
- Create: `components/reports/cashflow-chart.tsx`
- Create: `app/(app)/bao-cao/page.tsx`

**Interfaces:**
- Consumes: `cashflowRange`/`reportSummary`/`receivablesOutstanding`/`payablesOutstanding` (Task 2), `listUpcomingDue` (`@/server/finance/ledger`, GĐ6), `monthLabel` (`@/lib/reports`), `formatVND`/`formatDate`.
- Produces: `CashflowChart` component (nhận `data: CashflowMonth[]`).

- [ ] **Step 1: Viết `components/reports/cashflow-chart.tsx`**

Biểu đồ cột kép (thu/chi) bằng div, chiều cao tỉ lệ theo `max`; ròng hiển thị số dưới mỗi tháng; không cần `'use client'` (render thuần).
```tsx
import { monthLabel, type CashflowMonth } from '@/lib/reports'
import { formatVND } from '@/lib/format'

export function CashflowChart({ data }: { data: CashflowMonth[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.total_income, d.total_expense)))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-success" /> Thu</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-destructive" /> Chi</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-end gap-4 sm:gap-6" style={{ height: 180 }}>
          {data.map((d) => (
            <div key={d.ym} className="flex h-full flex-col items-center justify-end gap-1">
              <div className="flex h-full items-end gap-1">
                <div
                  className="w-4 rounded-t bg-success sm:w-6"
                  style={{ height: `${(d.total_income / max) * 100}%` }}
                  title={`Thu ${monthLabel(d.ym)}: ${formatVND(d.total_income)}`}
                />
                <div
                  className="w-4 rounded-t bg-destructive sm:w-6"
                  style={{ height: `${(d.total_expense / max) * 100}%` }}
                  title={`Chi ${monthLabel(d.ym)}: ${formatVND(d.total_expense)}`}
                />
              </div>
              <span className="text-[0.7rem] text-muted-foreground">{monthLabel(d.ym)}</span>
              <span className={`text-[0.7rem] font-medium ${d.net_cashflow >= 0 ? 'text-success' : 'text-destructive'}`}>
                {d.net_cashflow >= 0 ? '+' : '−'}{formatVND(Math.abs(d.net_cashflow))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Viết `app/(app)/bao-cao/page.tsx`**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { cashflowRange, reportSummary, receivablesOutstanding, payablesOutstanding } from '@/server/reports/queries'
import { listUpcomingDue } from '@/server/finance/ledger'
import { vnYearMonth } from '@/lib/reports'
import { formatVND, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { CashflowChart } from '@/components/reports/cashflow-chart'

export const metadata: Metadata = { title: 'Báo cáo — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { from?: string; to?: string }

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'income' | 'expense' | 'net' }) {
  const color = tone === 'income' ? 'text-success' : tone === 'expense' ? 'text-destructive' : 'text-foreground'
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

/** 'YYYY-MM' lùi k tháng. */
function shiftYM(ym: string, k: number): string {
  const [y, m] = ym.split('-').map(Number)
  let yy = y
  let mm = m - k
  while (mm <= 0) { mm += 12; yy -= 1 }
  while (mm > 12) { mm -= 12; yy += 1 }
  return `${yy}-${String(mm).padStart(2, '0')}`
}

export default async function BaoCaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const nowYm = vnYearMonth(new Date())
  const toYM = sp.to && /^\d{4}-\d{2}$/.test(sp.to) ? sp.to : nowYm
  const fromYM = sp.from && /^\d{4}-\d{2}$/.test(sp.from) ? sp.from : shiftYM(toYM, 5)

  const [rows, summary, receivable, payableTotal, due] = await Promise.all([
    cashflowRange(fromYM, toYM),
    reportSummary(fromYM, toYM),
    receivablesOutstanding(),
    payablesOutstanding(),
    listUpcomingDue(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Báo cáo</h1>

      {/* Chọn kỳ */}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm text-muted-foreground">Từ tháng
          <input type="month" name="from" defaultValue={fromYM} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-sm text-muted-foreground">Đến tháng
          <input type="month" name="to" defaultValue={toYM} className={`${inputClass} mt-1 block`} />
        </label>
        <Button type="submit" variant="outline">Xem</Button>
      </form>

      {/* Thẻ tổng */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng thu" value={formatVND(summary.income)} tone="income" />
        <StatCard label="Tổng chi" value={formatVND(summary.expense)} tone="expense" />
        <StatCard label="Lợi nhuận" value={formatVND(summary.profit)} tone="net" />
        <StatCard label="Dòng tiền ròng" value={formatVND(summary.net)} tone="net" />
      </div>

      {/* Biểu đồ */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-medium text-foreground">Dòng tiền theo tháng</h2>
        <CashflowChart data={rows} />
      </section>

      {/* Công nợ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Phải thu</h2>
            <span className="text-sm font-medium text-foreground">{formatVND(receivable.total)}</span>
          </div>
          {receivable.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không còn công nợ phải thu.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {receivable.rows.map((r) => (
                <li key={r.student_id} className="flex justify-between py-2">
                  <Link href={`/tai-chinh/phai-thu?student=${r.student_id}`} className="text-foreground hover:underline">{r.student_name ?? '—'}</Link>
                  <span className="font-medium text-foreground">{formatVND(r.outstanding)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Phải trả</h2>
            <span className="text-sm font-medium text-foreground">{formatVND(payableTotal)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Chi tiết ở <Link href="/tai-chinh/phai-tra" className="text-primary hover:underline">Phải trả</Link>.</p>
        </section>
      </div>

      {/* Quá hạn */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-destructive">Quá hạn ({due.overdue.length})</h2>
        {due.overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có khoản quá hạn.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
            {due.overdue.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between px-4 py-3">
                <span>
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${r.kind === 'receivable' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                    {r.kind === 'receivable' ? 'Thu' : 'Trả'}
                  </span>
                  <Link href={r.kind === 'receivable' ? `/tai-chinh/phai-thu/${r.id}` : `/tai-chinh/phai-tra/${r.id}`} className="text-foreground hover:underline">{r.name ?? '—'}</Link>
                </span>
                <span className="text-right">
                  <span className="font-medium text-foreground">{formatVND(r.remaining)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">Hạn {formatDate(r.due_date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Kiểm tra build**

Run: `npx tsc --noEmit && npm run build`
Expected: build thành công, route `/bao-cao`.

- [ ] **Step 4: Commit**

```bash
git add components/reports/cashflow-chart.tsx "app/(app)/bao-cao"
git commit -m "feat(reports): trang bao cao + bieu do dong tien CSS/SVG (GD7)"
```

---

### Task 4: Nâng cấp Dashboard `/tong-quan` + nav "Báo cáo"

**Files:**
- Modify: `app/(app)/tong-quan/page.tsx` (thay 2 thẻ placeholder + thêm buổi sắp tới/cảnh báo/biểu đồ)
- Modify: `components/app-nav.tsx` (thêm mục "Báo cáo")

**Interfaces:**
- Consumes: `dashboardStats`/`upcomingSessions`/`cashflowMonthly` (Task 2), `listUpcomingDue` (GĐ6), `CashflowChart` (Task 3), `getSessionContext` (`@/lib/auth`), `formatVND`/`formatDateTime`.

- [ ] **Step 1: Thay nội dung `app/(app)/tong-quan/page.tsx`**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { getSessionContext } from '@/lib/auth'
import { dashboardStats, upcomingSessions, cashflowMonthly } from '@/server/reports/queries'
import { listUpcomingDue } from '@/server/finance/ledger'
import { formatDate, formatVND, formatDateTime } from '@/lib/format'
import { CashflowChart } from '@/components/reports/cashflow-chart'

export const metadata: Metadata = { title: 'Tổng quan — EduFlow' }

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Đang dùng thử',
  active: 'Đang hoạt động',
  past_due: 'Quá hạn thanh toán',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export default async function TongQuanPage() {
  const ctx = await getSessionContext()
  const name = ctx?.profile?.full_name
  const sub = ctx?.subscription

  const [stats, upcoming, due, cashflow] = await Promise.all([
    dashboardStats(),
    upcomingSessions(),
    listUpcomingDue(),
    cashflowMonthly(6),
  ])

  const subValue = sub ? (STATUS_LABEL[sub.status] ?? sub.status) : '—'
  const subHint =
    sub?.status === 'trialing' && sub.trial_ends_at
      ? `Dùng thử đến ${formatDate(sub.trial_ends_at)}`
      : sub?.expires_at
        ? `Hết hạn ${formatDate(sub.expires_at)}`
        : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Xin chào{name ? `, ${name}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Đây là bảng điều khiển của bạn.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Học sinh đang học" value={String(stats.activeStudents)} />
        <StatCard label="Buổi sắp tới (7 ngày)" value={String(stats.upcomingCount)} />
        <StatCard label="Học phí cần thu" value={formatVND(stats.receivableTotal)} />
        <StatCard label="Dòng tiền tháng này" value={formatVND(stats.monthIncome - stats.monthExpense)} hint={`Thu ${formatVND(stats.monthIncome)} · Chi ${formatVND(stats.monthExpense)}`} />
      </div>

      {due.overdue.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-destructive">Quá hạn ({due.overdue.length})</h2>
            <Link href="/bao-cao" className="text-sm text-primary hover:underline">Xem báo cáo →</Link>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {due.overdue.slice(0, 5).map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex justify-between">
                <Link href={r.kind === 'receivable' ? `/tai-chinh/phai-thu/${r.id}` : `/tai-chinh/phai-tra/${r.id}`} className="text-foreground hover:underline">
                  {r.kind === 'receivable' ? 'Thu' : 'Trả'} · {r.name ?? '—'}
                </Link>
                <span className="text-muted-foreground">{formatVND(r.remaining)} · {formatDate(r.due_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Buổi sắp tới</h2>
            <Link href="/lich-day" className="text-sm text-primary hover:underline">Lịch dạy →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có buổi nào trong 7 ngày tới.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {upcoming.slice(0, 6).map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span className="text-foreground">{s.student_name ?? '—'}</span>
                  <span className="text-muted-foreground">{formatDateTime(s.start_time)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Dòng tiền 6 tháng</h2>
            <Link href="/bao-cao" className="text-sm text-primary hover:underline">Báo cáo →</Link>
          </div>
          <CashflowChart data={cashflow} />
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Thuê bao" value={subValue} hint={subHint} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Thêm mục nav "Báo cáo" vào `components/app-nav.tsx`**

Sửa dòng import icon + mảng `NAV_ITEMS`:
```tsx
import { LayoutDashboard, Users, BookOpen, FileText, CalendarDays, Wallet, BarChart3 } from 'lucide-react'
```
```tsx
const NAV_ITEMS = [
  { href: '/tong-quan', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/hoc-sinh', label: 'Học sinh', icon: Users },
  { href: '/bai-hoc', label: 'Bài học', icon: BookOpen },
  { href: '/tai-lieu', label: 'Tài liệu', icon: FileText },
  { href: '/lich-day', label: 'Lịch dạy', icon: CalendarDays },
  { href: '/tai-chinh/phai-thu', label: 'Tài chính', icon: Wallet },
  { href: '/bao-cao', label: 'Báo cáo', icon: BarChart3 },
]
```

- [ ] **Step 3: Kiểm tra build**

Run: `npx tsc --noEmit && npm run build`
Expected: build thành công; `/tong-quan` + `/bao-cao` render; nav 7 mục.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/tong-quan/page.tsx" components/app-nav.tsx
git commit -m "feat(dashboard): tong quan chi so that + buoi sap toi + canh bao + bieu do; nav Bao cao (GD7)"
```

---

### Task 5: Đóng giai đoạn — kiểm thử toàn diện + đối chiếu + tài liệu

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`, `CLAUDE.md §2`

- [ ] **Step 1: Kiểm thử tự động toàn bộ**

Run: `npx tsc --noEmit && npm test && npm run lint && npm run build`
Expected: `tsc` 0 lỗi; test PASS (51 + **3 reports** = 54); lint 0 error; build xanh (route `/bao-cao`).

- [ ] **Step 2: Chạy lại toàn bộ test cách ly RLS (không hồi quy)**

Run:
```bash
node --env-file=.env.local scripts/test-rls-report-views.mjs
node --env-file=.env.local scripts/test-rls-payables.mjs
node --env-file=.env.local scripts/test-rls-finance.mjs
node --env-file=.env.local scripts/test-invoice-flow.mjs
node --env-file=.env.local scripts/test-payable-flow.mjs
```
Expected: tất cả in `✅ … ĐẠT.` (exit 0).

- [ ] **Step 3: Đối chiếu số liệu (DoD)**

Bằng một USER thật có dữ liệu (hoặc tạo dữ liệu mẫu 1 tháng): mở `/bao-cao`, đối chiếu **Tổng thu / Tổng chi** trong kỳ khớp tổng `transactions` tính tay của tháng đó; **Phải thu** khớp `SUM(total_amount-amount_paid)` invoices chưa paid/cancelled. Ghi lại kết quả đối chiếu vào commit message hoặc STATUS.

- [ ] **Step 4: Cập nhật `docs/IMPLEMENTATION_STATUS.md`**

Giai đoạn hiện tại → "GĐ7 đã hoàn tất; kế tiếp GĐ8 — Cài đặt & Thông báo"; thêm hàng §1 cho GĐ7; thêm §6 migration `0013_report_views.sql`; thêm §7 lệnh `test-rls-report-views.mjs`; cập nhật §5 (54 test, view RLS PASS); thêm mục chi tiết GĐ7.

- [ ] **Step 5: Cập nhật `CLAUDE.md §2`** phản ánh GĐ7 xong → GĐ8.

- [ ] **Step 6: Commit**

```bash
git add docs/IMPLEMENTATION_STATUS.md CLAUDE.md
git commit -m "docs(gd7): dong GD7 - bao cao & dashboard dat DoD"
```

- [ ] **Step 7: Merge vào `main`** (theo `superpowers:finishing-a-development-branch`)

---

## Self-Review

**1. Spec coverage** (đối chiếu `2026-07-15-7-bao-cao-dashboard-design.md`):
- §3 4 views + grants + VN-tz → Task 1 ✓
- §4 server queries (cashflow/receivables/payables/upcoming/dashboardStats/reportSummary) → Task 2 ✓
- §5 chart CSS/SVG → Task 3; `/bao-cao` → Task 3; `/tong-quan` nâng cấp → Task 4; nav "Báo cáo" → Task 4 ✓
- §6 test RLS view → Task 1; đối chiếu số liệu → Task 5 Step 3; đóng GĐ → Task 5 ✓
- §7 DoD → Task 5 Step 1–3 ✓

**2. Placeholder scan:** Không "TBD/TODO"; mọi bước có code thật. Task 4 dashboard tái dùng `StatCard` (định nghĩa nội bộ, giống bản gốc) + `CashflowChart` (Task 3).

**3. Type consistency:**
- `CashflowMonth` (`lib/reports.ts`) dùng ở `cashflowMonthly`/`cashflowRange` (Task 2) và `CashflowChart` (Task 3) — cùng `{ym, total_income, total_expense, net_cashflow}`.
- `ReceivableRow`/`UpcomingSession` (Task 2) khớp tiêu thụ ở Task 3/4.
- `dashboardStats()` trả `{activeStudents, upcomingCount, receivableTotal, monthIncome, monthExpense}` — Task 4 dùng đúng field.
- `listUpcomingDue()` trả `{overdue, upcoming}` với `DueRow{kind,id,name,remaining,due_date}` (GĐ6) — Task 3/4 dùng đúng.

**Đã xác minh trước bàn giao:**
- Cột `sessions` (`start_time/end_time/status/student_id`) khớp `0008_sessions.sql`.
- "Học sinh đang học" = `students.archived_at IS NULL` (khớp `listStudents`).
- `formatVND`/`formatDate`/`formatDateTime` có trong `lib/format.ts`; token `bg-success`/`bg-destructive` có trong theme (dùng ở `Button` success/destructive).
- Migration kế tiếp `0013` (0010–0012 đã dùng).
- **Cần kiểm khi chạy:** quyền `grant select ... to authenticated` đủ để PostgREST đọc view (nếu 401/permission → kiểm cấu hình role Supabase).
