# ROADMAP — Lộ trình triển khai

**Sản phẩm:** EduFlow — Không gian làm việc cho giáo viên cá nhân
**Phiên bản:** 1.0 · **Ngày:** 2026-07-13

> **Cho người triển khai:** Mỗi giai đoạn dưới đây là một **"lát cắt dọc" (vertical slice)** — khi hoàn thành phải cho ra phần mềm **chạy được và kiểm thử được**. Khi bắt đầu triển khai một giai đoạn, hãy **nở nó thành implementation plan chi tiết** (theo skill `superpowers:writing-plans`, lưu tại `docs/superpowers/plans/YYYY-MM-DD-<tên>.md`) rồi thực thi từng bước theo TDD.

**Mục tiêu tổng:** Xây dựng SaaS quản lý công việc cho giáo viên cá nhân, dữ liệu cách ly tuyệt đối theo `user_id` + RLS, đạt phạm vi MVP trong `PRD.md §8.1`.

**Kiến trúc:** Next.js App Router (Server Components + Server Actions cho logic nhạy cảm) · Supabase (Auth/PostgreSQL/Storage/RLS) · shadcn/ui + Tailwind · triển khai Vercel. Mỗi tính năng là một lát cắt dọc: migration + RLS + truy cập dữ liệu ở server + UI.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, `@supabase/ssr`, Supabase CLI (migrations), Vercel.

---

## Global Constraints (áp dụng cho MỌI giai đoạn — sao chép nguyên văn từ spec)

- **Ngôn ngữ giao diện:** tiếng Việt; định dạng `vi-VN`.
- **Tiền tệ:** VND, lưu **số nguyên (đồng)** kiểu `bigint`; hiển thị `1.500.000 ₫`.
- **Múi giờ:** lưu `timestamptz` (UTC), hiển thị `Asia/Ho_Chi_Minh`; ngày `dd/MM/yyyy`.
- **`user_id` NOT NULL** trên mọi bảng dữ liệu khách; **RLS bật** với policy `auth.uid() = user_id`.
- USER **chỉ** đọc/ghi dữ liệu của mình; **không** truy cập dữ liệu USER khác (cách ly tuyệt đối).
- **Không** dựa vào ẩn nút giao diện để phân quyền — kiểm soát ở **máy chủ + RLS**.
- Thao tác **ADMIN xác minh phía máy chủ** (vai trò từ JWT `app_metadata.role`).
- ADMIN chỉ quản lý **tài khoản & thuê bao**; **không** đọc/sửa dữ liệu nghiệp vụ USER (RLS bảng nghiệp vụ không có nhánh admin).
- Mô hình **thuê bao trả phí tháng/năm**; MVP kích hoạt/gia hạn **thủ công** bởi ADMIN; ghi **audit log** mọi thao tác quản trị.
- **Không** đưa `SUPABASE_SERVICE_ROLE_KEY` vào mã trình duyệt; chỉ dùng ở máy chủ.
- **Responsive** cho điện thoại/máy tính bảng/máy tính (ưu tiên điện thoại).
- **TDD + commit thường xuyên**; kiểm thử RLS là tiêu chí chặn phát hành.

---

## Bảng tổng quan giai đoạn

| GĐ | Tên | Kết quả chính | Phụ thuộc |
|---|---|---|---|
| 0 | Nền móng dự án | App chạy + deploy + kết nối Supabase | — |
| 1 | Xác thực & Hồ sơ | Đăng ký/đăng nhập, profile, trial, bảo vệ route | 0 |
| 2 | Quản lý học sinh | CRUD học sinh + pattern RLS chuẩn | 1 |
| 3 | Bài học & Tài liệu | Thư viện bài học + tệp/liên kết (Storage) | 2 |
| 4 | Lịch & Buổi học | Lịch ngày/tuần/tháng + trạng thái + điểm danh/ghi chú | 2 |
| 5 | Tài chính: Phải thu | Hóa đơn công nợ + thu học phí | 4 |
| 6 | Tài chính: Phải trả & Thu/Chi | Khoản phải trả + sổ thu/chi + hạn thanh toán | 5 |
| 7 | Báo cáo & Dashboard | Báo cáo dòng tiền/công nợ + tổng quan | 5, 6 |
| 8 | Cài đặt & Thông báo | Cài đặt hồ sơ/tiền tệ + thông báo in-app | 1 |
| 9 | Khu vực ADMIN | Quản lý tài khoản & thuê bao, xác nhận thanh toán, audit log, thống kê | 1 |
| 10 | Hoàn thiện & Phát hành | Kiểm thử phân quyền, tối ưu, phát hành | tất cả |

