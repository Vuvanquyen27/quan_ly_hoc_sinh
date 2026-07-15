# Giai đoạn 6 — Tài chính: Phải trả & Sổ thu/chi · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quản lý khoản **phải trả** (USER nợ người khác), ghi **thu/chi tự do** theo danh mục, và màn hình **hạn thanh toán** (gộp phải thu + phải trả) + **lịch sử thanh toán** — cách ly tuyệt đối theo `user_id` + RLS.

**Architecture:** Thêm bảng `payables` (accrual) + trigger `recalc_payable_paid()` cập nhật `amount_paid`/`status` từ `transactions(type='expense', payable_id)` — gương hệt trigger hóa đơn GĐ5. Dùng lại bảng `transactions` (GĐ5) cho dòng tiền chi & thu/chi tự do; dùng lại `categories` (đã có schema/RLS từ GĐ5) và thêm UI CRUD. Điều hướng khu Tài chính bằng **sub-nav tabs** dùng chung (`app/(app)/tai-chinh/layout.tsx`).

**Tech Stack:** Next.js App Router (Server Components + Server Actions), TypeScript strict, Supabase (`@supabase/ssr`) + PostgreSQL + RLS, Zod validators, Vitest (unit), script raw-fetch (`node --env-file`) cho RLS/nghiệp vụ, Tailwind + shadcn/ui.

**Spec nguồn:** `docs/superpowers/specs/2026-07-15-6-phai-tra-thu-chi-design.md` · **Schema:** `docs/DATABASE.md §5.4`.

## Global Constraints

- **Ngôn ngữ UI:** tiếng Việt; định dạng `vi-VN`. Tiền: `bigint` VND (số nguyên đồng), hiển thị qua `formatVND` → `1.500.000 ₫`.
- **Thời gian:** lưu `timestamptz` UTC; hiển thị `Asia/Ho_Chi_Minh` qua `formatDate`/`formatDateTime`; `datetime-local` → UTC bằng `vnLocalToUtc`. Ngày (`due_date`) là `date` thuần (`YYYY-MM-DD`).
- **`user_id uuid NOT NULL default auth.uid()`** trên mọi bảng khách; **RLS bật**, 4 policy thuần `auth.uid() = user_id` — **không** nhánh `is_admin`. Server **không bao giờ** nhận `user_id` từ client.
- Mọi Server Action gate `requireWritable` (chặn khi chế độ chỉ đọc/khóa).
- **Không** đưa `SUPABASE_SERVICE_ROLE_KEY` vào client/`NEXT_PUBLIC_*`.
- Số migration kế tiếp: **`0012`** (0009=attendance, 0010/0011=finance GĐ5). Migration versioned trong `supabase/migrations/`.
- Xóa mềm cho tài chính (payable hủy = `status='cancelled'`; category = `is_archived=true`). Chỉ dòng `transactions` **tự do** (không gắn invoice/payable) mới cho xóa cứng.
- **Quá hạn** dẫn xuất khi hiển thị (`due_date < today` & status ∉ {paid,cancelled}) — không lưu trạng thái `overdue`.
- TDD + commit thường xuyên. Test cách ly RLS cho bảng mới là **release blocker**.

---

### Task 1: Migration `0012_payables.sql` — bảng `payables` + FK + trigger + RLS

**Files:**
- Create: `supabase/migrations/0012_payables.sql`
- Create: `scripts/test-rls-payables.mjs`

**Interfaces:**
- Produces: bảng `public.payables` (cột `id,user_id,creditor_name,category_id,title,total_amount,amount_paid,status,due_date,note,created_at,updated_at`); enum `public.payable_status`; FK `transactions.payable_id → payables(id)`; hàm `public.recalc_payable_paid()` + trigger `trg_transactions_recalc_payable`.

- [ ] **Step 1: Viết migration**

Tạo `supabase/migrations/0012_payables.sql`:

```sql
-- ============================================================
-- 0012 — Tài chính phải trả: payables + FK transactions.payable_id + trigger + RLS
-- Khớp docs/DATABASE.md §5.4 và specs/2026-07-15-6-phai-tra-thu-chi-design.md
-- ============================================================

create type public.payable_status as enum ('unpaid','partial','paid','cancelled');

-- payables (khoản phải trả — accrual)
create table public.payables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creditor_name text,
  category_id uuid references public.categories(id) on delete set null,
  title text,
  total_amount bigint not null default 0 check (total_amount >= 0),
  amount_paid bigint not null default 0,
  status public.payable_status not null default 'unpaid',
  due_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payables_user_status on public.payables (user_id, status);
create index idx_payables_user_due    on public.payables (user_id, due_date);

-- FK transactions.payable_id (GĐ5 để cột trơn) + index còn thiếu
alter table public.transactions
  add constraint transactions_payable_id_fkey
  foreign key (payable_id) references public.payables(id) on delete set null;
create index idx_transactions_user_payable on public.transactions (user_id, payable_id);

-- updated_at trigger
create trigger trg_payables_updated before update on public.payables
  for each row execute function public.set_updated_at();

-- Trigger: cập nhật payables.amount_paid + status khi transactions(expense) đổi
create or replace function public.recalc_payable_paid()
returns trigger
language plpgsql
as $$
declare
  pay_id uuid;
  paid bigint;
  tot bigint;
  cur_status public.payable_status;
begin
  pay_id := coalesce(new.payable_id, old.payable_id);
  if pay_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into paid
    from public.transactions
    where payable_id = pay_id and type = 'expense';

  select total_amount, status into tot, cur_status
    from public.payables where id = pay_id;

  if cur_status = 'cancelled' then
    update public.payables set amount_paid = paid where id = pay_id;
    return coalesce(new, old);
  end if;

  update public.payables
    set amount_paid = paid,
        status = case
          when tot > 0 and paid >= tot then 'paid'::public.payable_status
          when paid > 0 then 'partial'::public.payable_status
          else 'unpaid'::public.payable_status
        end
    where id = pay_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_transactions_recalc_payable
  after insert or update or delete on public.transactions
  for each row execute function public.recalc_payable_paid();

-- RLS 4 policy (thuần auth.uid() = user_id)
alter table public.payables enable row level security;
create policy payables_select on public.payables for select using (auth.uid() = user_id);
create policy payables_insert on public.payables for insert with check (auth.uid() = user_id);
create policy payables_update on public.payables for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy payables_delete on public.payables for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Áp migration lên DB**

Run: `node --env-file=.env.local scripts/run-migration.mjs 0012_payables.sql`
Expected: in ra thành công, không lỗi (cần `SUPABASE_DB_URL` trong `.env.local`).

- [ ] **Step 3: Viết script test cách ly RLS `payables`**

Tạo `scripts/test-rls-payables.mjs` (gương `scripts/test-rls-finance.mjs`):

```js
// Kiểm thử cách ly RLS cho payables (+ đường chi transactions.payable_id).
// Chạy (SAU khi áp 0012): node --env-file=.env.local scripts/test-rls-payables.mjs

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
  const email = `eduflow.pay.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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

let A, B, C
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token đăng nhập'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // A tạo payable → transaction expense gắn payable
  const payRes = await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ creditor_name: 'Chủ nhà', title: 'Thuê phòng', total_amount: 500000 }),
  })
  const pay = await payRes.json()
  if (payRes.ok && pay[0]?.id) ok('A tạo khoản phải trả thành công')
  else { bad(`A tạo payable lỗi: ${JSON.stringify(pay).slice(0, 150)}`); throw new Error('create') }

  const txRes = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ type: 'expense', amount: 200000, payable_id: pay[0].id }),
  })
  const tx = await txRes.json()
  txRes.ok && tx[0]?.id ? ok('A ghi giao dịch chi (trả nợ) thành công') : bad(`A ghi chi lỗi: ${JSON.stringify(tx).slice(0, 150)}`)

  // A đọc payable của mình
  const aPay = await (await fetch(`${url}/rest/v1/payables?select=id`, { headers: head(aT) })).json()
  aPay.length === 1 ? ok('A đọc được payable của mình') : bad(`A thấy ${aPay.length} payable (mong 1)`)

  // B không đọc payable của A
  const bPay = await (await fetch(`${url}/rest/v1/payables?select=id`, { headers: head(bT) })).json()
  Array.isArray(bPay) && bPay.length === 0 ? ok('B KHÔNG đọc được payable của A') : bad('B thấy payable của A!')

  // B giả mạo user_id = A khi insert payable → bị chặn
  const forge = await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: head(bT),
    body: JSON.stringify({ user_id: A.id, creditor_name: 'gian lan', total_amount: 1 }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn được payable với user_id = A!') : ok(`B KHÔNG giả mạo user_id được (HTTP ${forge.status})`)

  // B không sửa/xóa payable của A
  const bUpd = await fetch(`${url}/rest/v1/payables?id=eq.${pay[0].id}`, {
    method: 'PATCH', headers: head(bT), body: JSON.stringify({ title: 'hacked' }),
  })
  const bUpdBody = await bUpd.json()
  Array.isArray(bUpdBody) && bUpdBody.length === 0 ? ok('B KHÔNG sửa được payable của A') : bad('B sửa được payable của A!')

  // ADMIN không đọc payable của USER
  const cPay = await (await fetch(`${url}/rest/v1/payables?select=id`, { headers: head(cT) })).json()
  Array.isArray(cPay) && cPay.length === 0 ? ok('ADMIN KHÔNG đọc được payable của USER') : bad('ADMIN đọc được payable!')
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS PAYABLES ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
```

