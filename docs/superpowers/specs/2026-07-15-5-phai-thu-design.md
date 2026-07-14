# Giai đoạn 5 — Tài chính: Phải thu & Hóa đơn tự động · Design

**Ngày:** 2026-07-15 · **Nhánh:** `feat/gd5-phai-thu`
**Trạng thái:** Đã chốt hướng (người dùng duyệt: route `/tai-chinh/phai-thu`, chia 5A→5B)
**Nguồn chân lý schema:** `docs/DATABASE.md §5.4` · **Roadmap:** `docs/ROADMAP.md §GĐ5` · **Plan tổng:** `docs/plans/GIAI_DOAN_5.md`

---

## 1. Mục tiêu & Phạm vi

Lập **hóa đơn công nợ học phí** — tự động tổng hợp từ buổi đã hoàn thành trong kỳ (P0) + tạo tay; ghi nhận **thu học phí**; theo dõi **công nợ phải thu**. Cách ly tuyệt đối theo `user_id` + RLS.

**Trong phạm vi:** `invoices`, `invoice_items`, `transactions` (income gắn hóa đơn), bảng `categories` (schema + RLS, chưa UI).
**Ngoài phạm vi (→ GĐ6):** khoản phải trả (`payables`), sổ thu/chi tự do, UI quản lý danh mục. **(→ GĐ7):** view báo cáo (`v_receivables_outstanding`), dashboard.

## 2. Quyết định thiết kế

| Quyết định | Chọn | Lý do |
|---|---|---|
| **Route** | `/tai-chinh/phai-thu` (khu "Tài chính" gom nhóm) | Người dùng chọn; mở rộng GĐ6/7. |
| **Chia giai đoạn** | **5A** nền tảng (DB+trigger+server+test) → checkpoint → **5B** UI | Người dùng chọn; review sớm cho phần tài chính nhạy cảm. |
| **Hóa đơn tự động** | preview (không lưu) → tạo thẳng `unpaid`; bỏ `draft` ở MVP | Đơn giản; vẫn sửa hóa đơn sau khi tạo. |
| **`overdue`** | dẫn xuất khi hiển thị (`due_date < today` & chưa trả đủ) | Tránh cron cập nhật status; status DB chỉ dùng `unpaid/partial/paid/cancelled`. |
| **`categories`** | tạo schema + RLS ở 5A; UI quản lý → GĐ6 | `transactions.category_id` FK tới nó; giữ FK toàn vẹn từ đầu. |
| **Chống tính trùng** | tạo hóa đơn từ buổi đặt `sessions.is_billed=true` trong **1 transaction DB** | Buổi đã lập hóa đơn không bị gộp lại. |
| **Cache tiền đã thu** | `invoices.amount_paid`/`status` cập nhật bằng **trigger** từ `transactions` | Nguồn duy nhất là dòng tiền; báo cáo đọc `transactions`. |
| **Công nợ** | query trực tiếp `SUM(total_amount - amount_paid)` (invoices chưa `paid/cancelled`) | View `v_receivables` để GĐ7. |

## 3. Schema — `0010_finance_receivables.sql`

Enums:
```sql
create type public.invoice_status   as enum ('draft','unpaid','partial','paid','overdue','cancelled');
create type public.transaction_type as enum ('income','expense');
create type public.payment_method   as enum ('cash','bank_transfer','e_wallet','other');
create type public.category_kind    as enum ('income','expense');
```

**`categories`** — `id`, `user_id` (default auth.uid()), `kind category_kind`, `name text`, `is_archived boolean default false`, timestamps. `UNIQUE(user_id, kind, name)`.

**`invoices`** — `id`, `user_id`, `student_id` → students **RESTRICT**, `code text`, `title text`, `period_month date`, `subtotal bigint`, `discount bigint default 0`, `total_amount bigint CHECK (total_amount >= 0)`, `amount_paid bigint default 0`, `status invoice_status default 'unpaid'`, `issue_date date`, `due_date date`, `note text`, timestamps. Index `(user_id, status)`, `(user_id, student_id)`, `(user_id, due_date)`.

**`invoice_items`** — `id`, `user_id`, `invoice_id` → invoices **CASCADE**, `session_id` → sessions **SET NULL** (nullable), `description text`, `quantity numeric default 1`, `unit_price bigint`, `amount bigint`. Index `(user_id, invoice_id)`.

**`transactions`** — `id`, `user_id`, `type transaction_type`, `amount bigint CHECK (amount > 0)`, `occurred_at timestamptz default now()`, `method payment_method default 'cash'`, `category_id` → categories SET NULL (nullable), `student_id` → students SET NULL (nullable), `invoice_id` → invoices SET NULL (nullable), `payable_id uuid` (nullable, FK ở GĐ6), `reference text`, `note text`, timestamps. CHECK `(invoice_id IS NULL OR type = 'income')`. Index `(user_id, occurred_at)`, `(user_id, type)`, `(user_id, invoice_id)`.