**Thứ tự đề xuất:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.
GĐ 8 (Cài đặt/Thông báo) và GĐ 9 (ADMIN) có thể chạy song song sau GĐ 1 nếu có nhiều người làm.

---

## Giai đoạn 0 — Nền móng dự án

**Mục tiêu:** Có bộ khung ứng dụng chạy được cục bộ và trên Vercel, kết nối được Supabase, chưa có tính năng nghiệp vụ.

**Hạng mục:**
- Khởi tạo Next.js App Router + TypeScript + Tailwind (`create-next-app`).
- Cài shadcn/ui; thiết lập theme, font, layout gốc **tiếng Việt** (`<html lang="vi">`), định dạng số/tiền/ngày `vi-VN`.
- Tạo dự án Supabase; cấu hình biến môi trường: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client) và `SUPABASE_SERVICE_ROLE_KEY` (chỉ server). Thiết lập `vercel env`.
- Tạo tiện ích Supabase client cho **browser** và **server** bằng `@supabase/ssr` (2 nhánh riêng, không rò rỉ service role).
- Cấu trúc thư mục: `app/(marketing)`, `app/(app)`, `app/admin`, `lib/supabase`, `lib/format`, `supabase/migrations`.
- Thiết lập lint/format; script `dev`/`build`/`lint`; deploy preview lên Vercel.

**Tiêu chí hoàn thành (DoD):**
- [ ] `npm run dev` chạy, trang chủ hiển thị tiếng Việt.
- [ ] `npm run build` thành công; deploy Vercel preview mở được.
- [ ] Gọi thử một truy vấn Supabase từ **server** trả kết quả (kết nối OK).
- [ ] Quét bundle client: **không** chứa `SERVICE_ROLE` key.
- [ ] Hàm format tiền/ngày (`vi-VN`, `Asia/Ho_Chi_Minh`) có unit test pass.
- [ ] Cập nhật `CLAUDE.md §7` với lệnh thực tế.

---

## Giai đoạn 1 — Xác thực & Hồ sơ

**Mục tiêu:** USER đăng ký/đăng nhập/đăng xuất/khôi phục mật khẩu; có `profiles` + `user_settings`; route được bảo vệ; trạng thái `trial`.

**Hạng mục:**
- Migration: enums `subscription_status` (`trialing/active/past_due/expired/cancelled`), `billing_cycle`; bảng `plans` (seed **một gói** ở 2 chu kỳ **tháng & năm**), `profiles`, `user_settings`, `subscriptions` (1-1, mặc định `trialing`) + bật RLS + policy.
- Trigger `on auth.users` tạo `profiles` + `user_settings` mặc định (VND, Asia/Ho_Chi_Minh, vi) + `subscriptions` (`trialing`, `trial_ends_at` = +14 ngày).
- Hàm SQL `public.is_admin()` (đọc `app_metadata.role`).
- Trang: Đăng ký, Đăng nhập, Quên/Đặt lại mật khẩu (Supabase Auth + `@supabase/ssr`).
- **Middleware** bảo vệ `app/(app)/**` (cần đăng nhập) và `app/admin/**` (cần `role=admin`).
- Server: helper lấy phiên + vai trò; kiểm tra `is_locked`/gating gói (chế độ chỉ đọc khi hết hạn).
- Onboarding tối thiểu: nhập tên giáo viên.

