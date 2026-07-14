-- ============================================================
-- 0007 — Storage bucket 'documents' (riêng tư) + chính sách cách ly
-- Khớp docs/DATABASE.md §10
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_read_own"
  on storage.objects for select
  using ( bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "documents_write_own"
  on storage.objects for insert
  with check ( bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "documents_update_own"
  on storage.objects for update
  using ( bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "documents_delete_own"
  on storage.objects for delete
  using ( bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text );
