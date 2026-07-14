# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-14
**Giai đoạn hiện tại:** Giai đoạn 3 **đã hoàn tất** (3A Bài học + 3B Tài liệu + Storage); kế tiếp **Giai đoạn 4 — Lịch & Buổi học**
**Nhánh làm việc:** `feat/giao-dien-dscity` (kèm đợt nâng cấp giao diện DSCITY + dark mode)

---

## 1. Tiến độ theo giai đoạn

| GĐ | Tên | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Nền móng dự án | ✅ Xong | Next.js + TS + Tailwind + shadcn/ui, 3 Supabase client, middleware (`proxy.ts`), format `vi-VN` |
| 1 | Xác thực & Hồ sơ | ✅ Xong | Đăng ký/đăng nhập/quên MK, trigger tạo profiles+user_settings+subscriptions, bảo vệ route, gating chỉ-đọc; RLS GĐ1 đạt |
| 2 | Quản lý học sinh | ✅ Xong | CRUD + phân trang + test đơn vị; migration `0004` đã áp; **cách ly RLS students PASS** |
| 3A | Bài học (`lessons`) | ✅ Xong | CRUD + Markdown (sanitize) + phân trang; migration `0005` đã áp; **cách ly RLS lessons PASS** |
| 3B | Tài liệu + Storage | ✅ Xong | migration `0006`/`0007` áp; CRUD tài liệu (file+link) + signed URL + đính kèm bài học/học sinh; **cách ly RLS documents + Storage PASS** |
| 4–10 | (Lịch → Phát hành) | ⏳ Chưa | Theo `docs/ROADMAP.md` |

---

## 2. Chi tiết Giai đoạn 3B (đối chiếu `docs/plans/2026-07-14-3b-tai-lieu.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0006_documents.sql` (bảng + RLS 4 policy + 2 index) | ✅ Áp lên DB | FK `lesson_id`/`student_id` SET NULL khi xóa bài học/học sinh |
| Migration `0007_storage_documents.sql` (bucket riêng tư + policy) | ✅ Áp lên DB | Bucket `documents` private; policy theo tiền tố `user_id/` |
| Validator Zod `lib/validators/document.ts` + test | ✅ Xong | 5 test PASS |
| Storage module `server/documents/storage.ts` (upload/signedUrl/delete) | ✅ Xong | Signed URL phát phía server, không nhận `user_id` từ client |
| Queries `listDocuments`/`getDocument` | ✅ Xong | Phân trang, lọc theo `lesson_id`/`student_id` |
| Actions `saveDocument`/`deleteDocumentAction` | ✅ Xong | Gate `requireWritable`, xóa object Storage khi xóa tài liệu file |
| Nav "Tài liệu" trong sidebar | ✅ Xong | Liên kết `/tai-lieu` |
| Form tài liệu (`document-form.tsx`) | ✅ Xong | Toggle file/link, upload input, đính kèm bài học |
| Trang danh sách `/tai-lieu` | ✅ Xong | Phân trang, responsive bảng/card |
| Trang thêm `/tai-lieu/moi` & sửa `/tai-lieu/[id]/sua` | ✅ Xong | Dùng chung form |
| Tích hợp vào chi tiết bài học (`/bai-hoc/[id]`) | ✅ Xong | Section "Tài liệu đính kèm" với danh sách + nút thêm |
| Tích hợp vào chi tiết học sinh (`/hoc-sinh/[id]`) | ✅ Ghi chú | Placeholder text "Lịch sử buổi học" / "Công nợ" được thay bằng section "Tài liệu liên quan"; các module Lịch/Tài chính đến GĐ4+ |
| Script test cách ly RLS+Storage `scripts/test-rls-documents.mjs` | ✅ PASS | A/B/admin; đọc-ghi chéo; giả mạo `user_id` 403; B không upload vào tiền tố A; signed URL cách ly |

---

