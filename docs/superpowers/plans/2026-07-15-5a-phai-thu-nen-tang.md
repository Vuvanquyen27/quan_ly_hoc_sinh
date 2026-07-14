# GĐ5A — Nền tảng Phải thu (DB + trigger + RPC + server) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Áp khuôn `vertical-slice-crud-rls`. Steps checkbox để theo dõi.

**Goal:** Nền tảng tài chính phải thu — schema `categories`/`invoices`/`invoice_items`/`transactions` + RLS; trigger cập nhật `amount_paid`/`status`; RPC tổng hợp hóa đơn atomic từ buổi đã hoàn thành; tầng server tạo/đọc hóa đơn + ghi thu + công nợ. **Chưa có UI** (5B).

**Architecture:** Bảng theo `DATABASE.md §5.4`. Tổng hợp hóa đơn dùng **RPC plpgsql SECURITY INVOKER** (atomic, RLS áp) để đặt `sessions.is_billed=true` cùng lúc tạo hóa đơn → chống tính trùng. Trigger AFTER trên `transactions` recalc hóa đơn.

**Tech Stack:** Supabase Postgres/RLS/plpgsql, Next.js Server Actions, Zod, Vitest.

## Global Constraints
- `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade` + RLS 4 policy thuần `auth.uid() = user_id`; **không** nhánh admin.
- Tiền `bigint` VND; `transactions.amount > 0`; `invoices.total_amount >= 0`.
- CHECK `(invoice_id IS NULL OR type='income')`, `(payable_id IS NULL OR type='expense')`.
- **Không** truyền `user_id` từ client. Server action gate `requireWritable` (`@/lib/auth`). Action trả `{ error?: string } | null`.
- Migration versioned; áp `node --env-file=.env.local scripts/run-migration.mjs <file>`. Số kế tiếp: `0010`, `0011`.
- Múi giờ tổng hợp theo tháng: `date_trunc('month', start_time at time zone 'Asia/Ho_Chi_Minh')`.
- Nguồn chân lý: `DATABASE.md §5.4`. Spec: `docs/superpowers/specs/2026-07-15-5-phai-thu-design.md`.

## File Structure
| File | Trách nhiệm |
|---|---|
| `supabase/migrations/0010_finance_receivables.sql` | 4 enum + 4 bảng + RLS + index + CHECK + trigger updated_at |
| `supabase/migrations/0011_finance_functions.sql` | trigger `recalc_invoice_paid` + RPC `create_invoice_from_sessions` |
| `scripts/test-rls-finance.mjs` | cách ly RLS 4 bảng (raw fetch) |
| `scripts/test-invoice-flow.mjs` | nghiệp vụ: tổng hợp không trùng, trigger partial/paid |
| `lib/validators/invoice.ts` + `.test.ts` | Zod hóa đơn tay + preview params |
| `lib/validators/payment.ts` + `.test.ts` | Zod ghi thu |
| `server/finance/invoices.ts` | preview/create(from sessions & manual)/list/get/update/cancel |
| `server/finance/payments.ts` | `recordTuitionPayment` |
| `server/finance/queries.ts` | `receivablesByStudent`/`receivablesTotal` |

---

## Task 1: Migration schema + RLS + test cách ly

**Files:** Create `supabase/migrations/0010_finance_receivables.sql`, `scripts/test-rls-finance.mjs`

- [ ] **Step 1: Viết** `0010_finance_receivables.sql`