**Tiêu chí hoàn thành (DoD):**
- [ ] Đăng ký → tự tạo `profiles` + `user_settings` + `subscriptions` (`trialing`, hạn dùng thử +14 ngày).
- [ ] Đăng nhập/đăng xuất/đặt lại mật khẩu hoạt động.
- [ ] Truy cập `app/(app)` khi chưa đăng nhập → chuyển hướng đăng nhập (kiểm chứng ở **server**, không chỉ ẩn UI).
- [ ] USER **không** tự đổi được `role` (profiles) hay trạng thái/hạn thuê bao (`subscriptions`) — thử trực tiếp → bị chặn bởi RLS/máy chủ.
- [ ] RLS test: user A không đọc được `profiles` của user B.
- [ ] Tài khoản `is_locked=true` không đăng nhập vào app.

---

## Giai đoạn 2 — Quản lý học sinh _(thiết lập pattern chuẩn)_

**Mục tiêu:** CRUD hồ sơ học sinh đầy đủ; đây là lát cắt mẫu định hình **pattern CRUD + RLS + kiểm thử** cho các giai đoạn sau.

**Hạng mục:**
- Migration: enum `student_status`; bảng `students` (mọi cột theo `DATABASE.md §5.2`) + RLS (4 policy) + chỉ mục.
- Server actions: `createStudent`/`updateStudent`/`archiveStudent`/`listStudents` (lấy `user_id` từ phiên, **không** nhận từ client).
- UI: danh sách (tìm kiếm, lọc theo trạng thái/môn/lớp, phân trang), form thêm/sửa (validate), trang chi tiết học sinh.
- Xóa mềm (`archived_at`) thay vì xóa cứng.

**Tiêu chí hoàn thành (DoD):**
- [ ] Thêm/sửa/lưu trữ/tìm kiếm học sinh hoạt động, responsive.
- [ ] RLS test đầy đủ (mẫu cho các bảng sau): A không đọc/ghi/sửa/xóa được `students` của B; giả mạo `user_id` bị chặn.
- [ ] Truy vấn danh sách có phân trang + dùng chỉ mục `(user_id, ...)`.
- [ ] Không thao tác ghi nào tin `user_id` từ client (rà soát code).

---

## Giai đoạn 3 — Bài học & Tài liệu

**Mục tiêu:** Thư viện bài học của USER; quản lý tài liệu dạng **tệp (Storage)** và **liên kết ngoài**.

**Hạng mục:**
- Migration: bảng `lessons`, `documents` (+ enum `document_type`) + RLS + chỉ mục; FK `documents.lesson_id/student_id` (SET NULL).
- Storage: bucket riêng tư `documents`; chính sách theo tiền tố `user_id/` (`DATABASE.md §10`).
- Tải tệp qua **signed URL** phát hành ở server; giới hạn kích thước cơ bản.
- UI: CRUD bài học (nội dung Markdown/HTML, tag, môn, khối); CRUD tài liệu (upload/paste link), gắn vào bài học/học sinh.

**Tiêu chí hoàn thành (DoD):**
- [ ] Tạo/sửa bài học; đính kèm tài liệu (tệp & link).
- [ ] Upload/đọc tệp chỉ trong tiền tố `user_id/` của mình; A **không** đọc được tệp của B (test Storage).
- [ ] Xóa bài học đặt `documents.lesson_id = NULL` (không mất tài liệu).

---

## Giai đoạn 4 — Lịch & Buổi học (+ Điểm danh)

**Mục tiêu:** Lên lịch dạy theo ngày/tuần/tháng, quản lý trạng thái buổi, điểm danh & ghi chú sau buổi.

**Hạng mục:**
- Migration: enum `session_status`, `session_mode`, `attendance_status`; bảng `sessions`, `attendance` + RLS + chỉ mục `(user_id, start_time)`.
- Server actions: tạo/sửa/hủy buổi; đổi trạng thái; ghi điểm danh + note (unique `session_id, student_id`).
- UI Lịch: chế độ **Ngày / Tuần / Tháng / Danh sách**; tạo nhanh buổi (chọn học sinh, giờ, học phí mặc định từ `students.default_fee`); badge trạng thái.
- Điểm danh: từ buổi → chọn có mặt/vắng/trễ + tình trạng bài tập + nhận xét; hiển thị trong lịch sử học sinh.
- (P1) Lịch lặp hằng tuần (`recurrence_group_id`); phát hiện trùng giờ.

