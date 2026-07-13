-- ============================================================
-- 0001 — Tài khoản & Thuê bao (accounts + subscriptions)
-- Khớp docs/DATABASE.md §4, §5.1 và docs/plans/GIAI_DOAN_1.md Task 1
-- ============================================================

-- ---------- Enums ----------
create type subscription_status as enum ('trialing','active','past_due','expired','cancelled');
create type billing_cycle       as enum ('monthly','yearly');

-- ---------- Hàm dùng chung ----------
-- Cập nhật updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Kiểm tra ADMIN: đọc app_metadata.role từ JWT (không truy vấn bảng → tránh đệ quy RLS)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ---------- plans (nền tảng, không có user_id) ----------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  price bigint not null default 0,
  billing_cycle billing_cycle not null,
  features jsonb not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_plans_updated before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------- profiles (1-1 với auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role text not null default 'user',
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- user_settings (1-1) ----------
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'VND',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  locale text not null default 'vi',
  date_format text not null default 'dd/MM/yyyy',
  default_session_duration_min int not null default 90,
  notify_session_reminder boolean not null default true,
  notify_payment_due boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_user_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------- subscriptions (1-1) ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status subscription_status not null default 'trialing',
  billing_cycle billing_cycle,
  trial_ends_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subscriptions_status  on public.subscriptions (status);
create index idx_subscriptions_expires on public.subscriptions (expires_at);
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.plans         enable row level security;
alter table public.profiles      enable row level security;
alter table public.user_settings enable row level security;
alter table public.subscriptions enable row level security;

-- plans: USER đọc gói đang mở bán; ADMIN toàn quyền
create policy plans_read  on public.plans for select using (is_active or public.is_admin());
create policy plans_admin on public.plans for all    using (public.is_admin()) with check (public.is_admin());

-- profiles: chủ hồ sơ đọc/sửa thông tin; ADMIN đọc.
-- (Đổi role/is_locked chỉ do service_role/ADMIN ở máy chủ — USER không có policy cho việc đó.)
create policy profiles_select on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- user_settings: chủ sở hữu toàn quyền
create policy settings_all on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions: USER chỉ ĐỌC của mình; tạo/sửa do ADMIN/service_role
create policy subs_select on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy subs_admin  on public.subscriptions for all    using (public.is_admin()) with check (public.is_admin());
