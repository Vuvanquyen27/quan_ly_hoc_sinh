# Giai đoạn 6 — Tài chính: Phải trả & Thu/Chi · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** Quản lý khoản **phải trả** (USER nợ người khác); ghi **thu/chi tự do**; màn hình **hạn thanh toán** (gộp phải thu + phải trả) và **lịch sử thanh toán**.

**Architecture:** `payables` (accrual) + dùng lại `transactions` (GĐ5) cho dòng tiền chi. Trigger cập nhật `payables.amount_paid`/`status` từ `transactions(type='expense', payable_id)`.

## Global Constraints
- RLS `auth.uid()=user_id`; `CHECK (payable_id IS NULL OR type='expense')`. Tiền `bigint` VND. TDD + commit.

**Phụ thuộc:** Giai đoạn 5 (`transactions`, `categories`, trigger mẫu).

---

### Task 1: Migration `payables` + trigger + RLS
**Files:** Create `supabase/migrations/0009_payables.sql`
- [ ] **Step 1:** Enum `payable_status`; bảng `payables` theo `DATABASE.md §5.4`; chỉ mục `(user_id, status)`, `(user_id, due_date)`.
- [ ] **Step 2:** RLS 4 policy (khuôn mẫu GĐ2).
- [ ] **Step 3:** Trigger cập nhật `payables.amount_paid`/`status` từ `transactions(type='expense', payable_id)` (tương tự trigger hóa đơn GĐ5). `supabase db push`. **Commit** `feat(db): payables + trigger + RLS`.

### Task 2: Actions phải trả & trả nợ
**Files:** `lib/validators/payable.ts`, `server/finance/payables.ts`
- [ ] **Step 1:** `createPayable/updatePayable/listPayables` (creditor, category, total, due_date).
- [ ] **Step 2:** `recordPayablePayment({payableId, amount, method, paidAt})` → insert `transactions(type='expense', payable_id)` → trigger cập nhật còn nợ.
- [ ] **Step 3:** **Commit** `feat(finance): phải trả + trả nợ`.

### Task 3: Sổ thu/chi tự do & danh mục
**Files:** `server/finance/transactions.ts`, `server/finance/categories.ts`
- [ ] **Step 1:** `createTransaction` thu/chi không gắn hóa đơn/khoản trả (gắn `category_id`); `listTransactions({type, categoryId, from, to})`.
- [ ] **Step 2:** CRUD `categories` (kind income/expense); unique `(user_id, kind, name)`.
- [ ] **Step 3:** **Commit** `feat(finance): sổ thu/chi + danh mục`.

### Task 4: Giao diện phải trả + sổ thu/chi
**Files:** `app/(app)/tai-chinh/phai-tra/**`, `app/(app)/tai-chinh/thu-chi/**`
- [ ] **Step 1:** Danh sách phải trả (hạn, còn nợ) + trả dần.
- [ ] **Step 2:** Sổ thu/chi (lọc loại/danh mục/khoảng thời gian) + form nhanh. **Commit** `feat(finance): UI phải trả + thu/chi`.

### Task 5: Hạn thanh toán (gộp) + Lịch sử thanh toán
**Files:** `app/(app)/tai-chinh/han-thanh-toan/**`, `app/(app)/tai-chinh/lich-su/**`
- [ ] **Step 1:** Màn hình hạn: gộp `invoices` (phải thu) + `payables` (phải trả) sắp tới/quá hạn, sắp theo `due_date`.
- [ ] **Step 2:** Lịch sử thanh toán: liệt kê `transactions` (thu & chi) theo thời gian, phương thức, tham chiếu. **Commit** `feat(finance): hạn thanh toán + lịch sử`.

### Task 6: Kiểm thử
- [ ] RLS: A không đọc/ghi `payables`/`categories`/`transactions` của B; ADMIN không đọc.
- [ ] Nghiệp vụ: trả dần → còn nợ giảm đúng; hạn quá hạn hiển thị đúng cả 2 chiều. **Commit** `test: payables + thu/chi + RLS`.

## DoD (đối chiếu ROADMAP §GĐ6)
- [ ] Tạo khoản phải trả, trả dần → còn nợ đúng.
- [ ] Ghi thu/chi tự do có danh mục.
- [ ] Màn hình hạn hiển thị đúng khoản sắp tới/quá hạn (2 chiều). RLS test PASS.

## Self-review
- Tái dùng `transactions` + mẫu trigger GĐ5 (DRY). Khớp `DATABASE.md §5.4`. Không placeholder.
