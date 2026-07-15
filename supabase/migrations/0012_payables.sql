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
