# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-13
**Giai đoạn hiện tại:** Giai đoạn 2 — Quản lý học sinh (đang chốt DoD)
**Mục tiêu gần nhất:** áp migration `0004_students.sql` lên Supabase DB rồi chạy test cách ly RLS → đóng Giai đoạn 2.

---

## 1. Tiến độ theo giai đoạn

| GĐ | Tên | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Nền móng dự án | ✅ Xong | Next.js + TS + Tailwind + shadcn/ui, 3 Supabase client, middleware (`proxy.ts`), format `vi-VN`, `.env.local` có credential thật |
| 1 | Xác thực & Hồ sơ | ✅ Xong | Đăng ký/đăng nhập/quên MK, trigger tạo profiles+user_settings+subscriptions, bảo vệ route, gating chỉ-đọc; RLS GĐ1 đã vá 2 lỗ hổng và đạt |
| 2 | Quản lý học sinh | 🟡 Gần xong | Code + test đơn vị + phân trang xong; **chờ áp migration + test RLS** |
| 3–10 | (Bài học → Phát hành) | ⏳ Chưa | Theo `docs/ROADMAP.md` |

---

## 2. Chi tiết Giai đoạn 2 (đối chiếu `docs/plans/GIAI_DOAN_2.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0004_students.sql` (bảng + RLS 4 policy + 3 index + trigger updated_at) | ✅ Viết & commit | **Chưa áp lên DB** |
| Validator Zod `lib/validators/student.ts` | ✅ Xong | full_name bắt buộc, fee ≥ 0 số nguyên, enum status/feeType |
| Test đơn vị validator `lib/validators/student.test.ts` | ✅ Xong | 6 test PASS (thêm ngày 2026-07-13) |
| Server actions `saveStudent`/`archiveStudentAction` | ✅ Xong | Gate `requireWritable`, không nhận `user_id` từ client (DB default `auth.uid()`) |
| Queries `listStudents`/`getStudent` | ✅ Xong | **Đã thêm phân trang** (`range`, `count`, `STUDENTS_PAGE_SIZE=20`) |
| UI danh sách / form thêm-sửa / chi tiết / lưu trữ | ✅ Xong | Responsive; danh sách có điều hướng Trước/Sau |
| Script test cách ly RLS `scripts/test-rls-students.mjs` | ✅ Viết xong | Chạy: `node --env-file=.env.local scripts/test-rls-students.mjs` |
| **Áp migration lên Supabase DB** | ❌ **Blocker** | Cần `SUPABASE_DB_URL` hợp lệ trong `.env.local` (host+mật khẩu DB thật) |
| **Chạy test cách ly RLS đạt** | ⏳ Chờ | Phụ thuộc bước áp migration |

---

## 3. Blocker duy nhất hiện tại

- `scripts/run-migration.mjs` cần biến `SUPABASE_DB_URL` (chuỗi kết nối Postgres kèm mật khẩu DB).
- Giá trị hiện tại trong `.env.local` **còn placeholder** (`<host>` / `<...>`) → `pg` báo *Invalid URL*.
- Host DB đúng (suy từ project ref): `db.cvxxkxobtnqomesnfzqk.supabase.co:5432`.
- Cần người dùng dán mật khẩu DB thật (Supabase → Settings → Database). Nếu mạng chỉ IPv4 → dùng chuỗi **Session pooler**.

**Sau khi có DB URL hợp lệ, còn đúng 2 lệnh để đóng GĐ2:**
```bash
node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0004_students.sql
node --env-file=.env.local scripts/test-rls-students.mjs
```

---

## 4. Kiểm thử / chất lượng gần nhất (2026-07-13)

| Lệnh | Kết quả |
|---|---|
| `npm test` | ✅ 12 test PASS (format 6 + student validator 6) |
| `npm run lint` | ✅ 0 error (6 warning trong `scripts/*.mjs`, vô hại) |
| `npm run build` | ✅ Thành công, TypeScript OK, 10 route |
| Quét `service_role` trong bundle client | ✅ Sạch (GĐ0) |

---

## 5. Lệnh hiện có

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
# Áp một migration lên DB (cần SUPABASE_DB_URL):
node --env-file=.env.local scripts/run-migration.mjs <file.sql>
```

---

## 6. Nguyên tắc không được lệch

- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc biến `NEXT_PUBLIC_*`.
- Không tạo bảng dữ liệu khách nếu chưa có `user_id` + RLS.
- Mọi thay đổi schema qua `supabase/migrations/*.sql` (versioned).
- RLS bảng nghiệp vụ **không** có nhánh `is_admin` — ADMIN không đọc dữ liệu USER.
- Test cách ly RLS là tiêu chí **chặn** đóng mỗi giai đoạn có bảng mới.

---

## 7. Bước kế tiếp sau GĐ2

Giai đoạn 3 — Bài học & Tài liệu (`lessons`, `documents` + Storage bucket riêng tư theo tiền tố `user_id/`). Lặp lại pattern 6-task của GĐ2.
