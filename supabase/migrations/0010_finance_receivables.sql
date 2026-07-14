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
