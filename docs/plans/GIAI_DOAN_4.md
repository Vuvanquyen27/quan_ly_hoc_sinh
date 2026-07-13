# Giai đoạn 4 — Lịch & Buổi học (+ Điểm danh) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** Lên lịch dạy theo **ngày/tuần/tháng**, quản lý **trạng thái buổi** (sắp diễn ra/đã hoàn thành/đã hủy), **điểm danh & ghi chú** sau buổi.

**Architecture:** `sessions` + `attendance` (tách riêng để mở rộng lớp nhóm sau). Dùng khuôn mẫu ghi của GĐ2; bổ sung view lịch và chuyển trạng thái. Thời gian `timestamptz` hiển thị `Asia/Ho_Chi_Minh`.

## Global Constraints
- 1 buổi ↔ 1 học sinh (MVP). `fee_amount` mặc định lấy từ `students.default_fee`.
- RLS `auth.uid()=user_id`. Hiển thị giờ theo `Asia/Ho_Chi_Minh`. TDD + commit.

**Phụ thuộc:** Giai đoạn 2 (`students`, khuôn mẫu).

---

### Task 1: Migration `sessions` + `attendance` + RLS
**Files:** Create `supabase/migrations/0006_sessions_attendance.sql`
- [ ] **Step 1:** Enum `session_status`, `session_mode`, `attendance_status`; bảng `sessions`, `attendance` theo `DATABASE.md §5.3`; CHECK `end_time > start_time`; `UNIQUE(session_id, student_id)` cho attendance.
- [ ] **Step 2:** Chỉ mục `(user_id, start_time)`, `(user_id, status)`, `(user_id, student_id)`.
- [ ] **Step 3:** RLS 4 policy mỗi bảng (khuôn mẫu GĐ2). `supabase db push`. **Commit** `feat(db): sessions + attendance + RLS`.

### Task 2: Server actions buổi học
**Files:** `lib/validators/session.ts`, `server/sessions/actions.ts`
- [ ] **Step 1:** Validator: `student_id` bắt buộc, `start_time < end_time`, `fee_amount ≥ 0`.
- [ ] **Step 2:** `createSession` (mặc định `fee_amount = students.default_fee`, `status='scheduled'`), `updateSession`, `changeStatus(id, status, cancelReason?)`, `listSessions({from, to, view})`.
- [ ] **Step 3:** (P1) phát hiện trùng giờ; (P1) lịch lặp `recurrence_group_id`. **Commit** `feat(sessions): actions buổi học`.

### Task 3: Giao diện Lịch (ngày/tuần/tháng/danh sách)
**Files:** `app/(app)/lich-day/**`, `components/calendar/*`
- [ ] **Step 1:** Bộ chọn chế độ xem Ngày/Tuần/Tháng/Danh sách; điều hướng tiến/lùi; đọc `listSessions` theo khoảng.
- [ ] **Step 2:** Hiển thị buổi với badge trạng thái; tạo nhanh buổi (chọn học sinh, giờ, hình thức, học phí).
- [ ] **Step 3:** Responsive (điện thoại: danh sách/ngày). **Commit** `feat(calendar): lịch ngày/tuần/tháng`.

### Task 4: Chuyển trạng thái buổi
- [ ] **Step 1:** Nút đổi trạng thái nhanh (scheduled → completed/cancelled); nhập lý do khi hủy.
- [ ] **Step 2:** Buổi quá giờ chưa cập nhật → gợi ý "đánh dấu hoàn thành". **Commit** `feat(sessions): chuyển trạng thái + lý do hủy`.

### Task 5: Điểm danh & ghi chú sau buổi
**Files:** `server/attendance/actions.ts`, `components/attendance/*`
- [ ] **Step 1:** Từ buổi → form điểm danh: `status` (có mặt/vắng/trễ), `homework_done`, `note`.
- [ ] **Step 2:** `upsertAttendance` (unique session,student). Hiển thị trong lịch sử học sinh (trang chi tiết GĐ2).
- [ ] **Step 3:** **Commit** `feat(attendance): điểm danh + ghi chú`.

### Task 6: Kiểm thử RLS
- [ ] A không đọc/ghi `sessions`/`attendance` của B; giả mạo `user_id` bị chặn; ADMIN không đọc.
- [ ] **Commit** `test(rls): sessions/attendance`.

## DoD (đối chiếu ROADMAP §GĐ4)
- [ ] Xem lịch tuần/tháng, tạo buổi, đổi trạng thái (có lý do hủy).
- [ ] Ghi điểm danh + nhận xét; hiển thị đúng `Asia/Ho_Chi_Minh`.
- [ ] Buổi quá giờ → gợi ý hoàn thành. RLS test PASS.

## Self-review
- `attendance` tách riêng cho mở rộng nhóm sau. Khớp `DATABASE.md §5.3`. Không placeholder.
