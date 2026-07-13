-- ============================================================
-- 0002 — Tự tạo dữ liệu tài khoản khi có user mới đăng ký
-- Khớp docs/plans/GIAI_DOAN_1.md Task 2
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_settings (user_id) values (new.id);
  insert into public.subscriptions (user_id, status, trial_ends_at)
    values (new.id, 'trialing', now() + interval '14 days');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
