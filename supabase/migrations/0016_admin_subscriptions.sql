-- ============================================================
-- 0016 — Khu ADMIN: subscription_payments + admin_audit_logs + enums + RLS
-- Khớp docs/DATABASE.md §4, §5.1 và docs/plans/GIAI_DOAN_9.md Task 1
-- Phụ thuộc: 0001 (plans, subscriptions, is_admin, billing_cycle),
--            0010 (payment_method).
-- ============================================================

-- ---------- Enums (mới) ----------
-- subscription_status, billing_cycle đã có ở 0001; payment_method đã có ở 0010.
create type public.subscription_payment_status as enum ('pending','confirmed','failed','refunded');
create type public.subscription_event_kind     as enum ('activation','renewal','upgrade','downgrade');
create type public.admin_action                as enum (
  'activate_subscription','renew_subscription','change_plan',
  'cancel_subscription','lock_account','unlock_account','update_account'
);

-- ---------- subscription_payments (lịch sử thanh toán / kích hoạt / gia hạn) ----------
-- Nền tảng: KHÔNG default auth.uid() vì ADMIN tạo cho USER khác (user_id là USER đích).
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  kind public.subscription_event_kind not null,
  amount bigint not null default 0 check (amount >= 0),
  currency text not null default 'VND',
  billing_cycle public.billing_cycle,
  period_start timestamptz,
  period_end timestamptz,
  status public.subscription_payment_status not null default 'pending',
  method public.payment_method,
  reference text,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index idx_sub_payments_user on public.subscription_payments (user_id);
create index idx_sub_payments_sub  on public.subscription_payments (subscription_id);
create index idx_sub_payments_status on public.subscription_payments (status);

-- ---------- admin_audit_logs (nhật ký hành động ADMIN) ----------
-- actor_id RESTRICT để không mất dấu người thực hiện khi xóa tài khoản admin.
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action public.admin_action not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_subscription_id uuid references public.subscriptions(id) on delete set null,
  metadata jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);
create index idx_audit_actor  on public.admin_audit_logs (actor_id);
create index idx_audit_target on public.admin_audit_logs (target_user_id);
create index idx_audit_action on public.admin_audit_logs (action);
create index idx_audit_created on public.admin_audit_logs (created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.subscription_payments enable row level security;
alter table public.admin_audit_logs      enable row level security;

-- subscription_payments: USER chỉ ĐỌC bản ghi của mình; ADMIN toàn quyền.
-- (Ghi/xác nhận thực tế chạy bằng service_role ở server sau assertAdmin.)
create policy sub_payments_select on public.subscription_payments
  for select using (auth.uid() = user_id or public.is_admin());
create policy sub_payments_admin on public.subscription_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- admin_audit_logs: CHỈ ADMIN đọc; USER không có quyền nào.
-- Ghi log chạy bằng service_role (bỏ qua RLS) — không cấp insert cho authenticated.
create policy audit_select_admin on public.admin_audit_logs
  for select using (public.is_admin());
