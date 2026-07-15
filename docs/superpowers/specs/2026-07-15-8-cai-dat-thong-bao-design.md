# Giai đoạn 8 — Cài đặt & Thông báo · Design

**Ngày:** 2026-07-15 · **Nhánh (dự kiến):** `feat/gd8-cai-dat`
**Trạng thái:** Đã chốt hướng (người dùng duyệt: thông báo qua **nút "Tạo nhắc nhở"** thủ công; cài đặt **lưu trước, hiển thị cố định VN** cho MVP)
**Nguồn chân lý:** `docs/DATABASE.md §5.1, §5.5, §10` · `docs/ROADMAP.md §GĐ8`
**Tiền đề:** GĐ1 (`profiles`/`user_settings`), GĐ4 (`v_upcoming_sessions` — GĐ7), GĐ6 (`listUpcomingDue`).

---

## 1. Mục tiêu & Phạm vi

USER chỉnh **hồ sơ** (tên/SĐT/ảnh) và **tùy chọn** (tiền tệ/múi giờ/định dạng ngày/thời lượng buổi/nhắc); xem **gói** (chỉ đọc). **Thông báo in-app**: bảng `notifications` + hiển thị + đánh dấu đã đọc + sinh nhắc nhở thủ công.

**Trong phạm vi:**
- Migration `0014_notifications.sql` (enum `notification_type` + bảng + RLS + index) và `0015_storage_avatars.sql` (bucket `avatars` public + policy ghi theo tiền tố).
- Server `server/settings/*` + `server/notifications/*`.
- Trang `/cai-dat` (hồ sơ + tùy chọn + gói chỉ đọc); trang `/thong-bao`; **chuông** + link Cài đặt ở header.
- Upload ảnh đại diện qua Storage (cách ly chiều ghi theo `user_id`).

**Ngoài phạm vi (P1/sau):**
- **Cron tự sinh** thông báo (Vercel Cron/Supabase scheduled) — MVP dùng nút "Tạo nhắc nhở".
- Email/Zalo/push.
- **Áp hiển thị** theo `currency`/`timezone`/`date_format` — MVP cố định `vi-VN`/VND/`Asia/Ho_Chi_Minh` (CLAUDE.md §6); prefs được lưu, hướng tới i18n sau. **Prefs nhắc** (`notify_*`) **có hiệu lực ngay** (gate sinh nhắc).
- Siết RLS cột `profiles` (chặn USER đổi `role`/`is_locked` trực tiếp) → GĐ9/10 (xem §7 ghi chú bảo mật).

## 2. Quyết định thiết kế

| Vấn đề | Chọn | Lý do |
|---|---|---|
| **Migration** | `0014_notifications.sql` + `0015_storage_avatars.sql` | 0013 đã dùng; tách Storage như `documents` (0007). |
| **`notification_type`** | `session_reminder` / `payment_due` / `system` | Đủ cho nhắc buổi + nhắc học phí + thông báo chung. |
| **Sinh thông báo** | **Server action `generateReminders`** (nút "Tạo nhắc nhở"), dedup theo `(type, entity_id)`, gate bởi `notify_*` | Người dùng chọn; trung thực MVP không cron; giữ read/write tách bạch. |
| **Bucket avatar** | **public** `avatars`; ghi/sửa/xóa theo tiền tố `user_id/`; đọc công khai | Ảnh đại diện ít nhạy cảm; `<img>` dùng URL công khai ổn định (không lo signed URL hết hạn); cách ly ở **chiều ghi**. |
| **Cập nhật hồ sơ** | Action **chỉ ghi** `full_name`/`phone`/`avatar_url` (whitelist) | RLS `profiles_update` cho sửa mọi cột hàng mình → không tin, whitelist ở server. |
| **Áp cài đặt** | Lưu vào `user_settings`; hiển thị VN cố định MVP | Người dùng chọn; tránh refactor format toàn app cho MVP một-ngôn-ngữ. |
| **Vị trí UI** | Chuông + menu Cài đặt ở **header** (`app/(app)` layout) | Bottom-nav đã 7 mục. |

## 3. Schema

**`0014_notifications.sql`:**
```sql
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
```
(Không `updated_at` → không trigger `set_updated_at`.)

**`0015_storage_avatars.sql`:** bucket `avatars` public + 3 policy ghi/sửa/xóa theo tiền tố `user_id/` (đọc công khai không cần policy).
```sql
insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict (id) do nothing;
create policy "avatars_write_own" on storage.objects for insert
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "avatars_update_own" on storage.objects for update
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "avatars_delete_own" on storage.objects for delete
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
```