> `payable_id` để cột trơn (chưa FK) ở GĐ5 vì bảng `payables` chưa tồn tại; GĐ6 sẽ thêm FK. **Hoặc** bỏ hẳn cột đến GĐ6 — chọn: **thêm cột `payable_id uuid` không FK** để tránh migration đổi cột lớn sau, ghi CHECK `(payable_id IS NULL OR type = 'expense')`.

Mỗi bảng: RLS 4 policy thuần `auth.uid() = user_id` (không nhánh admin), trigger `set_updated_at` (trừ bảng không có `updated_at` — ở đây `invoice_items` không có updated_at nên không trigger).

## 4. Trigger — `0011_invoice_paid_trigger.sql`

Hàm `public.recalc_invoice_paid()` + trigger AFTER INSERT/UPDATE/DELETE trên `transactions`:
- Xác định `invoice_id` liên quan (từ NEW hoặc OLD).
- Nếu không null: `amount_paid = COALESCE(SUM(amount) FILTER (type='income'), 0)` cho `invoice_id` đó; đặt `status`:
  - `paid` nếu `amount_paid >= total_amount` (và total > 0),
  - `partial` nếu `0 < amount_paid < total_amount`,
  - `unpaid` nếu `amount_paid = 0` (giữ `cancelled`/`draft` nếu đang ở trạng thái đó — MVP không có draft nên chỉ tránh ghi đè `cancelled`).
- SECURITY: hàm chạy trong ngữ cảnh RLS của USER (không `security definer` để tránh vượt cách ly) — kiểm thử kỹ.

## 5. Server (`server/finance/`) — 5A

- `lib/validators/invoice.ts`, `lib/validators/payment.ts` (+ test).
- `server/finance/invoices.ts`:
  - `previewInvoiceFromSessions({ studentId, periodMonth })` → `{ items: {sessionId, description, amount}[], subtotal }` (buổi `completed` & `is_billed=false` trong kỳ).
  - `createInvoiceFromSessions(input)` → tạo `invoices` + `invoice_items` + đặt `sessions.is_billed=true` (RPC/transaction); trả id.
  - `createManualInvoice(input)` → nhập `total_amount`/items tay.
  - `listInvoices({ status?, studentId?, page })`, `getInvoice(id)` (kèm items + transactions).
  - `updateInvoice`, `cancelInvoice` (xóa mềm bằng `status='cancelled'`).
- `server/finance/payments.ts`:
  - `recordTuitionPayment({ invoiceId, amount, method, occurredAt, reference })` → insert `transactions(type='income', invoice_id, student_id)`; validate `amount>0`, cảnh báo nếu vượt còn nợ.
- `server/finance/queries.ts`: `receivablesByStudent()`, `receivablesTotal()`.
- Tất cả gate `requireWritable`; **không** nhận `user_id` từ client.

## 6. Giao diện (`app/(app)/tai-chinh/**`) — 5B

- Nav "Tài chính" → `/tai-chinh/phai-thu`.
- Danh sách hóa đơn: lọc trạng thái/học sinh; badge quá hạn (dẫn xuất due_date); cột tổng/đã thu/còn nợ. Responsive bảng/card.
- Chi tiết hóa đơn `/tai-chinh/phai-thu/[id]`: items, tổng, đã thu, còn nợ; nút "Ghi thanh toán" (form: số tiền/phương thức/ngày/tham chiếu); lịch sử giao dịch.
- Tạo hóa đơn `/tai-chinh/phai-thu/moi`: chọn học sinh + kỳ (tháng) → preview buổi → chỉnh (discount) → tạo; hoặc nhập tay.
- Bảng công nợ: theo học sinh + tổng.
- Chỉ semantic token; VND `formatVND`; ngày `Asia/Ho_Chi_Minh`.

## 7. Kiểm thử — release blocker

**5A:**
- `scripts/test-rls-finance.mjs`: cách ly `invoices`/`invoice_items`/`transactions`/`categories` (A/B/admin; giả mạo `user_id` 403; admin không đọc).
- Unit test validators.
- Script nghiệp vụ `scripts/test-invoice-flow.mjs` (raw fetch, service_role tạo dữ liệu rồi kiểm qua USER token): thu một phần → `partial`; thu đủ → `paid`; tổng hợp lại **không** nhân đôi buổi đã `is_billed`; số tiền `bigint` chính xác.

**Đóng GĐ (sau 5B):** `tsc && npm test && npm run lint && npm run build` xanh + mọi test RLS PASS.

## 8. DoD (đối chiếu ROADMAP §GĐ5)
- [ ] Tổng hợp hóa đơn tự động đúng số tiền; buổi đã `is_billed` không tính trùng.
- [ ] Ghi thanh toán một phần/đủ → `amount_paid`/`status` cập nhật đúng qua trigger.
- [ ] Tổng công nợ phải thu (theo học sinh & tổng) chính xác.
- [ ] Tiền `bigint` VND, hiển thị `vi-VN`, không sai số.
- [ ] RLS test `invoices`/`transactions`/`categories` PASS.
