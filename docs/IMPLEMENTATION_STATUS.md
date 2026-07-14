# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-15
**Giai đoạn hiện tại:** Giai đoạn 4B **đã hoàn tất** (Điểm danh — attendance); kế tiếp **Giai đoạn 5 — Tài chính: Khoản phải thu & Thu học phí**
**Nhánh làm việc:** `feat/gd4b-diem-danh`

---

## 1. Tiến độ theo giai đoạn

| GĐ | Tên | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Nền móng dự án | ✅ Xong | Next.js + TS + Tailwind + shadcn/ui, 3 Supabase client, middleware (`proxy.ts`), format `vi-VN` |
| 1 | Xác thực & Hồ sơ | ✅ Xong | Đăng ký/đăng nhập/quên MK, trigger tạo profiles+user_settings+subscriptions, bảo vệ route, gating chỉ-đọc; RLS GĐ1 đạt |
| 2 | Quản lý học sinh | ✅ Xong | CRUD + phân trang + test đơn vị; migration `0004` đã áp; **cách ly RLS students PASS** |
| 3A | Bài học (`lessons`) | ✅ Xong | CRUD + Markdown (sanitize) + phân trang; migration `0005` đã áp; **cách ly RLS lessons PASS** |
| 3B | Tài liệu + Storage | ✅ Xong | migration `0006`/`0007` áp; CRUD tài liệu (file+link) + signed URL + đính kèm bài học/học sinh; **cách ly RLS documents + Storage PASS** |
| 4A | Lịch & Buổi học | ✅ Xong | migration `0008` áp; RLS sessions PASS; lịch Danh sách/Ngày/Tuần; tạo/sửa buổi; chuyển trạng thái scheduled→completed/cancelled |
| 4B | Điểm danh (`attendance`) | ✅ Xong | migration `0009` áp; RLS attendance PASS; upsert điểm danh trong trang sửa buổi; lịch sử trong chi tiết học sinh |
| 5–10 | (Tài chính → Phát hành) | ⏳ Chưa | Theo `docs/ROADMAP.md` |

---

## 2. Chi tiết Giai đoạn 3B (đối chiếu `docs/superpowers/plans/2026-07-14-3b-tai-lieu.md`)

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

## 3. Chi tiết Giai đoạn 4A (đối chiếu `docs/superpowers/plans/2026-07-14-4a-buoi-hoc.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0008_sessions.sql` (bảng + RLS 4 policy + index) | ✅ Áp lên DB | FK `student_id` → students CASCADE; status CHECK |
| `lib/datetime.ts` + test | ✅ Xong | Hàm tiện ích thời gian `Asia/Ho_Chi_Minh`, tái sử dụng `lib/format.ts` |
| Validator Zod `lib/validators/session.ts` + test | ✅ Xong | Validate startTime < endTime, status, format, học phí |
| Queries `server/sessions/queries.ts` (`listSessions`/`getSession`) | ✅ Xong | Lọc theo ngày/tuần, JOIN student name |
| Actions `server/sessions/actions.ts` (`saveSession`/`changeSessionStatus`) | ✅ Xong | Gate `requireWritable`; không nhận `user_id` từ client |
| Nav "Lịch dạy" trong sidebar | ✅ Xong | Liên kết `/lich-day` |
| Component `session-form.tsx` (form tạo/sửa buổi) | ✅ Xong | Chọn học sinh, giờ, hình thức, học phí tự điền từ `default_fee` |
| Component `session-card.tsx` + `calendar-view.tsx` (lịch Danh sách/Ngày/Tuần) | ✅ Xong | Điều hướng tiến/lùi, hiển thị đúng `Asia/Ho_Chi_Minh`; gợi ý hoàn thành buổi quá giờ |
| Trang `/lich-day` (danh sách + lịch) | ✅ Xong | Tab chế độ xem; phân trang |
| Trang `/lich-day/moi` & `/lich-day/[id]/sua` | ✅ Xong | Dùng chung form; sửa có nút đổi trạng thái |
| Script test cách ly RLS `scripts/test-rls-sessions.mjs` | ✅ PASS | A/B/admin; đọc-ghi chéo; giả mạo `user_id` 403; admin không đọc |

