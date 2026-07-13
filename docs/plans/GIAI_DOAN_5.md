# Giai đoạn 5 — Tài chính: Phải thu & Hóa đơn tự động · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** Lập hóa đơn công nợ học phí — **tự động tổng hợp từ buổi đã hoàn thành** (P0) + chỉnh tay; ghi nhận thanh toán; theo dõi công nợ phải thu.

**Architecture:** `invoices` (accrual) + `invoice_items` (dòng theo buổi) + `transactions` (dòng tiền thực). Trigger cập nhật `invoices.amount_paid`/`status` từ `transactions`. Tổng hợp tự động: cộng buổi `completed` chưa `is_billed` trong kỳ.

## Global Constraints
- Tiền `bigint` VND; `transactions.amount > 0`. RLS `auth.uid()=user_id`.
- `CHECK (invoice_id IS NULL OR type='income')`. TDD + commit.

**Phụ thuộc:** Giai đoạn 4 (`sessions` có `fee_amount`, `is_billed`, `status`).

---

### Task 1: Migration tài chính (phải thu) + RLS
**Files:** Create `supabase/migrations/0007_finance_receivables.sql`
- [ ] **Step 1:** Enum `invoice_status`, `transaction_type`, `payment_method`, `category_kind`; bảng `categories`, `invoices`, `invoice_items`, `transactions` theo `DATABASE.md §5.4`; CHECK ràng buộc; chỉ mục.
- [ ] **Step 2:** RLS 4 policy mỗi bảng (khuôn mẫu GĐ2).
- [ ] **Step 3:** `supabase db push`. **Commit** `feat(db): invoices/invoice_items/transactions/categories + RLS`.

### Task 2: Trigger cập nhật công nợ theo dòng tiền
**Files:** Create `supabase/migrations/0008_invoice_paid_trigger.sql`
- [ ] **Step 1:** Hàm + trigger trên `transactions` (INSERT/UPDATE/DELETE): với `invoice_id` không null → `invoices.amount_paid = SUM(amount where invoice_id=... and type='income')`; đặt `status` (`paid` nếu ≥ total; `partial` nếu 0<paid<total; else `unpaid`).
- [ ] **Step 2:** Test tay: thêm/sửa/xóa transaction → amount_paid & status đúng. **Commit** `feat(db): trigger amount_paid/status hóa đơn`.

### Task 3: Tổng hợp hóa đơn TỰ ĐỘNG từ buổi học (P0)
**Files:** `server/finance/invoices.ts`
- [ ] **Step 1:** `previewInvoiceFromSessions({studentId, periodMonth})`: lấy buổi `status='completed'` && `is_billed=false` trong kỳ → trả danh sách dòng (session, fee) + tổng.
- [ ] **Step 2:** `createInvoiceFromSessions(...)`: tạo `invoices` + `invoice_items` theo buổi, đặt `sessions.is_billed=true` (transaction để tránh trùng); cho **chỉnh tay** dòng/giảm giá trước khi chốt.
- [ ] **Step 3:** `createManualInvoice(...)`: nhập `total_amount` trực tiếp (không cần items).
- [ ] **Step 4:** Test đơn vị: tổng hợp đúng số tiền; buổi đã `is_billed` **không** bị tính lại. **Commit** `feat(finance): tổng hợp hóa đơn tự động từ buổi`.

### Task 4: Ghi nhận thanh toán học phí
**Files:** `server/finance/payments.ts`
- [ ] **Step 1:** `recordTuitionPayment({invoiceId, amount, method, paidAt, reference})` → insert `transactions(type='income', invoice_id, student_id)` → trigger cập nhật hóa đơn.
- [ ] **Step 2:** Validate `amount>0`, không vượt quá còn nợ (cảnh báo nếu vượt). **Commit** `feat(finance): ghi thu học phí`.

### Task 5: Giao diện hóa đơn & công nợ
**Files:** `app/(app)/tai-chinh/phai-thu/**`, `components/finance/*`
- [ ] **Step 1:** Danh sách hóa đơn (lọc trạng thái/học sinh/hạn); màu cảnh báo quá hạn.
- [ ] **Step 2:** Chi tiết hóa đơn (dòng items) + nút "Ghi thanh toán"; nút "Tạo hóa đơn từ buổi trong kỳ".
- [ ] **Step 3:** Bảng công nợ theo học sinh & tổng (dùng `v_receivables_outstanding` — tạo ở GĐ7 hoặc query trực tiếp). **Commit** `feat(finance): UI hóa đơn & công nợ phải thu`.

### Task 6: Kiểm thử
- [ ] RLS: A không đọc/ghi `invoices`/`transactions` của B; ADMIN không đọc.
- [ ] Nghiệp vụ: thu một phần → `partial`; thu đủ → `paid`; tổng hợp lại **không** nhân đôi buổi đã `is_billed`.
- [ ] Số tiền `bigint` VND, không sai số. **Commit** `test: hóa đơn tự động + thanh toán + RLS`.

## DoD (đối chiếu ROADMAP §GĐ5)
- [ ] Tổng hợp hóa đơn tự động đúng; buổi đã lập hóa đơn không tính trùng.
- [ ] Ghi thanh toán → status & amount_paid cập nhật qua trigger.
- [ ] Tổng công nợ phải thu chính xác. RLS test PASS.

## Self-review
- Mô hình `transactions` thống nhất; hóa đơn tự động là điểm khác biệt so với CRUD thuần. Khớp `DATABASE.md §5.4`. Không placeholder.
