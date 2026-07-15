-- ============================================================
-- 0014 — Thông báo in-app: notifications + RLS
-- Khớp docs/DATABASE.md §5.5 và specs/2026-07-15-8-cai-dat-thong-bao-design.md
-- ============================================================

create type public.notification_type as enum ('session_reminder','payment_due','system');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_read on public.notifications (user_id, is_read);
create index idx_notifications_user_created on public.notifications (user_id, created_at);

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select using (auth.uid() = user_id);
create policy notifications_insert on public.notifications for insert with check (auth.uid() = user_id);
create policy notifications_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete on public.notifications for delete using (auth.uid() = user_id);