- [ ] **Step 4: Chạy test RLS**

Run: `node --env-file=.env.local scripts/test-rls-payables.mjs`
Expected: `✅ CÁCH LY RLS PAYABLES ĐẠT.` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0012_payables.sql scripts/test-rls-payables.mjs
git commit -m "feat(db): payables + FK transactions.payable_id + trigger + RLS (GD6)"
```

---

### Task 2: Validators + unit test

**Files:**
- Create: `lib/validators/payable.ts`, `lib/validators/payable.test.ts`
- Create: `lib/validators/transaction.ts`, `lib/validators/transaction.test.ts`
- Create: `lib/validators/category.ts`, `lib/validators/category.test.ts`
- Modify: `lib/validators/payment.ts` (thêm `payablePaymentSchema`)

**Interfaces:**
- Produces: `payableSchema`/`PayableInput`, `PAYABLE_STATUSES`, `PAYABLE_STATUS_LABEL`; `transactionSchema`/`TransactionInput`; `categorySchema`/`CategoryInput`, `CATEGORY_KINDS`, `CATEGORY_KIND_LABEL`; `payablePaymentSchema`/`PayablePaymentInput`.
- Consumes: `PAYMENT_METHODS` từ `lib/validators/payment.ts`.

- [ ] **Step 1: Viết test validators (fail trước)**

`lib/validators/payable.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { payableSchema } from './payable'

describe('payable validator', () => {
  it('hợp lệ với total ≥ 0', () => {
    expect(payableSchema.safeParse({ creditorName: 'Chủ nhà', totalAmount: 500000 }).success).toBe(true)
  })
  it('từ chối total âm', () => {
    expect(payableSchema.safeParse({ totalAmount: -1 }).success).toBe(false)
  })
  it('từ chối total không nguyên', () => {
    expect(payableSchema.safeParse({ totalAmount: 1.5 }).success).toBe(false)
  })
})
```

`lib/validators/transaction.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { transactionSchema } from './transaction'

describe('transaction validator', () => {
  it('thu hợp lệ', () => {
    expect(transactionSchema.safeParse({ type: 'income', amount: 100000, method: 'cash' }).success).toBe(true)
  })
  it('từ chối amount 0', () => {
    expect(transactionSchema.safeParse({ type: 'expense', amount: 0, method: 'cash' }).success).toBe(false)
  })
  it('từ chối type lạ', () => {
    expect(transactionSchema.safeParse({ type: 'x', amount: 1, method: 'cash' }).success).toBe(false)
  })
})
```

`lib/validators/category.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { categorySchema } from './category'