```sql
-- ============================================================
-- 0010 — Tài chính phải thu: categories, invoices, invoice_items, transactions + RLS
-- Khớp docs/DATABASE.md §5.4 và specs/2026-07-15-5-phai-thu-design.md
-- ============================================================

create type public.invoice_status   as enum ('draft','unpaid','partial','paid','overdue','cancelled');
create type public.transaction_type as enum ('income','expense');
create type public.payment_method   as enum ('cash','bank_transfer','e_wallet','other');
create type public.category_kind    as enum ('income','expense');

-- categories (schema + RLS ở GĐ5; UI quản lý ở GĐ6)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind public.category_kind not null,
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_user_kind_name_unique unique (user_id, kind, name)
);
create index idx_categories_user_kind on public.categories (user_id, kind);

-- invoices (khoản phải thu)
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  code text,
  title text,
  period_month date,
  subtotal bigint not null default 0,
  discount bigint not null default 0,
  total_amount bigint not null default 0 check (total_amount >= 0),
  amount_paid bigint not null default 0,
  status public.invoice_status not null default 'unpaid',
  issue_date date not null default current_date,
  due_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_invoices_user_status on public.invoices (user_id, status);
create index idx_invoices_user_student on public.invoices (user_id, student_id);
create index idx_invoices_user_due on public.invoices (user_id, due_date);

-- invoice_items (dòng chi tiết)
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  description text,
  quantity numeric not null default 1,
  unit_price bigint not null default 0,
  amount bigint not null default 0
);
create index idx_invoice_items_user_invoice on public.invoice_items (user_id, invoice_id);

-- transactions (dòng tiền thực; payable_id để cột trơn cho GĐ6, chưa FK)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount bigint not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  method public.payment_method not null default 'cash',
  category_id uuid references public.categories(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  payable_id uuid,
  reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_invoice_income check (invoice_id is null or type = 'income'),
  constraint transactions_payable_expense check (payable_id is null or type = 'expense')
);
create index idx_transactions_user_occurred on public.transactions (user_id, occurred_at);
create index idx_transactions_user_type on public.transactions (user_id, type);
create index idx_transactions_user_invoice on public.transactions (user_id, invoice_id);

-- updated_at triggers (invoice_items không có updated_at → không trigger)
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger trg_transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

-- RLS 4 policy/bảng (thuần auth.uid() = user_id)
alter table public.categories enable row level security;
create policy categories_select on public.categories for select using (auth.uid() = user_id);
create policy categories_insert on public.categories for insert with check (auth.uid() = user_id);
create policy categories_update on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy categories_delete on public.categories for delete using (auth.uid() = user_id);

alter table public.invoices enable row level security;
create policy invoices_select on public.invoices for select using (auth.uid() = user_id);
create policy invoices_insert on public.invoices for insert with check (auth.uid() = user_id);
create policy invoices_update on public.invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy invoices_delete on public.invoices for delete using (auth.uid() = user_id);

alter table public.invoice_items enable row level security;
create policy invoice_items_select on public.invoice_items for select using (auth.uid() = user_id);
create policy invoice_items_insert on public.invoice_items for insert with check (auth.uid() = user_id);
create policy invoice_items_update on public.invoice_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy invoice_items_delete on public.invoice_items for delete using (auth.uid() = user_id);

alter table public.transactions enable row level security;
create policy transactions_select on public.transactions for select using (auth.uid() = user_id);
create policy transactions_insert on public.transactions for insert with check (auth.uid() = user_id);
create policy transactions_update on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy transactions_delete on public.transactions for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Viết** `scripts/test-rls-finance.mjs` — copy khuôn `test-rls-attendance.mjs`, kiểm 4 bảng. Cấu trúc: A tạo student → invoice (insert `{student_id, total_amount, title}`), transaction income; B không đọc invoices/transactions của A; B giả mạo `user_id` → 403; ADMIN không đọc. In `✅ CÁCH LY RLS FINANCE ĐẠT.`

  Điểm khác khuôn: sau khi tạo student, A tạo invoice:
  ```js
  const inv = await (await fetch(`${url}/rest/v1/invoices`, { method:'POST', headers:{...head(aT), Prefer:'return=representation'},
    body: JSON.stringify({ student_id: st[0].id, title:'HP test', subtotal:500000, total_amount:500000 }) })).json()
  ```
  Kiểm: `A đọc 1 invoice`; `B đọc 0`; forge `user_id=A` trên invoices → !ok; ADMIN đọc 0.

- [ ] **Step 3: Áp migration**

Run: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0010_finance_receivables.sql`
Expected: `✅ Đã áp thành công`.

- [ ] **Step 4: Test RLS**

Run: `node --env-file=.env.local scripts/test-rls-finance.mjs`
Expected: `✅ CÁCH LY RLS FINANCE ĐẠT.`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_finance_receivables.sql scripts/test-rls-finance.mjs
git commit -m "feat(db): tai chinh phai thu (invoices/items/transactions/categories) + RLS (GD5A)"
```

---

## Task 2: Trigger recalc + RPC tổng hợp hóa đơn + test nghiệp vụ

**Files:** Create `supabase/migrations/0011_finance_functions.sql`, `scripts/test-invoice-flow.mjs`

- [ ] **Step 1: Viết** `0011_finance_functions.sql`

```sql
-- ============================================================
-- 0011 — Trigger recalc invoices.amount_paid + RPC tổng hợp hóa đơn từ buổi
-- ============================================================