**Tiêu chí hoàn thành (DoD):**
- [ ] Xem lịch tuần/tháng, tạo buổi, đổi trạng thái (scheduled/completed/cancelled) với lý do hủy.
- [ ] Ghi điểm danh + nhận xét; hiển thị đúng theo múi giờ `Asia/Ho_Chi_Minh`.
- [ ] Buổi quá giờ chưa cập nhật → gợi ý "đánh dấu hoàn thành".
- [ ] RLS test cho `sessions` + `attendance`.

---

## Giai đoạn 5 — Tài chính: Khoản phải thu & Thu học phí

**Mục tiêu:** Lập hóa đơn công nợ học phí; ghi nhận thanh toán; theo dõi công nợ phải thu.

**Hạng mục:**
- Migration: enum `invoice_status`, `transaction_type`, `payment_method`, `category_kind`; bảng `categories`, `invoices`, `invoice_items`, `transactions` + RLS + chỉ mục + CHECK ràng buộc.
- Trigger cập nhật `invoices.amount_paid`/`status` từ `transactions` (INSERT/UPDATE/DELETE).
- Server actions: **tổng hợp hóa đơn tự động** từ các buổi đã hoàn thành chưa lập hóa đơn trong kỳ (tạo `invoice_items` theo buổi + đặt `sessions.is_billed=true`), cho **chỉnh tay** trước khi chốt; vẫn cho tạo hóa đơn thủ công; ghi thu học phí → `transactions(type='income', invoice_id, student_id)`.
- UI: danh sách hóa đơn (lọc theo trạng thái/học sinh/hạn), chi tiết hóa đơn, nút "Ghi thanh toán"; công nợ theo học sinh & tổng.

**Tiêu chí hoàn thành (DoD):**
- [ ] Tạo hóa đơn; ghi thanh toán một phần/toàn bộ → `status` và `amount_paid` cập nhật đúng qua trigger.
- [ ] **Tổng hợp hóa đơn tự động** từ buổi đã hoàn thành trong kỳ đúng số tiền; buổi đã lập hóa đơn được đánh dấu `is_billed` và **không bị tính trùng** khi tổng hợp lại.
- [ ] Tổng công nợ phải thu (theo học sinh & toàn bộ) tính chính xác.
- [ ] Số tiền lưu `bigint` VND, hiển thị `vi-VN`; không sai số làm tròn.
- [ ] RLS test cho `invoices`/`transactions`.

---

## Giai đoạn 6 — Tài chính: Khoản phải trả & Sổ thu/chi

**Mục tiêu:** Quản lý khoản USER nợ người khác; ghi nhận thu/chi tổng quát; theo dõi hạn & lịch sử thanh toán.

**Hạng mục:**
- Migration: enum `payable_status`; bảng `payables` + RLS + chỉ mục; trigger cập nhật `payables.amount_paid`/`status` từ `transactions(type='expense', payable_id)`.
- Server actions: tạo khoản phải trả; ghi trả nợ (→ `transactions` chi); ghi thu/chi tự do (gắn `category_id`).
- UI: danh sách phải trả (hạn, còn nợ), ghi trả dần; sổ thu/chi (lọc theo loại/danh mục/khoảng thời gian); màn hình **Hạn thanh toán** gộp phải thu + phải trả (sắp tới/quá hạn) và **Lịch sử thanh toán**.
- Danh mục thu/chi (`categories`) quản lý được.

**Tiêu chí hoàn thành (DoD):**
- [ ] Tạo khoản phải trả, trả dần → công nợ còn lại cập nhật đúng.
- [ ] Ghi thu/chi tự do vào sổ; phân loại theo danh mục.
- [ ] Màn hình hạn thanh toán hiển thị đúng khoản sắp tới/quá hạn (cả 2 chiều).
- [ ] RLS test cho `payables`/`categories`.