## 4. Server

**`server/settings/`** (read: `queries.ts`; write: `actions.ts` `'use server'`):
- `getSettings()` → `{ profile: {full_name,email,phone,avatar_url}, settings: user_settings, subscription }`.
- `updateProfile(formData)` → cập nhật **chỉ** `full_name`/`phone` (whitelist); gate `requireWritable`.
- `updateSettings(formData)` → cập nhật `user_settings` (currency/timezone/date_format/default_session_duration_min/notify_session_reminder/notify_payment_due); gate `requireWritable`.
- `uploadAvatar(formData)` → validate ảnh (type/size), upload `avatars/{uid}/avatar.<ext>` qua server client (RLS theo tiền tố), set `profiles.avatar_url = publicUrl`; gate `requireWritable`.

**`server/notifications/`** (read: `queries.ts`; write: `actions.ts`):
- `listNotifications({page?})` + `unreadCount()`.
- `markRead(id)` / `markAllRead()` / `deleteNotification(id)`.
- `generateReminders()` → nếu `notify_session_reminder`: đọc `v_upcoming_sessions`, tạo `session_reminder` (title "Buổi sắp tới", entity `session`); nếu `notify_payment_due`: đọc `listUpcomingDue().overdue`, tạo `payment_due` (entity `invoice`/`payable`). **Dedup:** truy vấn `notifications` đã có theo `(type, entity_id)`, chỉ chèn cái mới. Trả số đã tạo.

## 5. Giao diện

- `app/(app)/cai-dat/page.tsx`: 3 khối — **Hồ sơ** (form tên/SĐT + `AvatarUpload`), **Tùy chọn** (form user_settings; ghi chú "hiển thị VN cố định ở bản này"), **Gói** (chỉ đọc: trạng thái/hạn).
- `components/settings/avatar-upload.tsx` (client): input file + preview + submit `uploadAvatar`.
- `app/(app)/thong-bao/page.tsx`: nút "Tạo nhắc nhở" (`generateReminders`) + "Đọc hết" (`markAllRead`); danh sách (chưa đọc đậm), mỗi mục link tới entity + nút đánh dấu đã đọc/xóa.
- Header (`app/(app)/layout.tsx` hoặc component): **chuông** hiện `unreadCount` → `/thong-bao`; link/menu **Cài đặt** → `/cai-dat` (kèm avatar nếu có).
- Semantic token; `formatVND`/`formatDate` (VN).

## 6. Kiểm thử — release blocker

- `scripts/test-rls-notifications.mjs`: cách ly `notifications` (A/B/admin; giả mạo `user_id` 403; admin không đọc; B không cập nhật/xóa của A) **và** cách ly Storage `avatars` (B **không** upload vào tiền tố `avatars/{A}`; A upload/đọc được của mình).
- Nghiệp vụ: `generateReminders` tạo đúng loại theo prefs + **không nhân đôi** khi gọi lại; `markRead`/`markAllRead` đổi `is_read`.
- Đóng GĐ: `tsc && npm test && npm run lint && npm run build` xanh; không hồi quy.

## 7. Ghi chú bảo mật (chuyển GĐ9/10)
- RLS `profiles_update` hiện cho USER sửa mọi cột hàng mình → USER có thể `PATCH profiles {is_locked:false}` qua PostgREST, tự bỏ gating chỉ-đọc. `role` vô hại (admin đọc từ JWT `app_metadata`). **Đề xuất siết:** trigger/`WITH CHECK` chặn đổi `role`/`is_locked` trừ `service_role`. GĐ8 tự bảo vệ bằng whitelist cột ở server; ghi nhận việc siết RLS cho GĐ9/10.

## 8. DoD (đối chiếu ROADMAP §GĐ8)
- [ ] Đổi cài đặt lưu vào `user_settings` (prefs nhắc áp dụng ngay).
- [ ] Upload ảnh đại diện qua Storage (cách ly ghi theo `user_id`).
- [ ] Thông báo in-app hiển thị, đánh dấu đã đọc; RLS test `notifications` PASS.

## 9. Tài liệu liên quan
- `docs/DATABASE.md §5.1/§5.5/§10` · `docs/ROADMAP.md §GĐ8` · spec GĐ7 (mẫu) · `docs/IMPLEMENTATION_STATUS.md`.