-- Trigger: cập nhật amount_paid + status của invoice khi transactions đổi
create or replace function public.recalc_invoice_paid()
returns trigger
language plpgsql
as $$
declare
  inv_id uuid;
  paid bigint;
  tot bigint;
  cur_status public.invoice_status;
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);
  if inv_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into paid
    from public.transactions
    where invoice_id = inv_id and type = 'income';

  select total_amount, status into tot, cur_status
    from public.invoices where id = inv_id;

  if cur_status = 'cancelled' then
    update public.invoices set amount_paid = paid where id = inv_id;
    return coalesce(new, old);
  end if;

  update public.invoices
    set amount_paid = paid,
        status = case
          when tot > 0 and paid >= tot then 'paid'::public.invoice_status
          when paid > 0 then 'partial'::public.invoice_status
          else 'unpaid'::public.invoice_status
        end
    where id = inv_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_transactions_recalc_invoice
  after insert or update or delete on public.transactions
  for each row execute function public.recalc_invoice_paid();

-- RPC: tổng hợp hóa đơn từ buổi completed chưa billed trong kỳ (atomic, SECURITY INVOKER → RLS áp)
create or replace function public.create_invoice_from_sessions(
  p_student_id uuid,
  p_period_month date,
  p_discount bigint default 0,
  p_due_date date default null,
  p_title text default null
)
returns uuid
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_subtotal bigint;
begin
  select coalesce(sum(fee_amount), 0) into v_subtotal
    from public.sessions
    where student_id = p_student_id
      and status = 'completed'
      and is_billed = false
      and date_trunc('month', (start_time at time zone 'Asia/Ho_Chi_Minh'))
          = date_trunc('month', p_period_month::timestamp);

  if v_subtotal = 0 then
    raise exception 'Khong co buoi hoc hoan thanh chua lap hoa don trong ky';
  end if;

  insert into public.invoices
    (student_id, title, period_month, subtotal, discount, total_amount, status, issue_date, due_date)
  values
    (p_student_id, coalesce(p_title, 'Hoc phi ' || to_char(p_period_month, 'MM/YYYY')),
     p_period_month, v_subtotal, coalesce(p_discount, 0),
     greatest(v_subtotal - coalesce(p_discount, 0), 0), 'unpaid', current_date, p_due_date)
  returning id into v_invoice_id;

  insert into public.invoice_items (invoice_id, session_id, description, quantity, unit_price, amount)
    select v_invoice_id, s.id,
           'Buoi ' || to_char((s.start_time at time zone 'Asia/Ho_Chi_Minh'), 'DD/MM/YYYY HH24:MI'),
           1, s.fee_amount, s.fee_amount
      from public.sessions s
      where s.student_id = p_student_id
        and s.status = 'completed'
        and s.is_billed = false
        and date_trunc('month', (s.start_time at time zone 'Asia/Ho_Chi_Minh'))
            = date_trunc('month', p_period_month::timestamp);

  update public.sessions
    set is_billed = true
    where student_id = p_student_id
      and status = 'completed'
      and is_billed = false
      and date_trunc('month', (start_time at time zone 'Asia/Ho_Chi_Minh'))
          = date_trunc('month', p_period_month::timestamp);

  return v_invoice_id;
end;
$$;
```

- [ ] **Step 2: Áp migration**

Run: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0011_finance_functions.sql`
Expected: `✅ Đã áp thành công`.

- [ ] **Step 3: Viết** `scripts/test-invoice-flow.mjs` — nghiệp vụ (raw fetch, USER A token). Luồng:
  1. A tạo student (default_fee 300000) → tạo 2 buổi `completed` trong tháng 2026-07 (insert sessions với `status:'completed'`, `fee_amount:300000`, start_time trong tháng 7).
  2. Gọi RPC: `POST ${url}/rest/v1/rpc/create_invoice_from_sessions` body `{ p_student_id, p_period_month:'2026-07-01' }` → trả invoice_id. Kiểm: invoice `subtotal=600000`, `total_amount=600000`, `status='unpaid'`; 2 invoice_items; 2 buổi `is_billed=true`.
  3. Gọi RPC lần 2 cùng kỳ → **raise exception** (0 buổi còn lại) → HTTP !ok. Kiểm **không** tạo hóa đơn trùng.
  4. Ghi thu một phần: insert `transactions {type:'income', invoice_id, student_id, amount:200000}` → GET invoice → `amount_paid=200000`, `status='partial'`.
  5. Ghi thu nốt 400000 → `amount_paid=600000`, `status='paid'`.
  6. Xóa transaction vừa thu → `amount_paid` giảm, `status` về `partial`.
  In `✅ NGHIỆP VỤ HÓA ĐƠN ĐẠT.` Dọn user cuối.

