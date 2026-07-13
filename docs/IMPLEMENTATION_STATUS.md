# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-13
**Giai đoạn hiện tại:** Giai đoạn 3 — Bài học & Tài liệu · **3A (Bài học) đã xong**, tiếp theo **3B (Tài liệu + Storage)**
**Nhánh làm việc:** `feat/giao-dien-dscity` (kèm đợt nâng cấp giao diện DSCITY + dark mode)

---

## 1. Tiến độ theo giai đoạn

| GĐ | Tên | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Nền móng dự án | ✅ Xong | Next.js + TS + Tailwind + shadcn/ui, 3 Supabase client, middleware (`proxy.ts`), format `vi-VN` |
| 1 | Xác thực & Hồ sơ | ✅ Xong | Đăng ký/đăng nhập/quên MK, trigger tạo profiles+user_settings+subscriptions, bảo vệ route, gating chỉ-đọc; RLS GĐ1 đạt |
| 2 | Quản lý học sinh | ✅ Xong | CRUD + phân trang + test đơn vị; migration `0004` đã áp; **cách ly RLS students PASS** |
| 3A | Bài học (`lessons`) | ✅ Xong | CRUD + Markdown (sanitize) + phân trang; migration `0005` đã áp; **cách ly RLS lessons PASS** |
| 3B | Tài liệu + Storage | ⏳ Kế tiếp | `documents` + bucket riêng tư + signed URL + đính kèm (spec/plan chưa nở) |
| 4–10 | (Lịch → Phát hành) | ⏳ Chưa | Theo `docs/ROADMAP.md` |

---

## 2. Chi tiết Giai đoạn 3A (đối chiếu `docs/superpowers/plans/2026-07-13-3a-bai-hoc.md`)

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

## 3. Kiểm thử / chất lượng gần nhất (2026-07-13)

| Lệnh | Kết quả |
|---|---|
| `npm test` | ✅ 15 test PASS (format 6 + student 6 + lesson 3) |
| `npm run lint` | ✅ 0 error (10 warning trong `scripts/*.mjs`, vô hại) |
| `npm run build` | ✅ Thành công; 14 route gồm `/bai-hoc`, `/bai-hoc/moi`, `/bai-hoc/[id]`, `/bai-hoc/[id]/sua` |
| Cách ly RLS `students` | ✅ PASS |
| Cách ly RLS `lessons` | ✅ PASS |

---

## 4. Migration đã áp lên DB

| File | Nội dung |
|---|---|
| `0001_accounts_subscriptions.sql` | enums, plans, subscriptions… (GĐ1) |
| `0002_handle_new_user.sql` | trigger tạo profiles/user_settings/subscriptions |
| `0003_profiles_column_guard.sql` | vá cột profiles |
| `0004_students.sql` | bảng students + RLS |
| `0005_lessons.sql` | bảng lessons + RLS |

Áp bằng: `node --env-file=.env.local scripts/run-migration.mjs <file.sql>` (cần `SUPABASE_DB_URL` trong `.env.local`).

---

## 5. Lệnh hiện có

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
node --env-file=.env.local scripts/run-migration.mjs <file.sql>   # áp migration
node --env-file=.env.local scripts/test-rls-students.mjs           # test cách ly
node --env-file=.env.local scripts/test-rls-lessons.mjs
```

---

## 6. Nguyên tắc không được lệch

- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc biến `NEXT_PUBLIC_*`.
- Không tạo bảng dữ liệu khách nếu chưa có `user_id` + RLS.
- Mọi thay đổi schema qua `supabase/migrations/*.sql` (versioned).
- RLS bảng nghiệp vụ **không** có nhánh `is_admin` — ADMIN không đọc dữ liệu USER.
- Test cách ly RLS là tiêu chí **chặn** đóng mỗi giai đoạn có bảng mới.

---

## 7. Bước kế tiếp

1. **(Tùy chọn)** Tạo skill dự án "lát cắt dọc CRUD+RLS" (`writing-skills`) — đã có 2 lần áp dụng (students + lessons).
2. **Giai đoạn 3B** — Tài liệu + Supabase Storage: nở spec/plan → migration `0006_documents.sql` + `0007_storage_documents.sql` (bucket riêng tư, signed URL, đính kèm vào bài học/học sinh).