**Giai đoạn 4B — Điểm danh (`attendance`)** (đối chiếu `docs/superpowers/plans/2026-07-15-4b-diem-danh.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0009_attendance.sql` (enum `attendance_status` + bảng + RLS 4 policy + 2 index + trigger) | ✅ Áp lên DB | FK `session_id`/`student_id` CASCADE; `UNIQUE(session_id, student_id)` |
| Validator Zod `lib/validators/attendance.ts` + test | ✅ Xong | 4 test PASS |
| Queries `getAttendanceForSession`/`listAttendanceForStudent` | ✅ Xong | JOIN buổi để hiển thị lịch sử; sắp theo giờ buổi giảm dần |
| Action `saveAttendance` (upsert) | ✅ Xong | Gate `requireWritable`; không nhận `user_id`; chặn buổi đã hủy; `onConflict: session_id,student_id` |
| Form `components/attendance/attendance-form.tsx` gắn trang sửa buổi | ✅ Xong | status / bài tập (tri-state) / nhận xét; ẩn khi buổi đã hủy |
| Lịch sử điểm danh trong chi tiết học sinh (`/hoc-sinh/[id]`) | ✅ Xong | Section "Lịch sử buổi học & điểm danh"; hiển thị giờ `Asia/Ho_Chi_Minh` |
| Script test cách ly RLS `scripts/test-rls-attendance.mjs` | ✅ PASS | A/B/admin; đọc-ghi chéo; giả mạo `user_id` 403; admin không đọc |

---

## 4. Chi tiết Giai đoạn 3A (đối chiếu `docs/superpowers/plans/2026-07-13-3a-bai-hoc.md`)

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

## 5. Kiểm thử / chất lượng gần nhất (2026-07-15, sau GĐ4B)

| Lệnh | Kết quả |
|---|---|
| `npm test` | ✅ 33 test PASS (format 6 + student 6 + lesson 3 + document 5 + datetime + session + **attendance 4**) — 7 file test |
| `npm run lint` | ✅ 0 error (28 warning trong `scripts/*.mjs`, `server/sessions/queries.ts`, `server/attendance/queries.ts`, vô hại, pre-existing) |
| `npm run build` | ✅ Thành công; route gồm `/lich-day/[id]/sua` (kèm điểm danh), `/hoc-sinh/[id]` (kèm lịch sử), … |
| Cách ly RLS `students` | ✅ PASS |
| Cách ly RLS `lessons` | ✅ PASS |
| Cách ly RLS+Storage `documents` | ✅ PASS |
| Cách ly RLS `sessions` | ✅ PASS |
| Cách ly RLS `attendance` | ✅ PASS (6 kiểm tra: tạo, đọc chính, đọc-chéo bị chặn, giả mạo user_id 403, admin không đọc) |

---

## 6. Migration đã áp lên DB

| File | Nội dung |
|---|---|
| `0001_accounts_subscriptions.sql` | enums, plans, subscriptions… (GĐ1) |
| `0002_handle_new_user.sql` | trigger tạo profiles/user_settings/subscriptions |
| `0003_profiles_column_guard.sql` | vá cột profiles |
| `0004_students.sql` | bảng students + RLS |
| `0005_lessons.sql` | bảng lessons + RLS |
| `0006_documents.sql` | bảng documents + RLS 4 policy + 2 index; FK `lesson_id`/`student_id` SET NULL khi xóa |
| `0007_storage_documents.sql` | bucket `documents` riêng tư + Storage policy theo tiền tố `user_id/` |
| `0008_sessions.sql` | bảng `sessions` + RLS 4 policy + index; FK `student_id` → students |
| `0009_attendance.sql` | enum `attendance_status` + bảng `attendance` + RLS 4 policy + 2 index + trigger; `UNIQUE(session_id, student_id)`; FK CASCADE |

Áp bằng: `node --env-file=.env.local scripts/run-migration.mjs <file.sql>` (cần `SUPABASE_DB_URL` trong `.env.local`).

---

## 7. Lệnh hiện có

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
node --env-file=.env.local scripts/test-rls-sessions.mjs             # test cách ly sessions
node --env-file=.env.local scripts/test-rls-attendance.mjs           # test cách ly attendance
```

---

## 8. Nguyên tắc không được lệch

- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc biến `NEXT_PUBLIC_*`.
- Không tạo bảng dữ liệu khách nếu chưa có `user_id` + RLS.
- Mọi thay đổi schema qua `supabase/migrations/*.sql` (versioned).
- RLS bảng nghiệp vụ **không** có nhánh `is_admin` — ADMIN không đọc dữ liệu USER.
- Test cách ly RLS là tiêu chí **chặn** đóng mỗi giai đoạn có bảng mới.

---

## 9. Bước kế tiếp

1. **Giai đoạn 5 — Tài chính: Khoản phải thu & Thu học phí**: bảng `categories`/`invoices`/`invoice_items`/`transactions` + RLS; trigger cập nhật `invoices.amount_paid`/`status` từ `transactions`; tổng hợp hóa đơn tự động từ buổi đã hoàn thành (đặt `sessions.is_billed`); UI hóa đơn + ghi thanh toán; test cách ly RLS.
2. **(Tùy chọn)** Trước GĐ5: cân nhắc merge `feat/gd4b-diem-danh` vào `main`.
