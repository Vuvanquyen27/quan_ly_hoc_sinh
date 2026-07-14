-- ============================================================
-- 0006 — Bảng documents (tài liệu: tệp & liên kết) + RLS
-- Khớp docs/DATABASE.md §5.3 và docs/superpowers/specs/2026-07-14-3b-tai-lieu-design.md
-- ============================================================

create type public.document_type as enum ('file', 'link');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  type public.document_type not null,
  storage_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  url text,
  lesson_id uuid references public.lessons(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_user on public.documents (user_id);
create index idx_documents_user_lesson on public.documents (user_id, lesson_id);
create index idx_documents_user_student on public.documents (user_id, student_id);

create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- Row Level Security: chỉ chủ sở hữu (không nhánh admin)
alter table public.documents enable row level security;
create policy documents_select on public.documents for select using (auth.uid() = user_id);
create policy documents_insert on public.documents for insert with check (auth.uid() = user_id);
create policy documents_update on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy documents_delete on public.documents for delete using (auth.uid() = user_id);