- [ ] **Step 4: Chạy test nghiệp vụ**

Run: `node --env-file=.env.local scripts/test-invoice-flow.mjs`
Expected: `✅ NGHIỆP VỤ HÓA ĐƠN ĐẠT.`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0011_finance_functions.sql scripts/test-invoice-flow.mjs
git commit -m "feat(db): trigger recalc + RPC tong hop hoa don + test nghiep vu (GD5A)"
```

---

## Task 3: Validators + unit test

**Files:** Create `lib/validators/invoice.ts` (+ `.test.ts`), `lib/validators/payment.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `INVOICE_STATUSES`, `INVOICE_STATUS_LABEL`, `PAYMENT_METHODS`, `PAYMENT_METHOD_LABEL`, `previewParamsSchema` (`{ studentId, periodMonth }`), `manualInvoiceSchema` (`{ studentId, title?, totalAmount, dueDate? }`), `paymentSchema` (`{ invoiceId, amount, method, occurredAt?, reference? }`).

- [ ] **Step 1: Viết** `lib/validators/invoice.ts`

```ts
import { z } from 'zod'

export const INVOICE_STATUSES = ['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'] as const
export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', unpaid: 'Chưa thu', partial: 'Thu một phần',
  paid: 'Đã thu đủ', overdue: 'Quá hạn', cancelled: 'Đã hủy',
}

export const previewParamsSchema = z.object({
  studentId: z.string().trim().min(1, 'Vui lòng chọn học sinh'),
  periodMonth: z.string().trim().min(1, 'Vui lòng chọn kỳ (tháng)'),
})

export const manualInvoiceSchema = z.object({
  studentId: z.string().trim().min(1, 'Vui lòng chọn học sinh'),
  title: z.string().optional(),
  totalAmount: z.coerce.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không âm'),
  dueDate: z.string().optional(),
})

export type ManualInvoiceInput = z.infer<typeof manualInvoiceSchema>
```

- [ ] **Step 2: Viết** `lib/validators/payment.ts`

```ts
import { z } from 'zod'

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'e_wallet', 'other'] as const
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', e_wallet: 'Ví điện tử', other: 'Khác',
}

export const paymentSchema = z.object({
  invoiceId: z.string().trim().min(1, 'Thiếu hóa đơn'),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  method: z.enum(PAYMENT_METHODS),
  occurredAt: z.string().optional(),
  reference: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>
```

- [ ] **Step 3: Viết test** `lib/validators/invoice.test.ts` + `payment.test.ts` (mỗi file 3-4 case: hợp lệ; thiếu studentId/invoiceId; amount ≤ 0 bị từ chối; method sai bị từ chối).

```ts
// invoice.test.ts
import { describe, it, expect } from 'vitest'
import { manualInvoiceSchema, previewParamsSchema } from './invoice'
describe('invoice validators', () => {
  it('manual hợp lệ', () => expect(manualInvoiceSchema.safeParse({ studentId: 's', totalAmount: 500000 }).success).toBe(true))
  it('manual từ chối total âm', () => expect(manualInvoiceSchema.safeParse({ studentId: 's', totalAmount: -1 }).success).toBe(false))
  it('preview cần studentId', () => expect(previewParamsSchema.safeParse({ studentId: '', periodMonth: '2026-07' }).success).toBe(false))
})
```

```ts
// payment.test.ts
import { describe, it, expect } from 'vitest'
import { paymentSchema } from './payment'
describe('paymentSchema', () => {
  it('hợp lệ', () => expect(paymentSchema.safeParse({ invoiceId: 'i', amount: 100000, method: 'cash' }).success).toBe(true))
  it('từ chối amount 0', () => expect(paymentSchema.safeParse({ invoiceId: 'i', amount: 0, method: 'cash' }).success).toBe(false))
  it('từ chối method sai', () => expect(paymentSchema.safeParse({ invoiceId: 'i', amount: 1, method: 'x' }).success).toBe(false))
})
```

- [ ] **Step 4: Test** `npm test -- invoice payment` → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(finance): validators hoa don + thanh toan (GD5A)"`

