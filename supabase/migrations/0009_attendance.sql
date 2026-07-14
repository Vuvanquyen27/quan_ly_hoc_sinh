-- ============================================================
-- 0009 — Bảng attendance (điểm danh & ghi chú sau buổi) + RLS
-- Khớp docs/DATABASE.md §5.3 và docs/superpowers/specs/2026-07-15-4b-diem-danh-design.md
-- ============================================================

create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  homework_done boolean,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_session_student_unique unique (session_id, student_id)
);

create index idx_attendance_user_student on public.attendance (user_id, student_id);
create index idx_attendance_user_session on public.attendance (user_id, session_id);

create trigger trg_attendance_updated before update on public.attendance
  for each row execute function public.set_updated_at();

alter table public.attendance enable row level security;
create policy attendance_select on public.attendance for select using (auth.uid() = user_id);
create policy attendance_insert on public.attendance for insert with check (auth.uid() = user_id);
create policy attendance_update on public.attendance for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy attendance_delete on public.attendance for delete using (auth.uid() = user_id);