---

## Giai đoạn 7 — Báo cáo & Bảng điều khiển

**Mục tiêu:** Báo cáo doanh thu/chi phí/dòng tiền/công nợ; Dashboard tổng quan.

**Hạng mục:**
- Views (`security_invoker=true`): `v_cashflow_monthly`, `v_receivables_outstanding`, `v_payables_outstanding`, `v_upcoming_sessions` (+ `v_revenue_by_student` P1).
- Trang Báo cáo: chọn khoảng thời gian; tổng thu/chi/lợi nhuận/dòng tiền ròng; công nợ tổng; biểu đồ.
- Dashboard: thẻ chỉ số nhanh (học sinh đang học, buổi hôm nay/tuần, phải thu, thu–chi tháng), "Buổi sắp tới", cảnh báo hạn quá hạn, biểu đồ dòng tiền 6 tháng.
- (P1) Xuất CSV/Excel.

**Tiêu chí hoàn thành (DoD):**
- [ ] Số liệu báo cáo khớp dữ liệu nguồn (đối chiếu thủ công một tháng mẫu).
- [ ] Views tôn trọng RLS: A **không** thấy số liệu của B.
- [ ] Dashboard tải < 2.5s với dữ liệu mẫu; responsive.

---

## Giai đoạn 8 — Cài đặt & Thông báo

**Mục tiêu:** USER chỉnh hồ sơ/tiền tệ/múi giờ/tùy chọn thông báo; thông báo trong ứng dụng.

**Hạng mục:**
- UI cài đặt: hồ sơ (tên, ảnh, SĐT), tiền tệ hiển thị, múi giờ, định dạng ngày, tùy chọn nhắc buổi/nhắc học phí; xem thông tin gói (chỉ đọc).
- Migration: enum `notification_type`; bảng `notifications` + RLS + chỉ mục.
- Sinh thông báo in-app: nhắc buổi sắp tới, nhắc hạn học phí (công việc định kỳ Vercel Cron/Supabase scheduled — P1); đánh dấu đã đọc.

**Tiêu chí hoàn thành (DoD):**
- [ ] Đổi cài đặt lưu vào `user_settings` và áp dụng ngay (định dạng tiền/ngày).
- [ ] Upload ảnh đại diện qua Storage (cách ly theo `user_id`).
- [ ] Thông báo in-app hiển thị, đánh dấu đã đọc; RLS test cho `notifications`.

---

## Giai đoạn 9 — Khu vực ADMIN

**Mục tiêu:** ADMIN quản lý vòng đời tài khoản khách, gói, nhật ký, thống kê — **tách biệt hoàn toàn** khỏi USER.

**Hạng mục:**
- Migration: hoàn thiện `subscriptions` (từ GĐ1), thêm `subscription_payments`, `admin_audit_logs` + RLS (`is_admin()`); mở rộng `plans` (gói tháng/năm).
- Khu vực `app/admin` layout riêng; middleware chặn non-admin; **mọi** action kiểm tra `role=admin` ở server (dùng `service_role` cho tác vụ đổi tài khoản/thuê bao).
- Chức năng **chỉ ở phạm vi tài khoản & thuê bao**: xem/sửa thông tin tài khoản USER; **khóa/mở** tài khoản; **xác nhận thanh toán** → kích hoạt/gia hạn (đặt gói, ngày bắt đầu/hết hạn, trạng thái thanh toán); đổi/hủy gói; quản lý danh mục `plans`; xem lịch sử `subscription_payments` và `admin_audit_logs`.
- **Không** xây màn hình nào cho ADMIN đọc/sửa dữ liệu nghiệp vụ USER (học sinh, bài học, lịch dạy, tài liệu, công nợ, thu/chi).
- Thống kê tổng hợp: số USER theo trạng thái thuê bao, đăng ký mới, hoạt động (mức tổng hợp).
- Ghi `admin_audit_logs` cho **mọi** thao tác kích hoạt/gia hạn/đổi gói/hủy/khóa/mở khóa; tạo `subscription_payments` khi xác nhận thanh toán.

