-- ============================================================
-- 0005 — Bảng lessons (thư viện bài học) + RLS
-- Khớp docs/DATABASE.md §5.2 và docs/superpowers/specs/2026-07-13-3a-bai-hoc-design.md
-- ============================================================

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  grade_level text,
  description text,
  content text,
  tags text[] not null default '{}',
  order_index int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lessons_user on public.lessons (user_id);
create index idx_lessons_user_subject on public.lessons (user_id, subject);

create trigger trg_lessons_updated before update on public.lessons
  for each row execute function public.set_updated_at();

-- Row Level Security: chỉ chủ sở hữu (không nhánh admin)
alter table public.lessons enable row level security;
create policy lessons_select on public.lessons for select using (auth.uid() = user_id);
create policy lessons_insert on public.lessons for insert with check (auth.uid() = user_id);
create policy lessons_update on public.lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lessons_delete on public.lessons for delete using (auth.uid() = user_id);
