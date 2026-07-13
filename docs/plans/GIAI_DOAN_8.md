# Giai đoạn 8 — Cài đặt & Thông báo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** USER chỉnh hồ sơ/tiền tệ/múi giờ/tùy chọn thông báo; xem thông tin thuê bao (chỉ đọc); **thông báo trong ứng dụng**.

**Architecture:** UI cài đặt ghi `user_settings`/`profiles`; avatar lên Storage; bảng `notifications` + đọc/đánh dấu; sinh thông báo (nhắc buổi/nhắc hạn) — job định kỳ để **P1**.

## Global Constraints
- RLS `auth.uid()=user_id`. Avatar tiền tố `user_id/`. Tiếng Việt, VND, `Asia/Ho_Chi_Minh`. TDD + commit.

**Phụ thuộc:** Giai đoạn 1 (`user_settings`, `profiles`, `subscriptions`); Storage (GĐ3).

---

### Task 1: Trang Cài đặt
**Files:** `app/(app)/cai-dat/**`, `server/settings/actions.ts`
- [ ] **Step 1:** Hồ sơ: tên, SĐT (ghi `profiles`); tùy chọn tiền tệ hiển thị, múi giờ, định dạng ngày, nhắc buổi/nhắc học phí (ghi `user_settings`).
- [ ] **Step 2:** Khối "Thuê bao" (chỉ đọc): gói hiện tại, trạng thái, ngày bắt đầu/hết hạn (đọc `subscriptions`) + nút "Liên hệ gia hạn".
- [ ] **Step 3:** Áp định dạng ngay khi đổi (tiền/ngày). **Commit** `feat(settings): hồ sơ + tiền tệ + thông báo`.

### Task 2: Ảnh đại diện (Storage)
- [ ] **Step 1:** Upload avatar vào bucket (tiền tố `user_id/`) → lưu `profiles.avatar_url`; hiển thị qua signed URL. **Commit** `feat(settings): ảnh đại diện`.

### Task 3: Migration `notifications` + RLS
**Files:** Create `supabase/migrations/0011_notifications.sql`
- [ ] **Step 1:** Enum `notification_type`; bảng `notifications` theo `DATABASE.md §5.5`; chỉ mục `(user_id, is_read)`, `(user_id, created_at)`.
- [ ] **Step 2:** RLS 4 policy. `supabase db push`. **Commit** `feat(db): notifications + RLS`.

### Task 4: Sinh & hiển thị thông báo in-app
**Files:** `server/notifications/actions.ts`, `components/notifications/*`
- [ ] **Step 1:** Hàm tạo thông báo (nhắc buổi sắp tới, nhắc hạn học phí) — gọi khi vào dashboard hoặc job định kỳ (Vercel Cron — **P1**).
- [ ] **Step 2:** UI chuông thông báo: danh sách, đánh dấu đã đọc (`markRead`), số chưa đọc.
- [ ] **Step 3:** **Commit** `feat(notifications): thông báo in-app + đánh dấu đã đọc`.

### Task 5: Kiểm thử RLS
- [ ] A không đọc `notifications`/`user_settings` của B; đổi cài đặt lưu đúng; avatar cách ly. **Commit** `test(rls): notifications/settings`.

## DoD (đối chiếu ROADMAP §GĐ8)
- [ ] Đổi cài đặt lưu vào `user_settings` và áp dụng ngay.
- [ ] Upload avatar qua Storage (cách ly `user_id`).
- [ ] Thông báo in-app hiển thị, đánh dấu đã đọc; RLS test PASS.

## Self-review
- Job nhắc định kỳ để P1 (không chặn MVP). Khớp `DATABASE.md §5.5`. Không placeholder.