**Tiêu chí hoàn thành (DoD):**
- [ ] USER thường gọi bất kỳ route/API `/admin/**` → **403** ở server (kể cả biết URL).
- [ ] ADMIN xác nhận thanh toán → tạo `subscription_payments` + cập nhật `subscriptions` (gói, ngày bắt đầu/hết hạn, trạng thái); gia hạn đẩy `expires_at`.
- [ ] ADMIN khóa/mở/đổi gói/hủy hoạt động; trạng thái áp dụng ngay cho USER.
- [ ] **Mọi** thao tác kích hoạt/gia hạn/khóa/mở khóa được ghi vào `admin_audit_logs`.
- [ ] **RLS test:** tài khoản ADMIN **không** đọc được `students`/`lessons`/`sessions`/`documents`/`invoices`/`payables`/`transactions` của USER (policy không có nhánh `is_admin`).

---

## Giai đoạn 10 — Hoàn thiện & Phát hành

**Mục tiêu:** Đạt chuẩn chất lượng/bảo mật để phát hành MVP.

**Hạng mục:**
- **Kiểm thử phân quyền toàn diện** theo `PERMISSIONS.md §8` (đọc/ghi chéo, giả mạo id, leo thang vai trò, rò rỉ service_role, gating gói, cách ly Storage) — đưa vào CI.
- Rà soát responsive (điện thoại/tablet/desktop); trạng thái rỗng, tải, lỗi.
- Hiệu năng: chỉ mục, phân trang, LCP < 2.5s; kiểm tra truy vấn N+1.
- Rà soát bảo mật: biến môi trường, header, không lộ khóa; xem lại toàn bộ RLS.
- Tài liệu người dùng cơ bản (tiếng Việt); trang landing.
- Deploy **production** trên Vercel; cấu hình domain, môi trường prod.

**Tiêu chí hoàn thành (DoD):**
- [ ] **0** trường hợp rò rỉ dữ liệu chéo trong bộ kiểm thử phân quyền (release blocker).
- [ ] Tất cả tính năng MVP (`PRD.md §8.1`) hoạt động end-to-end.
- [ ] Không có khóa bí mật trong bundle client (quét tự động).
- [ ] Build production xanh; app hoạt động trên domain thật.
- [ ] Checklist bảo mật `CLAUDE.md §5` được xác nhận toàn bộ.

---

## Nguyên tắc thực thi (áp dụng mọi giai đoạn)

1. **TDD:** viết test trước (đặc biệt test RLS/cách ly), thấy fail, rồi hiện thực tối thiểu cho pass.
2. **Migration versioned:** mọi thay đổi schema qua `supabase/migrations/*.sql`, không sửa tay trên dashboard mà không ghi lại.
3. **Commit thường xuyên, nhỏ gọn:** mỗi bước có deliverable kiểm thử được.
4. **DRY/YAGNI:** không thêm tính năng ngoài phạm vi giai đoạn; tái dùng pattern CRUD/RLS từ Giai đoạn 2.
5. **Bảo mật là mặc định:** không giai đoạn nào được phát hành khi thiếu RLS/kiểm thử cách ly cho bảng mới.
6. **Nở kế hoạch chi tiết:** trước khi code một giai đoạn, tạo implementation plan chi tiết theo `writing-plans`.

> **Lưu ý:** Tài liệu này dừng ở mức lộ trình theo yêu cầu — **chưa** bắt đầu lập trình. Việc khởi động triển khai (nở plan chi tiết + thực thi) sẽ tiến hành khi có yêu cầu.

---

## Tài liệu liên quan
- [`PRD.md`](./PRD.md) · [`PERMISSIONS.md`](./PERMISSIONS.md) · [`DATABASE.md`](./DATABASE.md) · [`../README.md`](../README.md) · [`../CLAUDE.md`](../CLAUDE.md)
