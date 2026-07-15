-- ============================================================
-- 0015 — Storage bucket 'avatars' (public) + policy ghi theo tiền tố user_id/
-- Đọc công khai (ảnh đại diện); cách ly ở chiều ghi.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_write_own"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_update_own"
  on storage.objects for update
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_delete_own"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
