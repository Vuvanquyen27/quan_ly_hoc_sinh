-- ============================================================
-- 0008 — Bảng sessions (buổi học / lịch dạy) + RLS
-- Khớp docs/DATABASE.md §5.3 và docs/superpowers/specs/2026-07-14-4a-buoi-hoc-design.md
-- ============================================================

create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.session_mode as enum ('online', 'offline');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  mode public.session_mode not null default 'offline',
  location text,
  status public.session_status not null default 'scheduled',
  fee_amount bigint not null default 0 check (fee_amount >= 0),
  is_billed boolean not null default false,
  cancel_reason text,
  recurrence_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_time_valid check (end_time > start_time)
);

create index idx_sessions_user_start on public.sessions (user_id, start_time);
create index idx_sessions_user_status on public.sessions (user_id, status);
create index idx_sessions_user_student on public.sessions (user_id, student_id);

create trigger trg_sessions_updated before update on public.sessions
  for each row execute function public.set_updated_at();

alter table public.sessions enable row level security;
create policy sessions_select on public.sessions for select using (auth.uid() = user_id);
create policy sessions_insert on public.sessions for insert with check (auth.uid() = user_id);
create policy sessions_update on public.sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sessions_delete on public.sessions for delete using (auth.uid() = user_id);
