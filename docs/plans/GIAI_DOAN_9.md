# Giai đoạn 9 — Khu vực ADMIN · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** ADMIN quản lý **vòng đời tài khoản & thuê bao** (khóa/mở, xác nhận thanh toán, kích hoạt/gia hạn, đổi/hủy gói, quản lý `plans`, thống kê) — **tách biệt hoàn toàn** khỏi USER, **ghi audit log mọi thao tác**, và **không** chạm dữ liệu nghiệp vụ USER.

**Architecture:** Khu `app/admin` layout riêng; middleware chặn non-admin; Server Actions ADMIN dùng **admin client (`service_role`)** SAU khi xác minh `role=admin`. Vai trò đặt ở `app_metadata.role`.

## Global Constraints
- Mọi action kiểm tra `role=admin` ở **server** (không tin client/middleware đơn lẻ).
- **Ghi `admin_audit_logs`** cho: activate/renew/change_plan/cancel/lock/unlock.
- ADMIN **không** có policy/UI đọc dữ liệu nghiệp vụ USER. TDD + commit.

**Phụ thuộc:** Giai đoạn 1 (`subscriptions`, `is_admin()`, `plans`).

---

### Task 1: Migration `subscription_payments` + `admin_audit_logs` + enums + RLS
**Files:** Create `supabase/migrations/0012_admin_subscriptions.sql`
- [ ] **Step 1:** Enum `subscription_payment_status`, `subscription_event_kind`, `admin_action` (theo `DATABASE.md §4`).
- [ ] **Step 2:** Bảng `subscription_payments`, `admin_audit_logs` theo `DATABASE.md §5.1`; FK; chỉ mục.
- [ ] **Step 3:** RLS: `subscription_payments` — USER đọc của mình (`auth.uid()=user_id`), ADMIN toàn quyền (`is_admin()`); `admin_audit_logs` — chỉ `is_admin()` đọc, ghi qua service_role.
- [ ] **Step 4:** `supabase db push`. **Commit** `feat(db): subscription_payments + admin_audit_logs + RLS`.

### Task 2: Bootstrap ADMIN đầu tiên
**Files:** `scripts/set-admin.md` (hướng dẫn) hoặc script server
- [ ] **Step 1:** Ghi hướng dẫn đặt `app_metadata.role='admin'` cho một user qua `service_role` (Supabase Admin API / SQL nội bộ) — **không** làm qua UI công khai.
- [ ] **Step 2:** Xác nhận JWT của user đó chứa `app_metadata.role='admin'`. **Commit** `chore(admin): hướng dẫn cấp quyền admin đầu tiên`.

### Task 3: Vỏ khu vực ADMIN + chặn truy cập
**Files:** `app/admin/layout.tsx`, cập nhật `middleware.ts`
- [ ] **Step 1:** Middleware: `/admin/**` yêu cầu `app_metadata.role='admin'`, nếu không → 404/redirect.
- [ ] **Step 2:** `app/admin/layout.tsx` xác minh lại vai trò ở server; điều hướng riêng (không dùng vỏ (app)).
- [ ] **Step 3:** Helper `assertAdmin()` cho mọi action ADMIN. **Commit** `feat(admin): vỏ + chặn non-admin`.

### Task 4: Quản lý tài khoản (xem/sửa, khóa/mở) + audit
**Files:** `app/admin/tai-khoan/**`, `server/admin/accounts.ts`
- [ ] **Step 1:** Danh sách/chi tiết USER (email, tên, ngày tạo, trạng thái tài khoản & thuê bao); tìm kiếm/lọc. Dùng admin client (đọc `profiles`+`subscriptions`).
- [ ] **Step 2:** Sửa thông tin tài khoản; `lockAccount`/`unlockAccount` (đặt `profiles.is_locked`) → ghi `admin_audit_logs` (`lock_account`/`unlock_account`).
- [ ] **Step 3:** **Commit** `feat(admin): quản lý tài khoản + khóa/mở + audit`.

### Task 5: Thuê bao — xác nhận thanh toán, kích hoạt/gia hạn, đổi/hủy + audit
**Files:** `app/admin/thue-bao/**`, `server/admin/subscriptions.ts`
- [ ] **Step 1:** `confirmPaymentAndActivate({userId, planId, method, amount, periodStart, periodEnd})`: tạo `subscription_payments` (kind=`activation`, status=`confirmed`); cập nhật `subscriptions` (plan, `started_at`, `expires_at`, `status='active'`); ghi audit `activate_subscription`.
- [ ] **Step 2:** `renewSubscription(...)`: tạo `subscription_payments` (kind=`renewal`); đẩy `expires_at`; audit `renew_subscription`.
- [ ] **Step 3:** `changePlan(...)` (audit `change_plan`), `cancelSubscription(...)` (status=`cancelled`, `cancelled_at`; audit `cancel_subscription`).
- [ ] **Step 4:** UI: form xác nhận thanh toán/gia hạn; xem lịch sử `subscription_payments`. **Commit** `feat(admin): xác nhận thanh toán + kích hoạt/gia hạn + audit`.

### Task 6: Quản lý gói + Thống kê + Nhật ký
**Files:** `app/admin/goi/**`, `app/admin/nhat-ky/**`, `server/admin/plans.ts`
- [ ] **Step 1:** CRUD `plans` (tên, giá, chu kỳ tháng/năm, tính năng, is_active).
- [ ] **Step 2:** Thống kê tổng hợp: số USER theo trạng thái thuê bao, đăng ký mới, hoạt động (mức tổng hợp — **không** lộ dữ liệu nghiệp vụ cá nhân).
- [ ] **Step 3:** Xem `admin_audit_logs` (lọc theo actor/action/thời gian). **Commit** `feat(admin): plans + thống kê + nhật ký`.

### Task 7: Kiểm thử phân quyền ADMIN (bắt buộc)
- [ ] USER thường gọi route/API `/admin/**` → **403** ở server (kể cả biết URL).
- [ ] Tài khoản ADMIN `select` `students`/`sessions`/`invoices`/`payables`/`transactions` của USER → **0 dòng** (không nhánh `is_admin`).
- [ ] Mọi thao tác activate/renew/lock/unlock/change_plan/cancel ghi **đủ** `admin_audit_logs`.
- [ ] **Commit** `test(admin): chặn USER + admin không đọc nghiệp vụ + audit đầy đủ`.

## DoD (đối chiếu ROADMAP §GĐ9)
- [ ] USER thường → 403 với `/admin/**`.
- [ ] Xác nhận thanh toán → tạo `subscription_payments` + cập nhật `subscriptions` (gói, ngày bắt đầu/hết hạn, trạng thái); gia hạn đẩy `expires_at`.
- [ ] Khóa/mở/đổi/hủy hoạt động, áp dụng ngay.
- [ ] Mọi thao tác ghi `admin_audit_logs`.
- [ ] RLS test: ADMIN không đọc dữ liệu nghiệp vụ.

## Self-review
- `service_role` chỉ trong `server/admin/*` sau `assertAdmin()`. Ranh giới ADMIN↔nghiệp vụ được RLS + không-UI đảm bảo. Khớp `DATABASE.md` + `PERMISSIONS.md §4`. Không placeholder.
