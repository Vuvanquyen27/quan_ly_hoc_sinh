# Giai đoạn 7 — Báo cáo & Bảng điều khiển · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** Báo cáo doanh thu/chi phí/dòng tiền/công nợ + Dashboard tổng quan.

**Architecture:** Views PostgreSQL với `security_invoker=true` (kế thừa RLS của bảng cơ sở) làm nguồn số liệu; UI đọc view qua server client.

## Global Constraints
- Views `security_invoker=true` để **không** lộ dữ liệu chéo. Tiền VND `vi-VN`. LCP < 2.5s. TDD + commit.

**Phụ thuộc:** Giai đoạn 5 & 6 (`transactions`, `invoices`, `payables`); GĐ4 (`sessions`).

---

### Task 1: Migration views báo cáo
**Files:** Create `supabase/migrations/0010_report_views.sql`
- [ ] **Step 1:** Tạo (theo `DATABASE.md §9`, đều `security_invoker=true`):
  - `v_cashflow_monthly` (thu/chi/ròng theo tháng từ `transactions`).
  - `v_receivables_outstanding` (còn phải thu theo học sinh từ `invoices`).
  - `v_payables_outstanding` (còn phải trả từ `payables`).
  - `v_upcoming_sessions` (buổi `scheduled` trong 7 ngày tới).
- [ ] **Step 2:** `supabase db push`; kiểm thử tay bằng 2 user (A không thấy số của B). **Commit** `feat(db): views báo cáo (security_invoker)`.

### Task 2: Trang Báo cáo
**Files:** `app/(app)/bao-cao/**`, `components/reports/*`
- [ ] **Step 1:** Bộ chọn khoảng thời gian (tháng/khoảng tùy chỉnh).
- [ ] **Step 2:** Thẻ tổng: tổng thu, tổng chi, lợi nhuận, dòng tiền ròng; bảng công nợ phải thu/phải trả + danh sách quá hạn.
- [ ] **Step 3:** Biểu đồ dòng tiền theo tháng (dùng thư viện chart nhẹ). **Commit** `feat(reports): trang báo cáo`.

### Task 3: Dashboard tổng quan
**Files:** `app/(app)/tong-quan/**`, `components/dashboard/*`
- [ ] **Step 1:** Thẻ chỉ số nhanh: số học sinh đang học, buổi hôm nay/tuần, phải thu, thu–chi tháng.
- [ ] **Step 2:** "Buổi học sắp tới" (từ `v_upcoming_sessions`); cảnh báo hóa đơn/khoản phải trả quá hạn.
- [ ] **Step 3:** Biểu đồ dòng tiền 6 tháng. **Commit** `feat(dashboard): tổng quan + cảnh báo`.

### Task 4: Đối chiếu số liệu & hiệu năng
- [ ] **Step 1:** Đối chiếu thủ công một tháng mẫu (thu/chi/công nợ) khớp dữ liệu nguồn.
- [ ] **Step 2:** Kiểm tra không truy vấn N+1; view dùng chỉ mục; dashboard tải < 2.5s với dữ liệu mẫu. **Commit** `test(reports): đối chiếu số liệu + hiệu năng`.

### Task 5: Kiểm thử RLS view
- [ ] A **không** thấy số liệu của B qua bất kỳ view nào (security_invoker hoạt động). **Commit** `test(rls): views báo cáo`.

## DoD (đối chiếu ROADMAP §GĐ7)
- [ ] Số liệu báo cáo khớp nguồn (đối chiếu 1 tháng).
- [ ] Views tôn trọng RLS: A không thấy số của B.
- [ ] Dashboard < 2.5s, responsive.

## Self-review
- Views đọc-thôi giảm trùng lặp tính toán ở app. `security_invoker` là điểm bảo mật then chốt. Khớp `DATABASE.md §9`. Không placeholder.