describe('category validator', () => {
  it('hợp lệ', () => {
    expect(categorySchema.safeParse({ kind: 'expense', name: 'Thuê phòng' }).success).toBe(true)
  })
  it('từ chối tên trống', () => {
    expect(categorySchema.safeParse({ kind: 'income', name: '  ' }).success).toBe(false)
  })
  it('từ chối kind lạ', () => {
    expect(categorySchema.safeParse({ kind: 'x', name: 'A' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm test -- payable transaction category`
Expected: FAIL (module chưa tồn tại).

- [ ] **Step 3: Viết validators**

`lib/validators/payable.ts`:
```ts
import { z } from 'zod'

export const PAYABLE_STATUSES = ['unpaid', 'partial', 'paid', 'cancelled'] as const

export const PAYABLE_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Chưa trả',
  partial: 'Trả một phần',
  paid: 'Đã trả đủ',
  cancelled: 'Đã hủy',
}

export const payableSchema = z.object({
  creditorName: z.string().optional(),
  title: z.string().optional(),
  categoryId: z.string().optional(),
  totalAmount: z.coerce.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không được âm'),
  dueDate: z.string().optional(),
  note: z.string().optional(),
})

export type PayableInput = z.infer<typeof payableSchema>
```

`lib/validators/transaction.ts`:
```ts
import { z } from 'zod'
import { PAYMENT_METHODS } from './payment'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  categoryId: z.string().optional(),
  method: z.enum(PAYMENT_METHODS),
  occurredAt: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
```

`lib/validators/category.ts`:
```ts
import { z } from 'zod'

export const CATEGORY_KINDS = ['income', 'expense'] as const

export const CATEGORY_KIND_LABEL: Record<string, string> = {
  income: 'Thu',
  expense: 'Chi',
}

export const categorySchema = z.object({
  kind: z.enum(CATEGORY_KINDS),
  name: z.string().trim().min(1, 'Tên danh mục không được trống'),
})

export type CategoryInput = z.infer<typeof categorySchema>
```

- [ ] **Step 4: Thêm `payablePaymentSchema` vào `lib/validators/payment.ts`**

Nối vào cuối `lib/validators/payment.ts`:
```ts
export const payablePaymentSchema = z.object({
  payableId: z.string().trim().min(1, 'Thiếu khoản phải trả'),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  method: z.enum(PAYMENT_METHODS),
  occurredAt: z.string().optional(),
  reference: z.string().optional(),
})

export type PayablePaymentInput = z.infer<typeof payablePaymentSchema>
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npm test -- payable transaction category`
Expected: PASS (9 test).

- [ ] **Step 6: Commit**

```bash
git add lib/validators/payable.ts lib/validators/payable.test.ts lib/validators/transaction.ts lib/validators/transaction.test.ts lib/validators/category.ts lib/validators/category.test.ts lib/validators/payment.ts
git commit -m "feat(finance): validators payable/transaction/category + payable payment (GD6)"
```

---

### Task 3: Server phải trả — queries + actions

**Files:**
- Create: `server/finance/payables.ts` (read)
- Create: `server/finance/payables-actions.ts` (write, `'use server'`)

**Interfaces:**
- Consumes: `createServerSupabase` (`@/lib/supabase/server`), `getSessionContext`/`isReadOnly` (`@/lib/auth`), `vnLocalToUtc` (`@/lib/datetime`), `payableSchema`, `payablePaymentSchema`.
- Produces:
  - `PAYABLES_PAGE_SIZE = 20`; type `PayableRow`, `PayableTxRow`.
  - `listPayables({status?, page?}): {rows: PayableRow[]; total; page; pageSize}`.
  - `getPayable(id): {payable: PayableRow; transactions: PayableTxRow[]} | null`.
  - `payablesTotal(): number` (Σ còn nợ).
  - Actions `createPayable`, `updatePayable`, `cancelPayableAction`, `recordPayablePayment` với `FinancePayableActionState = {error?: string} | null`.

- [ ] **Step 1: Viết `server/finance/payables.ts` (read)**

```ts
import { createServerSupabase } from '@/lib/supabase/server'

export const PAYABLES_PAGE_SIZE = 20

export type PayableRow = {
  id: string
  creditor_name: string | null
  category_id: string | null
  category_name: string | null
  title: string | null
  total_amount: number
  amount_paid: number
  status: string
  due_date: string | null
  note: string | null
  created_at: string
}

export type PayableTxRow = {
  id: string
  amount: number
  occurred_at: string
  method: string
  reference: string | null
  note: string | null
}

function flatten(row: Record<string, unknown>): PayableRow {
  const cat = row.categories as { name?: string } | null
  const { categories: _c, ...rest } = row
  return { ...(rest as Omit<PayableRow, 'category_name'>), category_name: cat?.name ?? null }
}

/** Danh sách phải trả (RLS lọc theo user_id), mới nhất trước, phân trang. */
export async function listPayables(params: {
  status?: string
  page?: number
}): Promise<{ rows: PayableRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * PAYABLES_PAGE_SIZE
  const to = from + PAYABLES_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('payables')
    .select('*, categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (params.status) q = q.eq('status', params.status)

  const { data, count } = await q
  return {
    rows: (data ?? []).map((r) => flatten(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize: PAYABLES_PAGE_SIZE,
  }
}

/** Một khoản phải trả kèm lịch sử giao dịch chi (RLS của chính USER). */
export async function getPayable(id: string): Promise<{
  payable: PayableRow
  transactions: PayableTxRow[]
} | null> {
  const supabase = await createServerSupabase()
  const { data: pay } = await supabase
    .from('payables')
    .select('*, categories(name)')
    .eq('id', id)
    .maybeSingle()
  if (!pay) return null

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, amount, occurred_at, method, reference, note')
    .eq('payable_id', id)
    .order('occurred_at', { ascending: false })

  return {
    payable: flatten(pay as Record<string, unknown>),
    transactions: (transactions ?? []) as PayableTxRow[],
  }
}

/** Tổng công nợ phải trả còn lại (payables chưa paid/cancelled). */
export async function payablesTotal(): Promise<number> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('payables')
    .select('total_amount, amount_paid')
    .not('status', 'in', '("paid","cancelled")')
  return (data ?? []).reduce(
    (sum, r) => sum + (((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)),
    0,
  )
}
```

- [ ] **Step 2: Viết `server/finance/payables-actions.ts` (write)**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { payableSchema } from '@/lib/validators/payable'
import { payablePaymentSchema } from '@/lib/validators/payment'
import { vnLocalToUtc } from '@/lib/datetime'

export type FinancePayableActionState = { error?: string } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

function parsePayable(formData: FormData) {
  return payableSchema.safeParse({
    creditorName: String(formData.get('creditorName') ?? ''),
    title: String(formData.get('title') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    totalAmount: String(formData.get('totalAmount') ?? '0'),
    dueDate: String(formData.get('dueDate') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
}

/** Tạo khoản phải trả. */
export async function createPayable(
  _prev: FinancePayableActionState,
  formData: FormData,
): Promise<FinancePayableActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = parsePayable(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { data, error } = await supabase
    .from('payables')
    .insert({
      creditor_name: (d.creditorName ?? '').trim() || null,
      title: (d.title ?? '').trim() || null,
      category_id: d.categoryId || null,
      total_amount: d.totalAmount,
      due_date: d.dueDate || null,
      note: (d.note ?? '').trim() || null,
    })
    .select('id')
    .maybeSingle()
  if (error || !data) return { error: 'Không tạo được khoản phải trả.' }

  revalidatePath('/tai-chinh/phai-tra')
  redirect(`/tai-chinh/phai-tra/${data.id}`)
}

/** Cập nhật khoản phải trả (khi chưa hủy). */
export async function updatePayable(
  _prev: FinancePayableActionState,
  formData: FormData,
): Promise<FinancePayableActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Thiếu mã khoản phải trả.' }

  const parsed = parsePayable(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('payables')
    .update({
      creditor_name: (d.creditorName ?? '').trim() || null,
      title: (d.title ?? '').trim() || null,
      category_id: d.categoryId || null,
      total_amount: d.totalAmount,
      due_date: d.dueDate || null,
      note: (d.note ?? '').trim() || null,
    })
    .eq('id', id)
  if (error) return { error: 'Không cập nhật được khoản phải trả.' }

  revalidatePath('/tai-chinh/phai-tra')
  revalidatePath(`/tai-chinh/phai-tra/${id}`)
  redirect(`/tai-chinh/phai-tra/${id}`)
}

/** Hủy khoản phải trả (xóa mềm status='cancelled'). */
export async function cancelPayableAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('payables').update({ status: 'cancelled' }).eq('id', id)
  if (error) {
    console.error('cancelPayableAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/phai-tra')
  revalidatePath(`/tai-chinh/phai-tra/${id}`)
}

/** Ghi trả nợ → transactions(expense, payable_id) → trigger cập nhật payable. */
export async function recordPayablePayment(
  _prev: FinancePayableActionState,
  formData: FormData,
): Promise<FinancePayableActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = payablePaymentSchema.safeParse({
    payableId: String(formData.get('payableId') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    method: String(formData.get('method') ?? 'cash'),
    occurredAt: String(formData.get('occurredAt') ?? ''),
    reference: String(formData.get('reference') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { data: pay } = await supabase
    .from('payables')
    .select('status, category_id')
    .eq('id', d.payableId)
    .maybeSingle()
  if (!pay) return { error: 'Không tìm thấy khoản phải trả.' }
  if (pay.status === 'cancelled') return { error: 'Khoản đã hủy, không thể ghi trả.' }

  const row: {
    type: 'expense'
    amount: number
    payable_id: string
    category_id: string | null
    method: string
    reference: string | null
    occurred_at?: string
  } = {
    type: 'expense',
    amount: d.amount,
    payable_id: d.payableId,
    category_id: (pay.category_id as string | null) ?? null,
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
  }
  if (d.occurredAt) row.occurred_at = vnLocalToUtc(d.occurredAt)

  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('transactions').insert(row)
  if (error) return { error: 'Không ghi được khoản trả.' }

  revalidatePath(`/tai-chinh/phai-tra/${d.payableId}`)
  revalidatePath('/tai-chinh/phai-tra')
  redirect(`/tai-chinh/phai-tra/${d.payableId}`)
}
```

- [ ] **Step 3: Kiểm tra biên dịch**

Run: `npx tsc --noEmit`
Expected: 0 lỗi.

- [ ] **Step 4: Commit**

```bash
git add server/finance/payables.ts server/finance/payables-actions.ts
git commit -m "feat(finance): server phai tra (queries + actions + tra no) (GD6)"
```

---

### Task 4: Server sổ thu/chi (ledger) + danh mục

**Files:**
- Create: `server/finance/ledger.ts` (read)
- Create: `server/finance/ledger-actions.ts` (write, `'use server'`)
- Create: `server/finance/categories.ts` (read)
- Create: `server/finance/categories-actions.ts` (write, `'use server'`)

**Interfaces:**
- Consumes: như Task 3 + `transactionSchema` (`@/lib/validators/transaction`), `categorySchema` (`@/lib/validators/category`).
- Produces:
  - `listTransactions({type?, categoryId?, from?, to?, page?}): {rows: LedgerRow[]; total; page; pageSize}`; type `LedgerRow`; `TRANSACTIONS_PAGE_SIZE = 30`.
  - `listUpcomingDue(): {overdue: DueRow[]; upcoming: DueRow[]}`; type `DueRow`.
  - `listCategories({kind?, includeArchived?}): CategoryRow[]`; type `CategoryRow`.
  - Actions `createTransaction`, `deleteTransactionAction` (`FinanceLedgerActionState`); `createCategory`, `updateCategory`, `archiveCategoryAction` (`FinanceCategoryActionState`).

- [ ] **Step 1: Viết `server/finance/ledger.ts` (read)**

```ts
import { createServerSupabase } from '@/lib/supabase/server'
import { vnLocalToUtc } from '@/lib/datetime'

export const TRANSACTIONS_PAGE_SIZE = 30

export type LedgerRow = {
  id: string
  type: string
  amount: number
  occurred_at: string
  method: string
  reference: string | null
  note: string | null
  category_name: string | null
  source: 'invoice' | 'payable' | 'free'
  student_name: string | null
  creditor_name: string | null
}

export type DueRow = {
  kind: 'receivable' | 'payable'
  id: string
  name: string | null
  remaining: number
  due_date: string
}

function flattenTx(row: Record<string, unknown>): LedgerRow {
  const cat = row.categories as { name?: string } | null
  const inv = row.invoices as { students?: { full_name?: string } | null } | null
  const pay = row.payables as { creditor_name?: string } | null
  const source: LedgerRow['source'] = row.invoice_id ? 'invoice' : row.payable_id ? 'payable' : 'free'
  return {
    id: row.id as string,
    type: row.type as string,
    amount: (row.amount as number) ?? 0,
    occurred_at: row.occurred_at as string,
    method: row.method as string,
    reference: (row.reference as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    category_name: cat?.name ?? null,
    source,
    student_name: inv?.students?.full_name ?? null,
    creditor_name: pay?.creditor_name ?? null,
  }
}

/** Sổ thu/chi + lịch sử: transactions (thu & chi), enrich nhãn nguồn, phân trang. */
export async function listTransactions(params: {
  type?: string
  categoryId?: string
  from?: string // 'YYYY-MM-DD' (giờ VN)
  to?: string // 'YYYY-MM-DD' (giờ VN, bao gồm cả ngày)
  page?: number
}): Promise<{ rows: LedgerRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * TRANSACTIONS_PAGE_SIZE
  const to = from + TRANSACTIONS_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('transactions')
    .select('*, categories(name), invoices(students(full_name)), payables(creditor_name)', {
      count: 'exact',
    })
    .order('occurred_at', { ascending: false })
    .range(from, to)

  if (params.type) q = q.eq('type', params.type)
  if (params.categoryId) q = q.eq('category_id', params.categoryId)
  if (params.from) q = q.gte('occurred_at', vnLocalToUtc(`${params.from}T00:00`))
  if (params.to) q = q.lte('occurred_at', vnLocalToUtc(`${params.to}T23:59`))

  const { data, count } = await q
  return {
    rows: (data ?? []).map((r) => flattenTx(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize: TRANSACTIONS_PAGE_SIZE,
  }
}

/** Hạn thanh toán gộp: invoices (thu) + payables (trả) chưa paid/cancelled, có due_date. */
export async function listUpcomingDue(): Promise<{ overdue: DueRow[]; upcoming: DueRow[] }> {
  const supabase = await createServerSupabase()
  const [{ data: inv }, { data: pay }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, due_date, total_amount, amount_paid, students(full_name)')
      .not('status', 'in', '("paid","cancelled")')
      .not('due_date', 'is', null),
    supabase
      .from('payables')
      .select('id, due_date, total_amount, amount_paid, creditor_name')
      .not('status', 'in', '("paid","cancelled")')
      .not('due_date', 'is', null),
  ])

  const rows: DueRow[] = []
  for (const r of (inv ?? []) as Record<string, unknown>[]) {
    const remaining = ((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)
    if (remaining <= 0) continue
    const student = r.students as { full_name?: string } | null
    rows.push({ kind: 'receivable', id: r.id as string, name: student?.full_name ?? null, remaining, due_date: r.due_date as string })
  }
  for (const r of (pay ?? []) as Record<string, unknown>[]) {
    const remaining = ((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)
    if (remaining <= 0) continue
    rows.push({ kind: 'payable', id: r.id as string, name: (r.creditor_name as string | null) ?? null, remaining, due_date: r.due_date as string })
  }
  rows.sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0))

  const today = new Date().toISOString().slice(0, 10)
  return {
    overdue: rows.filter((r) => r.due_date < today),
    upcoming: rows.filter((r) => r.due_date >= today),
  }
}
```

- [ ] **Step 2: Viết `server/finance/categories.ts` (read)**

```ts
import { createServerSupabase } from '@/lib/supabase/server'

export type CategoryRow = {
  id: string
  kind: string
  name: string
  is_archived: boolean
}

/** Danh mục thu/chi (RLS lọc theo user_id). */
export async function listCategories(params?: {
  kind?: string
  includeArchived?: boolean
}): Promise<CategoryRow[]> {
  const supabase = await createServerSupabase()
  let q = supabase
    .from('categories')
    .select('id, kind, name, is_archived')
    .order('kind', { ascending: true })
    .order('name', { ascending: true })
  if (params?.kind) q = q.eq('kind', params.kind)
  if (!params?.includeArchived) q = q.eq('is_archived', false)

  const { data } = await q
  return (data ?? []) as CategoryRow[]
}
```

- [ ] **Step 3: Viết `server/finance/ledger-actions.ts` (write)**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { transactionSchema } from '@/lib/validators/transaction'
import { vnLocalToUtc } from '@/lib/datetime'

export type FinanceLedgerActionState = { error?: string; ok?: boolean } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Chưa đăng nhập.' }
  if (isReadOnly(ctx)) return { error: 'Tài khoản đang ở chế độ chỉ đọc.' }
  return null
}

/** Ghi thu/chi tự do (không gắn hóa đơn/khoản trả). */
export async function createTransaction(
  _prev: FinanceLedgerActionState,
  formData: FormData,
): Promise<FinanceLedgerActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = transactionSchema.safeParse({
    type: String(formData.get('type') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    categoryId: String(formData.get('categoryId') ?? ''),
    method: String(formData.get('method') ?? 'cash'),
    occurredAt: String(formData.get('occurredAt') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const row: Record<string, unknown> = {
    type: d.type,
    amount: d.amount,
    category_id: d.categoryId || null,
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
    note: (d.note ?? '').trim() || null,
  }
  if (d.occurredAt) row.occurred_at = vnLocalToUtc(d.occurredAt)

  const supabase = await createServerSupabase()
  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('transactions').insert(row)
  if (error) return { error: 'Không ghi được giao dịch.' }

  revalidatePath('/tai-chinh/thu-chi')
  revalidatePath('/tai-chinh/lich-su')
  return { ok: true }
}

/** Xóa giao dịch tự do (chỉ dòng chưa gắn hóa đơn/khoản trả). */
export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .is('invoice_id', null)
    .is('payable_id', null)
  if (error) {
    console.error('deleteTransactionAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/thu-chi')
  revalidatePath('/tai-chinh/lich-su')
}
```

- [ ] **Step 4: Viết `server/finance/categories-actions.ts` (write)**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { categorySchema } from '@/lib/validators/category'

export type FinanceCategoryActionState = { error?: string; ok?: boolean } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Chưa đăng nhập.' }
  if (isReadOnly(ctx)) return { error: 'Tài khoản đang ở chế độ chỉ đọc.' }
  return null
}

/** Tạo danh mục (kind income/expense). */
export async function createCategory(
  _prev: FinanceCategoryActionState,
  formData: FormData,
): Promise<FinanceCategoryActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = categorySchema.safeParse({
    kind: String(formData.get('kind') ?? ''),
    name: String(formData.get('name') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('categories')
    .insert({ kind: parsed.data.kind, name: parsed.data.name })
  if (error) {
    return { error: error.code === '23505' ? 'Danh mục đã tồn tại.' : 'Không tạo được danh mục.' }
  }
  revalidatePath('/tai-chinh/danh-muc')
  return { ok: true }
}

/** Đổi tên danh mục. */
export async function updateCategory(
  _prev: FinanceCategoryActionState,
  formData: FormData,
): Promise<FinanceCategoryActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Thiếu mã danh mục.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Tên danh mục không được trống.' }

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('categories').update({ name }).eq('id', id)
  if (error) {
    return { error: error.code === '23505' ? 'Danh mục đã tồn tại.' : 'Không cập nhật được danh mục.' }
  }
  revalidatePath('/tai-chinh/danh-muc')
  return { ok: true }
}

/** Lưu trữ (archive mềm) danh mục. */
export async function archiveCategoryAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('categories').update({ is_archived: true }).eq('id', id)
  if (error) {
    console.error('archiveCategoryAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/danh-muc')
}
```

- [ ] **Step 5: Kiểm tra biên dịch**

Run: `npx tsc --noEmit`
Expected: 0 lỗi.

- [ ] **Step 6: Commit**

```bash
git add server/finance/ledger.ts server/finance/ledger-actions.ts server/finance/categories.ts server/finance/categories-actions.ts
git commit -m "feat(finance): server so thu/chi + hang thanh toan + danh muc (GD6)"
```

---

### Task 5: Test nghiệp vụ phải trả (trigger `recalc_payable_paid`)

**Files:**
- Create: `scripts/test-payable-flow.mjs`

**Interfaces:**
- Consumes: bảng `payables` + trigger (Task 1). Chạy raw-fetch bằng USER token.

- [ ] **Step 1: Viết `scripts/test-payable-flow.mjs`**

```js
// Kiểm thử nghiệp vụ phải trả: trigger amount_paid/status khi trả dần.
// Chạy (SAU khi áp 0012): node --env-file=.env.local scripts/test-payable-flow.mjs

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

async function mkUser() {
  const email = `eduflow.payflow.usr.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
  const password = 'MatKhauTest123!'
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc, body: JSON.stringify({ email, password, email_confirm: true }),
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
const getPay = async (t, id) =>
  (await (await fetch(`${url}/rest/v1/payables?id=eq.${id}&select=amount_paid,status`, { headers: head(t) })).json())[0]

let A
try {
  A = await mkUser()
  if (!A.id) { bad('Không tạo được user'); throw new Error('setup') }
  const aT = await token(A)
  if (!aT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A và đăng nhập')

  // Tạo payable tổng 600.000
  const pay = (await (await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ creditor_name: 'Chủ nhà', title: 'Thuê phòng 07', total_amount: 600000 }),
  })).json())[0]
  if (!pay?.id) { bad(`Tạo payable lỗi: ${JSON.stringify(pay).slice(0, 150)}`); throw new Error('create') }
  pay.status === 'unpaid' ? ok("Payable khởi tạo 'unpaid'") : bad(`Sai status đầu: ${pay.status}`)

  // Trả một phần 200.000 → partial
  await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ type: 'expense', amount: 200000, payable_id: pay.id }),
  })
  let p = await getPay(aT, pay.id)
  p?.amount_paid === 200000 && p?.status === 'partial' ? ok('Trả 200.000 → amount_paid 200.000, partial') : bad(`Sai sau trả 1 phần: ${JSON.stringify(p)}`)

  // Trả nốt 400.000 → paid
  const tx2 = (await (await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ type: 'expense', amount: 400000, payable_id: pay.id }),
  })).json())[0]
  p = await getPay(aT, pay.id)
  p?.amount_paid === 600000 && p?.status === 'paid' ? ok('Trả đủ → amount_paid 600.000, paid') : bad(`Sai sau trả đủ: ${JSON.stringify(p)}`)

  // Xóa giao dịch thứ 2 → về partial
  await fetch(`${url}/rest/v1/transactions?id=eq.${tx2.id}`, { method: 'DELETE', headers: head(aT) })
  p = await getPay(aT, pay.id)
  p?.amount_paid === 200000 && p?.status === 'partial' ? ok('Xóa giao dịch → amount_paid 200.000, partial') : bad(`Sai sau xóa: ${JSON.stringify(p)}`)

  // CHECK ràng buộc: income không được gắn payable_id
  const badTx = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ type: 'income', amount: 1000, payable_id: pay.id }),
  })
  !badTx.ok ? ok('CHECK chặn income gắn payable_id') : bad('LỖ HỔNG: income gắn được payable_id!')
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  if (A?.id) await del(A.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ NGHIỆP VỤ PHẢI TRẢ ĐẠT.' : '\n❌ CÓ LỖI NGHIỆP VỤ.')
process.exit(pass ? 0 : 1)
```

- [ ] **Step 2: Chạy test nghiệp vụ**

Run: `node --env-file=.env.local scripts/test-payable-flow.mjs`
Expected: `✅ NGHIỆP VỤ PHẢI TRẢ ĐẠT.` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add scripts/test-payable-flow.mjs
git commit -m "test(finance): nghiep vu phai tra + trigger recalc_payable_paid (GD6)"
```

---

### Task 6: Layout sub-nav Tài chính + UI Phải trả

**Files:**
- Create: `app/(app)/tai-chinh/layout.tsx`
- Create: `app/(app)/tai-chinh/phai-tra/page.tsx` (danh sách)
- Create: `app/(app)/tai-chinh/phai-tra/moi/page.tsx` (tạo)
- Create: `app/(app)/tai-chinh/phai-tra/[id]/page.tsx` (chi tiết + trả)
- Create: `components/finance/payable-form.tsx` (form tạo/sửa)
- Create: `components/finance/payable-payment-form.tsx` (form ghi trả)

**Interfaces:**
- Consumes: `listPayables`/`getPayable`/`payablesTotal` (Task 3), `createPayable`/`updatePayable`/`cancelPayableAction`/`recordPayablePayment` (Task 3), `listCategories` (Task 4), `PAYABLE_STATUS_LABEL`/`PAYABLE_STATUSES`, `formatVND`/`formatDate`, `PAYMENT_METHODS`.

- [ ] **Step 1: Viết `app/(app)/tai-chinh/layout.tsx` (sub-nav tabs)**

```tsx
import { FinanceTabs } from '@/components/finance/finance-tabs'

export default function TaiChinhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <FinanceTabs />
      {children}
    </div>
  )
}
```

Và `components/finance/finance-tabs.tsx` (client, đánh dấu active):
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/tai-chinh/phai-thu', label: 'Phải thu' },
  { href: '/tai-chinh/phai-tra', label: 'Phải trả' },
  { href: '/tai-chinh/thu-chi', label: 'Thu/chi' },
  { href: '/tai-chinh/han-thanh-toan', label: 'Hạn thanh toán' },
  { href: '/tai-chinh/lich-su', label: 'Lịch sử' },
  { href: '/tai-chinh/danh-muc', label: 'Danh mục' },
]