---

## Task 4: Server invoices.ts + payments.ts + queries.ts

**Files:** Create `server/finance/invoices.ts`, `server/finance/payments.ts`, `server/finance/queries.ts`

**Interfaces (Produces):**
- `InvoiceRow`, `InvoiceItemRow`, `TransactionRow` types.
- `previewInvoiceFromSessions({studentId, periodMonth}): Promise<{ items:{sessionId,description,amount}[], subtotal:number }>`
- `createInvoiceFromSessions({studentId, periodMonth, discount?, dueDate?, title?}): Promise<{ error?: string; id?: string }>`
- `createManualInvoice(input): Promise<{ error?: string; id?: string }>`
- `listInvoices({status?, studentId?, page?}): Promise<{ rows, total, page, pageSize }>`
- `getInvoice(id): Promise<{ invoice, items, transactions } | null>`
- `cancelInvoiceAction(formData)`
- `recordTuitionPayment(_prev, formData): Promise<{error?:string}|null>` (payments.ts)
- `receivablesByStudent()`, `receivablesTotal()` (queries.ts)

- [ ] **Step 1: Viết** `server/finance/invoices.ts` — dùng `createServerSupabase`; tổng hợp gọi RPC:
```ts
const { data, error } = await supabase.rpc('create_invoice_from_sessions', {
  p_student_id: studentId, p_period_month: periodMonth, p_discount: discount ?? 0,
  p_due_date: dueDate || null, p_title: title || null,
})
```
Preview: query `sessions` `status='completed'`, `is_billed=false`, lọc kỳ theo tháng (so `start_time` ở JS theo VN hoặc `gte/lt` biên tháng UTC). `listInvoices`: `.select('*, students(full_name)', {count:'exact'}).order('created_at',{ascending:false}).range(...)`. `getInvoice`: invoice + `invoice_items` + `transactions(invoice_id=id)`. `createManualInvoice`: insert invoice `{student_id, title, total_amount, subtotal:total, due_date}`. `cancelInvoiceAction`: update `status='cancelled'`. Gate `requireWritable`; **không** `user_id`.

- [ ] **Step 2: Viết** `server/finance/payments.ts` — `recordTuitionPayment`: parse `paymentSchema`; đọc invoice (RLS) lấy `student_id`, `total_amount`, `amount_paid`; insert `transactions{type:'income', invoice_id, student_id, amount, method, occurred_at, reference}`; trigger tự cập nhật. `revalidatePath('/tai-chinh/phai-thu')` + `.../[id]`.

- [ ] **Step 3: Viết** `server/finance/queries.ts` — `receivablesByStudent`: đọc invoices chưa `paid/cancelled`, gom `SUM(total_amount-amount_paid)` theo student (JS reduce). `receivablesTotal`: tổng.

- [ ] **Step 4:** `npx tsc --noEmit` → 0 lỗi.
- [ ] **Step 5: Commit** `git commit -m "feat(finance): server invoices/payments/queries phai thu (GD5A)"`

---

## Task 5: Đóng 5A — kiểm thử tổng + cập nhật STATUS

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run lint` → xanh.
- [ ] **Step 2:** chạy lại `test-rls-finance.mjs` + `test-invoice-flow.mjs` → PASS.
- [ ] **Step 3:** Cập nhật `docs/IMPLEMENTATION_STATUS.md`: thêm mục GĐ5A (migration 0010/0011, RLS finance PASS, nghiệp vụ PASS), lệnh test mới.
- [ ] **Step 4: Commit** `git commit -m "docs(gd5a): dong nen tang phai thu"`. **CHECKPOINT** — báo cáo người dùng trước khi sang 5B (UI).

## Self-Review (đối chiếu spec 5A)
- Schema §3 → Task 1. Trigger §4 + RPC → Task 2. Server §5 → Task 3 (validators), Task 4. Kiểm thử §7 → Task 1 (RLS), Task 2 (nghiệp vụ), Task 3 (unit), Task 5. ✅
- Placeholder: server Task 4 mô tả + signatures + đoạn RPC quan trọng; không TBD. Chấp nhận vì tự thực thi inline theo khuôn `sessions`. Nếu subagent thực thi → cần bung code đầy đủ.
- Type consistency: RPC params `p_*` khớp giữa migration ↔ `supabase.rpc`. `paymentSchema`/`manualInvoiceSchema` khớp Task 3 ↔ Task 4.