## 3. Chi tiết Giai đoạn 3A (đối chiếu `docs/superpowers/plans/2026-07-13-3a-bai-hoc.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0005_lessons.sql` (bảng + RLS 4 policy + 2 index + trigger + CHECK status) | ✅ Áp lên DB | |
| Validator Zod `lib/validators/lesson.ts` + test | ✅ Xong | 3 test PASS |
| Queries `listLessons`/`getLesson` | ✅ Xong | Phân trang (`range`+`count`, `LESSONS_PAGE_SIZE=20`), sắp theo `updated_at` |
| Actions `saveLesson`/`archiveLessonAction` | ✅ Xong | Gate `requireWritable`, không nhận `user_id` từ client |
| Component `Markdown` (react-markdown + remark-gfm + rehype-sanitize) | ✅ Xong | Sanitize HTML nguy hiểm |
| UI danh sách / form thêm-sửa / chi tiết + nav "Bài học" | ✅ Xong | Token semantic + responsive bảng/card |
| Script test cách ly RLS `scripts/test-rls-lessons.mjs` | ✅ PASS | A/B/admin, đọc-ghi chéo, giả mạo `user_id` 403, admin không đọc |

---

## 4. Kiểm thử / chất lượng gần nhất (2026-07-14)

| Lệnh | Kết quả |
|---|---|
| `npm test` | ✅ 20 test PASS (format 6 + student 6 + lesson 3 + document 5) — 4 file test |
| `npm run lint` | ✅ 0 error (18 warning trong `scripts/*.mjs`, vô hại, pre-existing) |
| `npm run build` | ✅ Thành công; 17 route gồm `/tai-lieu`, `/tai-lieu/moi`, `/tai-lieu/[id]/sua`, `/bai-hoc`, `/hoc-sinh`… |
| Cách ly RLS `students` | ✅ PASS |
| Cách ly RLS `lessons` | ✅ PASS |
| Cách ly RLS+Storage `documents` | ✅ PASS (10 kiểm tra: đọc-ghi chéo, giả mạo user_id 403, upload/đọc tệp cách ly) |

---

## 5. Migration đã áp lên DB

| File | Nội dung |
|---|---|
| `0001_accounts_subscriptions.sql` | enums, plans, subscriptions… (GĐ1) |
| `0002_handle_new_user.sql` | trigger tạo profiles/user_settings/subscriptions |
| `0003_profiles_column_guard.sql` | vá cột profiles |
| `0004_students.sql` | bảng students + RLS |
| `0005_lessons.sql` | bảng lessons + RLS |
| `0006_documents.sql` | bảng documents + RLS 4 policy + 2 index; FK `lesson_id`/`student_id` SET NULL khi xóa |
| `0007_storage_documents.sql` | bucket `documents` riêng tư + Storage policy theo tiền tố `user_id/` |

Áp bằng: `node --env-file=.env.local scripts/run-migration.mjs <file.sql>` (cần `SUPABASE_DB_URL` trong `.env.local`).

---

## 6. Lệnh hiện có

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
node --env-file=.env.local scripts/run-migration.mjs <file.sql>      # áp migration
node --env-file=.env.local scripts/test-rls-students.mjs             # test cách ly students
node --env-file=.env.local scripts/test-rls-lessons.mjs              # test cách ly lessons
node --env-file=.env.local scripts/test-rls-documents.mjs            # test cách ly documents + Storage
```

---

## 7. Nguyên tắc không được lệch

- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc biến `NEXT_PUBLIC_*`.
- Không tạo bảng dữ liệu khách nếu chưa có `user_id` + RLS.
- Mọi thay đổi schema qua `supabase/migrations/*.sql` (versioned).
- RLS bảng nghiệp vụ **không** có nhánh `is_admin` — ADMIN không đọc dữ liệu USER.
- Test cách ly RLS là tiêu chí **chặn** đóng mỗi giai đoạn có bảng mới.

---

## 8. Bước kế tiếp

1. **(Tùy chọn)** Tạo/cập nhật skill dự án "lát cắt dọc CRUD+RLS" (`writing-skills`) — đã áp dụng 3 lần (students, lessons, documents).
2. **Giai đoạn 4** — Lịch & Buổi học: spec/plan → migration `sessions` + `schedules` + RLS + giao diện lịch dạy + điểm danh.
