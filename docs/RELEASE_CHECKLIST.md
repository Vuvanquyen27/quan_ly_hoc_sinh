# RELEASE CHECKLIST — Đưa EduFlow tới "giáo viên dùng thật"

**Cập nhật:** 2026-07-17 · **Trạng thái xuất phát:** GĐ9 (ADMIN) code xong; migration `0016` **chưa áp**; GĐ10 **chưa làm**.

**Chú thích cột "Ai":** 👤 Bạn (cần quyền Supabase/Vercel/domain/pháp lý) · 🤖 Claude làm được (code) · 🤝 Cùng làm
**🚫 = release blocker** (không đạt thì KHÔNG phát hành). Nguồn chuẩn: `docs/plans/GIAI_DOAN_10.md`, `docs/PERMISSIONS.md §8`, `CLAUDE.md §5`.

---

## 0. Điều kiện tiên quyết — Môi trường

- [ ] 👤 Có **Supabase project** thật; điền `.env.local` từ `.env.example` (URL, anon key, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`).
- [ ] 👤 Có **tài khoản Vercel** nối với repo GitHub `Vuvanquyen27/quan_ly_hoc_sinh`.
- [ ] 👤 Xác nhận biến bí mật **không** có tiền tố `NEXT_PUBLIC_` (chỉ `SUPABASE_SERVICE_ROLE_KEY` là bí mật).
- [ ] 🤝 `npm install && npm run build && npm test && npm run lint` xanh trên máy bạn.

## 1. Đóng Giai đoạn 9 (ADMIN) — trên Supabase thật

- [ ] 🚫 👤 Áp migration: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0016_admin_subscriptions.sql`
- [ ] 🚫 👤 Chạy test cách ly admin XANH: `node --env-file=.env.local scripts/test-rls-admin.mjs`
- [ ] 👤 Seed gói: `node --env-file=.env.local scripts/seed-plans.mjs`
- [ ] 👤 Cấp admin đầu tiên: `node --env-file=.env.local scripts/set-admin.mjs <email-của-bạn>` → đăng xuất/đăng nhập lại.
- [ ] 🤝 Smoke test khu admin: `/admin` (thống kê) → tạo/sửa gói → vào 1 tài khoản → kích hoạt/gia hạn/khóa/mở → xem `/admin/nhat-ky` (audit đủ dòng).

## 2. 🚫 Kiểm thử phân quyền toàn diện (GĐ10 Task 1) — CỔNG CHẶN PHÁT HÀNH

Mục tiêu **0 rò rỉ dữ liệu chéo** (PERMISSIONS §8). Chạy TẤT CẢ script RLS trên Supabase thật, tất cả phải PASS:

- [ ] 🚫 👤 `test-rls-students / lessons / documents / sessions / attendance / finance / payables / report-views / notifications / admin` — tất cả PASS.
- [ ] 🚫 🤝 Bổ sung ca còn thiếu theo PERMISSIONS §8: **(4)** USER thường gọi `/admin/**` → 403 ở **server** (không chỉ middleware); **(5)** USER cố set `app_metadata.role=admin` → thất bại; **(7)** tài khoản `expired`/`cancelled` → chặn mọi thao tác GHI.
- [ ] 🤖 Gom toàn bộ test RLS vào **CI** (`.github/workflows/`) — fail CI nếu bất kỳ ca nào rò rỉ. Chạy mỗi PR.
- [ ] 🤖 Xác nhận **build không lộ `service_role`**: quét `.next/static` sau build → rỗng (đã có trong quy trình).

## 3. Rà responsive & trạng thái UI (GĐ10 Task 2)

- [ ] 🤝 Kiểm mọi trang trên **điện thoại/tablet/desktop**; sửa layout vỡ (ưu tiên điện thoại).
- [ ] 🤖 Mọi danh sách có trạng thái **tải / rỗng / lỗi** tiếng Việt (không trang trắng khi lỗi).
- [ ] 🤝 Kiểm luồng chính bằng chuột + bàn phím + touch.

## 4. Hiệu năng (GĐ10 Task 3)

- [ ] 🤖 Rà **N+1**; xác nhận chỉ mục `(user_id, …)` được dùng cho truy vấn danh sách.
- [ ] 🤖 Sửa `listAccounts` (khu admin) full-scan → **view/RPC lọc+phân trang ở CSDL** trước khi có nhiều tài khoản.
- [ ] 🤝 Đo **LCP trang chính < 2.5s** với dữ liệu mẫu.

## 5. 🚫 Bảo mật cuối (GĐ10 Task 4)

- [ ] 🚫 🤖 Xác nhận **toàn bộ checklist `CLAUDE.md §5`** đạt (RLS mọi bảng, service_role chỉ server, role ở `app_metadata`…).
- [ ] 🤖 Thêm **security headers** cơ bản (CSP tối thiểu, `X-Frame-Options`, `Referrer-Policy`…).
- [ ] 🤖 (Hardening từ review GĐ9) Đọc khu admin qua **client đã xác thực (RLS `is_admin`)** thay vì service_role; **nguyên tử hóa** kích hoạt/gia hạn bằng **RPC Postgres** (tránh payment "confirmed" mồ côi).
- [ ] 🤝 Rà lại **RLS đã bật đúng** trên mọi bảng ở dashboard Supabase.

## 6. Auth & Email thực tế (bắt buộc cho người dùng thật)

- [ ] 🚫 👤 Cấu hình **SMTP** trong Supabase Auth (hoặc Resend) — nếu không, email xác nhận đăng ký & đặt lại mật khẩu **không gửi được**.
- [ ] 🚫 🤝 Kiểm luồng thật: **đăng ký → nhận email xác nhận → đăng nhập**; **quên mật khẩu → nhận email → đặt lại**.
- [ ] 👤 Đặt **Site URL / Redirect URLs** trong Supabase Auth trùng domain production.
- [ ] 🤝 Kiểm luồng **trial 14 ngày** → hết hạn → chế độ **chỉ đọc** (không mất dữ liệu).

## 7. Pháp lý & Vận hành (SaaS thu tiền ở VN)

- [ ] 🚫 🤝 Trang **Điều khoản dịch vụ** + **Chính sách bảo mật** (bắt buộc khi thu tiền & giữ dữ liệu cá nhân học sinh).
- [ ] 👤 Quyết định **hình thức thu tiền** (chuyển khoản thủ công ở MVP) + nội dung hướng dẫn chuyển khoản.
- [ ] 👤 Bật **backup** Supabase (PITR/định kỳ) + kiểm thử khôi phục 1 lần.
- [ ] 👤 **Giám sát**: bật log/error tracking (Vercel Analytics/Sentry) tối thiểu.
- [ ] 👤 Chuẩn bị **kênh hỗ trợ** (email/Zalo) cho giáo viên.

## 8. Landing + Tài liệu (GĐ10 Task 5)

- [ ] 🤖 Hoàn thiện **landing** (giới thiệu, gói tháng/năm, kêu gọi đăng ký).
- [ ] 🤖 **Hướng dẫn nhanh** tiếng Việt (tạo học sinh → xếp buổi → điểm danh → lập hóa đơn → ghi thu).

## 9. 🚫 Deploy production (GĐ10 Task 6)

- [ ] 🚫 👤 Cấu hình **biến môi trường production** trên Vercel (không đặt secret vào `NEXT_PUBLIC_`).
- [ ] 👤 Gắn **domain** thật + HTTPS.
- [ ] 🚫 🤝 **Smoke test luồng chính** trên domain thật (đăng ký → đăng nhập → CRUD → tài chính → báo cáo → admin).
- [ ] 🤝 Tag `release: MVP 1.0`.

## 10. Pilot rồi mới mở rộng

- [ ] 🤝 Chạy **pilot 1–2 giáo viên** thân quen (bạn xác nhận thanh toán tay), thu phản hồi ≥ 1–2 tuần.
- [ ] 🤝 Sửa lỗi phát sinh từ pilot → rồi mới mở đăng ký rộng.

---

## Giới hạn MVP (giáo viên cần được thông báo trước)

- Thanh toán **xác nhận thủ công** bởi admin (chưa có cổng tự động).
- Thông báo **chỉ trong ứng dụng** (chưa email/Zalo/push); chưa có cron tự đánh dấu quá hạn.
- **Học sinh không đăng nhập** (chỉ là dữ liệu).

---

## Tóm tắt "tối thiểu để bật cho giáo viên thật"

Nếu chỉ làm phần **bắt buộc** (🚫): mục **1** (đóng GĐ9) → **2** (0 rò rỉ, có CI) → **5** (bảo mật cuối) → **6** (email auth thật) → **7** (pháp lý) → **9** (deploy + smoke test). Các mục còn lại nâng chất lượng, nên làm trước khi mở rộng.