export function FinanceTabs() {
  const pathname = usePathname()
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-border">
        {TABS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Viết `components/finance/payable-form.tsx`**

Form dùng chung tạo/sửa (chọn danh mục expense từ `listCategories`). Truyền `categories`, `defaultValues?`, `action` (create/update), `payableId?`.
```tsx
'use client'

import { useActionState } from 'react'
import { createPayable, updatePayable, type FinancePayableActionState } from '@/server/finance/payables-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

type Cat = { id: string; name: string }
type Defaults = {
  creditorName?: string | null
  title?: string | null
  categoryId?: string | null
  totalAmount?: number
  dueDate?: string | null
  note?: string | null
}

export default function PayableForm({
  categories,
  payableId,
  defaults,
}: {
  categories: Cat[]
  payableId?: string
  defaults?: Defaults
}) {
  const [state, action, pending] = useActionState<FinancePayableActionState, FormData>(
    payableId ? updatePayable : createPayable,
    null,
  )

  return (
    <form action={action} className="space-y-4">
      {payableId && <input type="hidden" name="id" value={payableId} />}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Chủ nợ" name="creditorName">
          <Input id="creditorName" name="creditorName" defaultValue={defaults?.creditorName ?? ''} placeholder="vd: Chủ nhà, Nhà sách…" />
        </Field>
        <Field label="Danh mục (chi)" name="categoryId">
          <select id="categoryId" name="categoryId" defaultValue={defaults?.categoryId ?? ''} className={selectClass}>
            <option value="">— Không phân loại —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Nội dung" name="title">
          <Input id="title" name="title" defaultValue={defaults?.title ?? ''} placeholder="vd: Thuê phòng tháng 7" />
        </Field>
        <Field label="Tổng phải trả (VND) *" name="totalAmount">
          <Input id="totalAmount" name="totalAmount" inputMode="numeric" required defaultValue={defaults?.totalAmount ? String(defaults.totalAmount) : ''} placeholder="vd: 2000000" />
        </Field>
        <Field label="Hạn trả" name="dueDate">
          <Input id="dueDate" type="date" name="dueDate" defaultValue={defaults?.dueDate ?? ''} />
        </Field>
      </div>
      <Field label="Ghi chú" name="note">
        <Input id="note" name="note" defaultValue={defaults?.note ?? ''} />
      </Field>

      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang lưu…' : payableId ? 'Lưu thay đổi' : 'Tạo khoản phải trả'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Viết `components/finance/payable-payment-form.tsx`**

Gương `components/finance/payment-form.tsx` nhưng gọi `recordPayablePayment`, field ẩn `payableId`, nhãn "Ghi trả":
```tsx
'use client'

import { useActionState } from 'react'
import { recordPayablePayment, type FinancePayableActionState } from '@/server/finance/payables-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function PayablePaymentForm({ payableId, remaining }: { payableId: string; remaining: number }) {
  const [state, action, pending] = useActionState<FinancePayableActionState, FormData>(recordPayablePayment, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="payableId" value={payableId} />
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số tiền (VND) *" name="amount">
          <Input id="amount" name="amount" inputMode="numeric" required defaultValue={remaining > 0 ? String(remaining) : ''} placeholder="Số tiền trả" />
        </Field>
        <Field label="Phương thức" name="method">
          <select id="method" name="method" defaultValue="cash" className={selectClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày trả (để trống = hiện tại)" name="occurredAt">
          <Input id="occurredAt" type="datetime-local" name="occurredAt" />
        </Field>
        <Field label="Tham chiếu (số CT…)" name="reference">
          <Input id="reference" name="reference" placeholder="vd: MB123456" />
        </Field>
      </div>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang ghi…' : 'Ghi trả'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Viết `app/(app)/tai-chinh/phai-tra/page.tsx` (danh sách)**

Gương `app/(app)/tai-chinh/phai-thu/page.tsx` với thay thế: `listPayables`/`payablesTotal` thay `listInvoices`/`receivables…`; cột "Chủ nợ / Nội dung", "Danh mục", "Tổng", "Còn nợ", "Trạng thái"; lọc theo `PAYABLE_STATUSES`/`PAYABLE_STATUS_LABEL`; link `/tai-chinh/phai-tra/[id]`; nút "+ Thêm khoản phải trả" → `/tai-chinh/phai-tra/moi`; `isOverdue` dùng `due_date`+`status ∈ {paid,cancelled}` (giống phải thu). Tổng công nợ phải trả từ `payablesTotal()`. Metadata title "Phải trả — EduFlow".

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listPayables, payablesTotal } from '@/server/finance/payables'
import { PAYABLE_STATUSES, PAYABLE_STATUS_LABEL } from '@/lib/validators/payable'
import { formatVND, formatDate } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Phải trả — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { status?: string; page?: string }

function isOverdue(p: { due_date: string | null; status: string }, today: string): boolean {
  if (!p.due_date) return false
  if (p.status === 'paid' || p.status === 'cancelled') return false
  return p.due_date < today
}

export default async function PhaiTraPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const today = new Date().toISOString().slice(0, 10)

  const [{ rows, total, pageSize }, totalOutstanding] = await Promise.all([
    listPayables({ status: sp.status, page }),
    payablesTotal(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.status) params.set('status', sp.status)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/phai-tra?${qs}` : '/tai-chinh/phai-tra'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Phải trả</h1>
        <Link href="/tai-chinh/phai-tra/moi" className={buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })}>
          + Thêm khoản phải trả
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Tổng công nợ phải trả</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{formatVND(totalOutstanding)}</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select name="status" defaultValue={sp.status ?? ''} className={inputClass}>
          <option value="">Tất cả trạng thái</option>
          {PAYABLE_STATUSES.map((s) => (
            <option key={s} value={s}>{PAYABLE_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} khoản</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có khoản phải trả nào.</p>
          <Link href="/tai-chinh/phai-tra/moi" className={buttonVariants({ variant: 'success', className: 'mt-4' })}>
            Thêm khoản đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Chủ nợ / Nội dung</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Hạn</th>
                  <th className="px-4 py-3 text-right">Tổng</th>
                  <th className="px-4 py-3 text-right">Còn nợ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const overdue = isOverdue(p, today)
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted">
                      <td className="px-4 py-3">
                        <Link href={`/tai-chinh/phai-tra/${p.id}`} className="font-medium text-foreground hover:underline">
                          {p.creditor_name ?? '—'}
                        </Link>
                        {p.title && <div className="text-xs text-muted-foreground">{p.title}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.due_date ? formatDate(p.due_date) : '—'}
                        {overdue && <span className="ml-1 text-xs text-destructive">(quá hạn)</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{formatVND(p.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatVND(p.total_amount - p.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                          {PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((p) => {
              const overdue = isOverdue(p, today)
              return (
                <li key={p.id}>
                  <Link href={`/tai-chinh/phai-tra/${p.id}`} className="block rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-foreground">{p.creditor_name ?? '—'}</span>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    {p.title && <p className="mt-0.5 text-xs text-muted-foreground">{p.title}</p>}
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div><dt className="inline">Tổng: </dt><dd className="inline">{formatVND(p.total_amount)}</dd></div>
                      <div><dt className="inline">Còn nợ: </dt><dd className="inline font-medium text-foreground">{formatVND(p.total_amount - p.amount_paid)}</dd></div>
                      {p.due_date && (
                        <div className={overdue ? 'text-destructive' : ''}>
                          <dt className="inline">Hạn: </dt><dd className="inline">{formatDate(p.due_date)}{overdue ? ' (quá hạn)' : ''}</dd>
                        </div>
                      )}
                    </dl>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>← Trước</Link>
            ) : (
              <Button variant="outline" disabled>← Trước</Button>
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>Sau →</Link>
            ) : (
              <Button variant="outline" disabled>Sau →</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Viết `app/(app)/tai-chinh/phai-tra/moi/page.tsx`**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listCategories } from '@/server/finance/categories'
import PayableForm from '@/components/finance/payable-form'

export const metadata: Metadata = { title: 'Thêm khoản phải trả — EduFlow' }

export default async function PhaiTraMoiPage() {
  const categories = await listCategories({ kind: 'expense' })
  return (
    <div className="space-y-6">
      <div>
        <Link href="/tai-chinh/phai-tra" className="text-sm text-muted-foreground hover:text-foreground">← Phải trả</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Thêm khoản phải trả</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <PayableForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Viết `app/(app)/tai-chinh/phai-tra/[id]/page.tsx`**

Chi tiết: tóm tắt (tổng / đã trả / còn nợ / trạng thái / hạn + badge quá hạn), form `PayablePaymentForm` (ẩn khi `paid`/`cancelled`), lịch sử giao dịch chi, nút hủy (`cancelPayableAction`) và link sửa.
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayable } from '@/server/finance/payables'
import { cancelPayableAction } from '@/server/finance/payables-actions'
import { PAYABLE_STATUS_LABEL } from '@/lib/validators/payable'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import PayablePaymentForm from '@/components/finance/payable-payment-form'

export const metadata: Metadata = { title: 'Chi tiết phải trả — EduFlow' }

export default async function PhaiTraChiTietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPayable(id)
  if (!data) notFound()
  const { payable: p, transactions } = data
  const remaining = p.total_amount - p.amount_paid
  const closed = p.status === 'paid' || p.status === 'cancelled'
  const today = new Date().toISOString().slice(0, 10)
  const overdue = !!p.due_date && !closed && p.due_date < today

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/tai-chinh/phai-tra" className="text-sm text-muted-foreground hover:text-foreground">← Phải trả</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{p.creditor_name ?? 'Khoản phải trả'}</h1>
          {p.title && <p className="text-muted-foreground">{p.title}</p>}
        </div>
        {p.status !== 'cancelled' && (
          <div className="flex gap-2">
            <Link href={`/tai-chinh/phai-tra/${p.id}/sua`} className={buttonVariants({ variant: 'outline' })}>Sửa</Link>
            <form action={cancelPayableAction}>
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="outline" className="text-destructive">Hủy khoản</Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label="Tổng phải trả" value={formatVND(p.total_amount)} />
        <Summary label="Đã trả" value={formatVND(p.amount_paid)} />
        <Summary label="Còn nợ" value={formatVND(remaining)} strong />
        <Summary
          label="Trạng thái"
          value={(PAYABLE_STATUS_LABEL[p.status] ?? p.status) + (overdue ? ' · quá hạn' : '')}
        />
      </div>
      {p.due_date && <p className="text-sm text-muted-foreground">Hạn trả: {formatDate(p.due_date)}</p>}

      {!closed && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-medium text-foreground">Ghi trả nợ</h2>
          <PayablePaymentForm payableId={p.id} remaining={remaining} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">Lịch sử trả</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">{formatVND(t.amount)}</span>
                  <span className="ml-2 text-muted-foreground">{PAYMENT_METHOD_LABEL[t.method] ?? t.method}</span>
                  {t.reference && <span className="ml-2 text-xs text-muted-foreground">#{t.reference}</span>}
                </div>
                <span className="text-muted-foreground">{formatDateTime(t.occurred_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? 'text-xl font-semibold' : 'text-base'} text-foreground`}>{value}</p>
    </div>
  )
}
```

- [ ] **Step 7: Viết `app/(app)/tai-chinh/phai-tra/[id]/sua/page.tsx`**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayable } from '@/server/finance/payables'
import { listCategories } from '@/server/finance/categories'
import PayableForm from '@/components/finance/payable-form'

export const metadata: Metadata = { title: 'Sửa khoản phải trả — EduFlow' }

export default async function PhaiTraSuaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, categories] = await Promise.all([getPayable(id), listCategories({ kind: 'expense' })])
  if (!data) notFound()
  const p = data.payable
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/tai-chinh/phai-tra/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← Chi tiết</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Sửa khoản phải trả</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <PayableForm
          payableId={id}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          defaults={{
            creditorName: p.creditor_name,
            title: p.title,
            categoryId: p.category_id,
            totalAmount: p.total_amount,
            dueDate: p.due_date,
            note: p.note,
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Thêm mục nav & kiểm tra build**

`components/app-nav.tsx` giữ nguyên (nav chính "Tài chính" → `/tai-chinh/phai-thu`; sub-nav lo phần còn lại). Xác nhận `formatDateTime` tồn tại trong `lib/format.ts` (nếu chưa, dùng `formatDate`).

Run: `npx tsc --noEmit && npm run build`
Expected: build thành công, có route `/tai-chinh/phai-tra`, `/moi`, `/[id]`, `/[id]/sua`.

- [ ] **Step 9: Commit**

```bash
git add app/(app)/tai-chinh/layout.tsx components/finance/finance-tabs.tsx components/finance/payable-form.tsx components/finance/payable-payment-form.tsx "app/(app)/tai-chinh/phai-tra"
git commit -m "feat(finance): layout sub-nav + UI phai tra (list/tao/chi tiet/tra no) (GD6)"
```

---

### Task 7: UI Sổ thu/chi + Danh mục

**Files:**
- Create: `app/(app)/tai-chinh/thu-chi/page.tsx`
- Create: `components/finance/transaction-quick-form.tsx`
- Create: `app/(app)/tai-chinh/danh-muc/page.tsx`
- Create: `components/finance/category-manager.tsx`

**Interfaces:**
- Consumes: `listTransactions` (Task 4), `createTransaction`/`deleteTransactionAction` (Task 4), `listCategories` (Task 4), `createCategory`/`updateCategory`/`archiveCategoryAction` (Task 4), `PAYMENT_METHODS`, `CATEGORY_KINDS`/`CATEGORY_KIND_LABEL`, `formatVND`/`formatDateTime`.

- [ ] **Step 1: Viết `components/finance/transaction-quick-form.tsx`**

Form nhanh thêm 1 dòng thu/chi. Dùng `useActionState(createTransaction)`; chọn `type` (thu/chi) lọc danh mục theo kind ở client.
```tsx
'use client'

import { useActionState, useState } from 'react'
import { createTransaction, type FinanceLedgerActionState } from '@/server/finance/ledger-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

type Cat = { id: string; name: string; kind: string }

function Field({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function TransactionQuickForm({ categories }: { categories: Cat[] }) {
  const [state, action, pending] = useActionState<FinanceLedgerActionState, FormData>(createTransaction, null)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const cats = categories.filter((c) => c.kind === type)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Đã ghi giao dịch.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Loại *" name="type">
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className={selectClass}>
            <option value="expense">Chi</option>
            <option value="income">Thu</option>
          </select>
        </Field>
        <Field label="Số tiền (VND) *" name="amount">
          <Input id="amount" name="amount" inputMode="numeric" required placeholder="vd: 150000" />
        </Field>
        <Field label="Danh mục" name="categoryId">
          <select id="categoryId" name="categoryId" className={selectClass} defaultValue="">
            <option value="">— Không phân loại —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Phương thức" name="method">
          <select id="method" name="method" defaultValue="cash" className={selectClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
            ))}
          </select>
        </Field>
        <Field label="Thời điểm (trống = hiện tại)" name="occurredAt">
          <Input id="occurredAt" type="datetime-local" name="occurredAt" />
        </Field>
        <Field label="Ghi chú" name="note">
          <Input id="note" name="note" placeholder="Diễn giải" />
        </Field>
      </div>
      <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Đang ghi…' : 'Ghi giao dịch'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Viết `app/(app)/tai-chinh/thu-chi/page.tsx`**

Form nhanh trên cùng + danh sách `listTransactions` (lọc loại/danh mục/khoảng ngày) + nút xóa dòng tự do (`deleteTransactionAction`).
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listTransactions } from '@/server/finance/ledger'
import { deleteTransactionAction } from '@/server/finance/ledger-actions'
import { listCategories } from '@/server/finance/categories'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import TransactionQuickForm from '@/components/finance/transaction-quick-form'

export const metadata: Metadata = { title: 'Sổ thu/chi — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { type?: string; category?: string; from?: string; to?: string; page?: string }

const SOURCE_LABEL: Record<string, string> = { invoice: 'Học phí', payable: 'Trả nợ', free: 'Tự do' }

export default async function ThuChiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const [{ rows, total, pageSize }, categories] = await Promise.all([
    listTransactions({ type: sp.type, categoryId: sp.category, from: sp.from, to: sp.to, page }),
    listCategories(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries({ type: sp.type, category: sp.category, from: sp.from, to: sp.to })) {
      if (v) params.set(k, v)
    }
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/thu-chi?${qs}` : '/tai-chinh/thu-chi'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sổ thu/chi</h1>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-medium text-foreground">Ghi nhanh</h2>
        <TransactionQuickForm categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))} />
      </section>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <select name="type" defaultValue={sp.type ?? ''} className={inputClass}>
          <option value="">Tất cả loại</option>
          <option value="income">Thu</option>
          <option value="expense">Chi</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ''} className={inputClass}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ''} className={inputClass} />
        <input type="date" name="to" defaultValue={sp.to ?? ''} className={inputClass} />
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} giao dịch</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có giao dịch nào.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className={`font-medium ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                  {t.type === 'income' ? '+' : '−'}{formatVND(t.amount)}
                </span>
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {SOURCE_LABEL[t.source]}
                </span>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[t.category_name, t.student_name, t.creditor_name, t.note].filter(Boolean).join(' · ') || '—'}
                  {' · '}{PAYMENT_METHOD_LABEL[t.method] ?? t.method}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground">{formatDateTime(t.occurred_at)}</span>
                {t.source === 'free' && (
                  <form action={deleteTransactionAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-2 text-xs text-destructive">Xóa</Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>← Trước</Link> : <Button variant="outline" disabled>← Trước</Button>}
            {page < totalPages ? <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>Sau →</Link> : <Button variant="outline" disabled>Sau →</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Viết `components/finance/category-manager.tsx`**

Quản lý danh mục theo 2 nhóm; thêm nhanh + đổi tên + archive. Client component nhận danh sách theo kind.
```tsx
'use client'

import { useActionState } from 'react'
import { createCategory, updateCategory, archiveCategoryAction, type FinanceCategoryActionState } from '@/server/finance/categories-actions'
import { CATEGORY_KIND_LABEL } from '@/lib/validators/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Cat = { id: string; name: string }

function AddForm({ kind }: { kind: 'income' | 'expense' }) {
  const [state, action, pending] = useActionState<FinanceCategoryActionState, FormData>(createCategory, null)
  return (
    <form action={action} className="flex items-start gap-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex-1">
        <Input name="name" placeholder={`Thêm danh mục ${CATEGORY_KIND_LABEL[kind].toLowerCase()}…`} required />
        {state?.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>Thêm</Button>
    </form>
  )
}

function Row({ cat }: { cat: Cat }) {
  const [state, action, pending] = useActionState<FinanceCategoryActionState, FormData>(updateCategory, null)
  return (
    <li className="flex items-center gap-2 px-4 py-2.5">
      <form action={action} className="flex flex-1 items-center gap-2">
        <input type="hidden" name="id" value={cat.id} />
        <Input name="name" defaultValue={cat.name} className="h-8" />
        <Button type="submit" variant="ghost" className="h-8 px-2 text-xs" disabled={pending}>Lưu</Button>
        {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
      </form>
      <form action={archiveCategoryAction}>
        <input type="hidden" name="id" value={cat.id} />
        <Button type="submit" variant="ghost" className="h-8 px-2 text-xs text-destructive">Ẩn</Button>
      </form>
    </li>
  )
}

export default function CategoryManager({ income, expense }: { income: Cat[]; expense: Cat[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {([['expense', expense], ['income', income]] as const).map(([kind, list]) => (
        <div key={kind} className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium text-foreground">Danh mục {CATEGORY_KIND_LABEL[kind].toLowerCase()}</h2>
          </div>
          <ul className="divide-y divide-border">
            {list.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Chưa có danh mục.</li>
            ) : (
              list.map((c) => <Row key={c.id} cat={c} />)
            )}
          </ul>
          <div className="border-t border-border p-3">
            <AddForm kind={kind} />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Viết `app/(app)/tai-chinh/danh-muc/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { listCategories } from '@/server/finance/categories'
import CategoryManager from '@/components/finance/category-manager'

export const metadata: Metadata = { title: 'Danh mục thu/chi — EduFlow' }

export default async function DanhMucPage() {
  const cats = await listCategories()
  const income = cats.filter((c) => c.kind === 'income').map((c) => ({ id: c.id, name: c.name }))
  const expense = cats.filter((c) => c.kind === 'expense').map((c) => ({ id: c.id, name: c.name }))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Danh mục thu/chi</h1>
      <CategoryManager income={income} expense={expense} />
    </div>
  )
}
```

- [ ] **Step 5: Kiểm tra build**

Run: `npx tsc --noEmit && npm run build`
Expected: build thành công, route `/tai-chinh/thu-chi`, `/tai-chinh/danh-muc`.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/tai-chinh/thu-chi" "app/(app)/tai-chinh/danh-muc" components/finance/transaction-quick-form.tsx components/finance/category-manager.tsx
git commit -m "feat(finance): UI so thu/chi + quan ly danh muc (GD6)"
```

---

### Task 8: UI Hạn thanh toán + Lịch sử thanh toán

**Files:**
- Create: `app/(app)/tai-chinh/han-thanh-toan/page.tsx`
- Create: `app/(app)/tai-chinh/lich-su/page.tsx`

**Interfaces:**
- Consumes: `listUpcomingDue` (Task 4), `listTransactions` (Task 4), `formatVND`/`formatDate`/`formatDateTime`, `PAYMENT_METHOD_LABEL`.

- [ ] **Step 1: Viết `app/(app)/tai-chinh/han-thanh-toan/page.tsx`**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listUpcomingDue, type DueRow } from '@/server/finance/ledger'
import { formatVND, formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'Hạn thanh toán — EduFlow' }

function DueList({ title, rows, tone }: { title: string; rows: DueRow[]; tone: 'danger' | 'normal' }) {
  return (
    <section className="space-y-3">
      <h2 className={`text-lg font-medium ${tone === 'danger' ? 'text-destructive' : 'text-foreground'}`}>
        {title} <span className="text-sm text-muted-foreground">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có khoản nào.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.kind === 'receivable' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                  {r.kind === 'receivable' ? 'Thu' : 'Trả'}
                </span>
                <Link
                  href={r.kind === 'receivable' ? `/tai-chinh/phai-thu/${r.id}` : `/tai-chinh/phai-tra/${r.id}`}
                  className="ml-2 font-medium text-foreground hover:underline"
                >
                  {r.name ?? '—'}
                </Link>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium text-foreground">{formatVND(r.remaining)}</div>
                <div className="text-xs text-muted-foreground">Hạn {formatDate(r.due_date)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function HanThanhToanPage() {
  const { overdue, upcoming } = await listUpcomingDue()
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hạn thanh toán</h1>
      <DueList title="Quá hạn" rows={overdue} tone="danger" />
      <DueList title="Sắp tới" rows={upcoming} tone="normal" />
    </div>
  )
}
```

- [ ] **Step 2: Viết `app/(app)/tai-chinh/lich-su/page.tsx`**

Timeline mọi giao dịch (dùng chung `listTransactions`), lọc loại + khoảng ngày.
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listTransactions } from '@/server/finance/ledger'
import { PAYMENT_METHOD_LABEL } from '@/lib/validators/payment'
import { formatVND, formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Lịch sử thanh toán — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
const SOURCE_LABEL: Record<string, string> = { invoice: 'Học phí', payable: 'Trả nợ', free: 'Tự do' }

type SearchParams = { type?: string; from?: string; to?: string; page?: string }

export default async function LichSuPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows, total, pageSize } = await listTransactions({ type: sp.type, from: sp.from, to: sp.to, page })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries({ type: sp.type, from: sp.from, to: sp.to })) if (v) params.set(k, v)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-chinh/lich-su?${qs}` : '/tai-chinh/lich-su'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lịch sử thanh toán</h1>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <select name="type" defaultValue={sp.type ?? ''} className={inputClass}>
          <option value="">Tất cả loại</option>
          <option value="income">Thu</option>
          <option value="expense">Chi</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ''} className={inputClass} />
        <input type="date" name="to" defaultValue={sp.to ?? ''} className={inputClass} />
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} giao dịch</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có giao dịch nào.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className={`font-medium ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                  {t.type === 'income' ? '+' : '−'}{formatVND(t.amount)}
                </span>
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{SOURCE_LABEL[t.source]}</span>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[t.category_name, t.student_name, t.creditor_name, t.note].filter(Boolean).join(' · ') || '—'}
                  {' · '}{PAYMENT_METHOD_LABEL[t.method] ?? t.method}
                </div>
              </div>
              <span className="shrink-0 text-muted-foreground">{formatDateTime(t.occurred_at)}</span>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>← Trước</Link> : <Button variant="outline" disabled>← Trước</Button>}
            {page < totalPages ? <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>Sau →</Link> : <Button variant="outline" disabled>Sau →</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Kiểm tra build**

Run: `npx tsc --noEmit && npm run build`
Expected: build thành công, route `/tai-chinh/han-thanh-toan`, `/tai-chinh/lich-su`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/tai-chinh/han-thanh-toan" "app/(app)/tai-chinh/lich-su"
git commit -m "feat(finance): UI han thanh toan (gop 2 chieu) + lich su thanh toan (GD6)"
```

---

### Task 9: Đóng giai đoạn — kiểm thử toàn diện + cập nhật tài liệu

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `CLAUDE.md` (§2 trạng thái + §7 lệnh nếu cần)

- [ ] **Step 1: Chạy toàn bộ kiểm thử tự động**

Run: `npx tsc --noEmit && npm test && npm run lint && npm run build`
Expected: `tsc` 0 lỗi; test PASS (42 cũ + 9 mới = 51); lint 0 error; build xanh.

- [ ] **Step 2: Chạy lại toàn bộ test cách ly RLS + nghiệp vụ tài chính**

Run:
```bash
node --env-file=.env.local scripts/test-rls-payables.mjs
node --env-file=.env.local scripts/test-payable-flow.mjs
node --env-file=.env.local scripts/test-rls-finance.mjs
node --env-file=.env.local scripts/test-invoice-flow.mjs
```
Expected: cả 4 in `✅ … ĐẠT.` (exit 0) — không hồi quy GĐ5.

- [ ] **Step 3: Cập nhật `docs/IMPLEMENTATION_STATUS.md`**

Cập nhật: giai đoạn hiện tại → "GĐ6 đã hoàn tất; kế tiếp GĐ7 — Báo cáo & Dashboard"; thêm hàng bảng §1 cho GĐ6 (payables + trigger + sổ thu/chi + hạn + lịch sử + danh mục); thêm mục §6 migration `0012_payables.sql`; thêm §7 lệnh 2 script mới; ghi kết quả kiểm thử mới (51 test, 4 script RLS/nghiệp vụ PASS).

- [ ] **Step 4: Cập nhật `CLAUDE.md §2`**

Đổi dòng "Giai đoạn" và "Việc kế tiếp" phản ánh GĐ6 xong → GĐ7.

- [ ] **Step 5: Commit**

```bash
git add docs/IMPLEMENTATION_STATUS.md CLAUDE.md
git commit -m "docs(gd6): dong GD6 - phai tra & so thu/chi dat DoD"
```

- [ ] **Step 6: Merge vào `main`** (theo `superpowers:finishing-a-development-branch`)

Sau khi mọi kiểm thử xanh, đề xuất người dùng merge `feat/gd6-phai-tra` → `main` (giữ nếp GĐ5).

---

## Self-Review

**1. Spec coverage** (đối chiếu `docs/superpowers/specs/2026-07-15-6-phai-tra-thu-chi-design.md`):
- §3 Schema payables + FK + index → Task 1 ✓
- §4 Trigger recalc_payable_paid → Task 1 ✓
- §5 Validators (payable/transaction/category/payablePayment) → Task 2 ✓
- §5 Server read/write (payables, ledger, categories) → Task 3 + Task 4 ✓
- §6 UI: layout sub-nav → Task 6; phải trả (list/tạo/chi tiết/sửa) → Task 6; thu/chi + danh mục → Task 7; hạn thanh toán + lịch sử → Task 8 ✓
- §7 Test RLS payables → Task 1; test nghiệp vụ payable → Task 5; unit validators → Task 2; đóng GĐ (tsc/test/lint/build) → Task 9 ✓
- §8 DoD → Task 9 Step 1–2 kiểm chứng ✓

**2. Placeholder scan:** Không có "TBD/TODO"; mọi bước code có nội dung thật. UI phải trả list tuy theo khuôn phải-thu nhưng **cung cấp code đầy đủ** (không "similar to").

**3. Type consistency:**
- `PayableRow`/`PayableTxRow` (Task 3) khớp tiêu thụ ở UI Task 6.
- `LedgerRow`/`DueRow` (Task 4) khớp `listTransactions`/`listUpcomingDue` tiêu thụ ở Task 7/8.
- `CategoryRow` (Task 4) khớp `listCategories` tiêu thụ ở Task 6/7.
- Action state types: `FinancePayableActionState` (payables-actions), `FinanceLedgerActionState` (ledger-actions), `FinanceCategoryActionState` (categories-actions) — mỗi form dùng đúng type.
- Enum/label: `PAYABLE_STATUSES`/`PAYABLE_STATUS_LABEL`, `CATEGORY_KINDS`/`CATEGORY_KIND_LABEL` dùng nhất quán.

**Đã xác minh trước khi bàn giao:**
- `formatVND`/`formatDate`/`formatDateTime` đã có trong `lib/format.ts` (đều theo `Asia/Ho_Chi_Minh`, `vi-VN`) — dùng trực tiếp.
- Chữ ký `getSessionContext`/`isReadOnly` trong `@/lib/auth` khớp cách dùng ở `server/finance/actions.ts` (đối chiếu — dùng y hệt trong `requireWritable`).
- Migration kế tiếp `0012` (đã kiểm: 0009=attendance, 0010/0011=finance GĐ5; chưa có 0012).
