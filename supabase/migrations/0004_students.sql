-- ============================================================
-- 0004 — Bảng students (hồ sơ học sinh) + RLS
-- Khớp docs/DATABASE.md §5.2 và docs/plans/GIAI_DOAN_2.md Task 1
-- ============================================================

create type student_status as enum ('active', 'paused', 'inactive');

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  gender text,
  grade_level text,
  subjects text[] not null default '{}',
  phone text,
  email text,
  parent_name text,
  parent_phone text,
  address text,
  default_fee bigint not null default 0,
  fee_type text not null default 'per_session',
  status student_status not null default 'active',
  avatar_url text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_user on public.students (user_id);
create index idx_students_user_status on public.students (user_id, status);
create index idx_students_user_name on public.students (user_id, full_name);

create trigger trg_students_updated before update on public.students
  for each row execute function public.set_updated_at();

-- Row Level Security: chỉ chủ sở hữu (không nhánh admin)
alter table public.students enable row level security;
create policy students_select on public.students for select using (auth.uid() = user_id);
create policy students_insert on public.students for insert with check (auth.uid() = user_id);
create policy students_update on public.students for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy students_delete on public.students for delete using (auth.uid() = user_id);
