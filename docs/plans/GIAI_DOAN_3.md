# Giai đoạn 3 — Bài học & Tài liệu · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** Thư viện bài học của USER + quản lý tài liệu dạng **tệp (Supabase Storage)** và **liên kết ngoài**, gắn được vào bài học/học sinh.

**Architecture:** Dùng lại **khuôn mẫu CRUD+RLS của Giai đoạn 2** cho `lessons` và `documents`; bổ sung Storage bucket riêng tư + signed URL.

**Tech Stack:** Next.js, Supabase Postgres/RLS/Storage, `@supabase/ssr`, Zod, shadcn/ui.

## Global Constraints
- `user_id NOT NULL DEFAULT auth.uid()` + RLS `auth.uid()=user_id` (không nhánh admin).
- Tệp Storage tiền tố `user_id/`; tải qua **signed URL** phát ở server. Tiếng Việt. TDD + commit.

**Phụ thuộc:** Giai đoạn 2 (khuôn mẫu CRUD + `students`).

---

### Task 1: Migration `lessons` + `documents` + RLS
**Files:** Create `supabase/migrations/0004_lessons_documents.sql`
- [ ] **Step 1:** Tạo `lessons`, `documents` (+ enum `document_type`) theo `DATABASE.md §5.2, §5.3`; FK `documents.lesson_id/student_id` `on delete set null`; chỉ mục `(user_id)`, `(user_id, subject)`, `(user_id, lesson_id)`, `(user_id, student_id)`.
- [ ] **Step 2:** RLS 4 policy cho mỗi bảng (copy khuôn mẫu GĐ2, đổi tên bảng).
- [ ] **Step 3:** Trigger `set_updated_at` cho 2 bảng.
- [ ] **Step 4:** `supabase db push` → ok. **Commit** `feat(db): lessons + documents + RLS`.

### Task 2: Storage bucket `documents` + chính sách
**Files:** Create `supabase/migrations/0005_storage_documents.sql`
- [ ] **Step 1:** Tạo bucket riêng tư `documents` (không public).
- [ ] **Step 2:** 4 policy trên `storage.objects` theo `DATABASE.md §10` (so khớp `(storage.foldername(name))[1] = auth.uid()::text`).
- [ ] **Step 3:** Áp & kiểm thử tay (upload thử bằng 2 user, A không thấy tệp của B). **Commit** `feat(storage): bucket documents + chính sách cách ly`.

### Task 3: Bài học — CRUD (theo khuôn mẫu GĐ2)
**Files:** `lib/validators/lesson.ts`, `server/lessons/actions.ts`, `app/(app)/bai-hoc/**`, `components/lessons/*`
- [ ] **Step 1:** Validator Zod (title bắt buộc; tags mảng; content Markdown).
- [ ] **Step 2:** Actions `createLesson/updateLesson/archiveLesson/listLessons` (lấy `user_id` từ phiên).
- [ ] **Step 3:** UI danh sách (lọc theo môn/khối) + form + trang chi tiết (render Markdown an toàn).
- [ ] **Step 4:** **Commit** `feat(lessons): CRUD bài học`.

### Task 4: Tài liệu — tệp (upload) & liên kết ngoài
**Files:** `lib/validators/document.ts`, `server/documents/actions.ts`, `app/(app)/tai-lieu/**`, `components/documents/*`
- [ ] **Step 1:** Validator: `type` ∈ {file, link}; nếu `link` cần `url` hợp lệ; nếu `file` cần metadata.
- [ ] **Step 2:** Action upload: nhận tệp ở server action → upload vào `documents/{user_id}/{doc_id}/{filename}` → lưu bản ghi `documents`; giới hạn kích thước cơ bản.
- [ ] **Step 3:** Action tạo signed URL để xem/tải (hết hạn ngắn).
- [ ] **Step 4:** UI: tải lên tệp / dán liên kết; gắn `lesson_id`/`student_id` (tùy chọn); danh sách + xem.
- [ ] **Step 5:** **Commit** `feat(documents): tệp Storage + liên kết ngoài`.

### Task 5: Gắn tài liệu vào bài học/học sinh
- [ ] **Step 1:** Trong trang chi tiết bài học & học sinh, hiển thị danh sách tài liệu liên quan; nút "Đính kèm".
- [ ] **Step 2:** Xóa bài học đặt `documents.lesson_id = NULL` (không mất tài liệu) — xác minh bằng test tay. **Commit** `feat(documents): gắn vào bài học/học sinh`.

### Task 6: Kiểm thử cách ly (RLS + Storage)
- [ ] A không đọc/ghi `lessons`/`documents` của B; giả mạo `user_id` bị chặn.
- [ ] A không tải được tệp trong tiền tố `B/`; ADMIN không đọc `lessons`/`documents`.
- [ ] **Commit** `test(rls): lessons/documents + Storage`.

## DoD (đối chiếu ROADMAP §GĐ3)
- [ ] Tạo/sửa bài học; đính kèm tài liệu (tệp & link).
- [ ] Upload/đọc tệp chỉ trong tiền tố của mình; A không đọc tệp của B.
- [ ] Xóa bài học → `documents.lesson_id = NULL`.

## Self-review
- Tái dùng khuôn mẫu GĐ2 (không lặp boilerplate). Khớp `DATABASE.md §5.2/§5.3/§10`. Không placeholder.
