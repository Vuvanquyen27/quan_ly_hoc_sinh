# Giai đoạn 6 — Tài chính: Phải trả & Sổ thu/chi · Design

**Ngày:** 2026-07-15 · **Nhánh (dự kiến):** `feat/gd6-phai-tra`
**Trạng thái:** Đã chốt hướng (người dùng duyệt: điều hướng khu Tài chính bằng **sub-nav tabs**)
**Nguồn chân lý schema:** `docs/DATABASE.md §5.4` · **Roadmap:** `docs/ROADMAP.md §GĐ6` · **Plan tổng (cũ):** `docs/plans/GIAI_DOAN_6.md` (lưu ý: đánh số migration `0009` trong file đó **đã lỗi thời** — xem §2)
**Tiền đề:** GĐ5 đã xong & merge vào `main` (`invoices`/`invoice_items`/`transactions`/`categories` + trigger `recalc_invoice_paid` + RPC).

---

## 1. Mục tiêu & Phạm vi

Quản lý **khoản phải trả** (USER nợ người khác: thuê phòng, mua tài liệu, trả trợ giảng…); ghi **thu/chi tự do** phân loại theo danh mục; theo dõi **hạn thanh toán** hai chiều (phải thu + phải trả) và **lịch sử thanh toán**. Cách ly tuyệt đối theo `user_id` + RLS.

**Trong phạm vi:**
- Bảng `payables` (accrual) + trigger cập nhật `amount_paid`/`status` từ `transactions(type='expense', payable_id)`.
- Thêm FK `transactions.payable_id → payables(id)` (GĐ5 để cột trơn) + index `(user_id, payable_id)`.
- **Sổ thu/chi tự do**: dùng lại `transactions` (không gắn hóa đơn/khoản trả), gắn `category_id`.
- **Quản lý danh mục** `categories` (đã có schema + RLS từ GĐ5 — nay thêm UI CRUD).
- Màn hình **Hạn thanh toán** gộp `invoices` + `payables` (sắp tới / quá hạn).
- Màn hình **Lịch sử thanh toán** (timeline mọi `transactions` thu & chi).
- Điều hướng khu Tài chính bằng **sub-nav tabs** dùng chung.

**Ngoài phạm vi (YAGNI / để sau):**
- Phải trả **định kỳ** (recurring) — chưa cần ở MVP.
- View báo cáo `v_payables_outstanding`, `v_cashflow_monthly`, dashboard → **GĐ7**.
- Sửa/xóa từng dòng `transactions` đã gắn hóa đơn (quản qua hóa đơn như GĐ5); chỉ dòng **thu/chi tự do** mới cho xóa.
- Xuất CSV/Excel → GĐ7 (P1).

## 2. Quyết định thiết kế

| Vấn đề | Chọn | Lý do |
|---|---|---|
| **Số migration** | `0012_payables.sql` | 0009 = attendance, 0010/0011 = finance GĐ5; plan cũ ghi `0009_payables` là lỗi thời. |
| **enum `payable_status`** | `unpaid / partial / paid / cancelled` (KHÔNG có `overdue`) | Quá hạn **dẫn xuất khi hiển thị** (`due_date < today` & chưa trả đủ) — nhất quán với `invoices`, tránh cron cập nhật. |
| **FK `transactions.payable_id`** | Migration 0012 `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY (payable_id) REFERENCES payables(id) ON DELETE SET NULL` + `CREATE INDEX (user_id, payable_id)` | CHECK `payable_id ⇒ expense` đã tồn tại (0010); giờ mới có bảng để tham chiếu. |
| **Trigger chi** | Hàm mới `recalc_payable_paid()` + trigger **thứ 2** `trg_transactions_recalc_payable` trên `transactions`; mỗi trigger tự thoát sớm khi id của nó null | Gương `recalc_invoice_paid`; không sửa 0011; hai trigger AFTER cùng bảng chạy độc lập, an toàn. |
| **Điều hướng** | `app/(app)/tai-chinh/layout.tsx` render **sub-nav tabs**: Phải thu · Phải trả · Thu/chi · Hạn thanh toán · Lịch sử · Danh mục. Nav chính "Tài chính" giữ nguyên → `/tai-chinh/phai-thu` | Bottom-nav mobile đã 6 mục; tabs con gọn, mở rộng tốt (người dùng duyệt). |
| **Sổ thu/chi** | Form nhanh thêm 1 dòng thu **hoặc** chi (danh mục, phương thức, ngày, số tiền, ghi chú); danh sách lọc loại/danh mục/khoảng ngày; **xóa** được dòng tự do (chưa gắn invoice/payable) | Đáp ứng DoD "ghi thu/chi tự do có danh mục". |
| **Lịch sử thanh toán** | Trang read-only, timeline **mọi** `transactions` (gồm thu học phí GĐ5 + trả nợ + tự do) với nhãn nguồn (học sinh/chủ nợ/danh mục) | Kiểm toán dòng tiền; dùng chung query với Sổ thu/chi (DRY). |
| **Ghi trả nợ** | `recordPayablePayment` → insert `transactions(type='expense', payable_id, category_id kế thừa từ payable, method, occurred_at, reference)` → trigger cập nhật còn nợ | Gương `recordTuitionPayment` GĐ5. |
| **Hủy phải trả** | Xóa mềm `status='cancelled'` (trigger giữ nguyên `cancelled`) | CLAUDE.md §5.8 ưu tiên xóa mềm dữ liệu tài chính. |
| **Quản lý danh mục** | Create / Update (đổi tên) / **Archive mềm** (`is_archived=true`); danh mục đã archive ẩn khỏi dropdown nhưng giữ FK cũ | UNIQUE `(user_id, kind, name)` đã có; archive an toàn hơn xóa cứng. |

## 3. Schema — `0012_payables.sql`

```sql
create type public.payable_status as enum ('unpaid','partial','paid','cancelled');

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creditor_name text,
  category_id uuid references public.categories(id) on delete set null,
  title text,
  total_amount bigint not null default 0 check (total_amount >= 0),
  amount_paid bigint not null default 0,
  status public.payable_status not null default 'unpaid',
  due_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payables_user_status on public.payables (user_id, status);
create index idx_payables_user_due    on public.payables (user_id, due_date);

-- FK transactions.payable_id (GĐ5 để cột trơn) + index còn thiếu
alter table public.transactions
  add constraint transactions_payable_id_fkey
  foreign key (payable_id) references public.payables(id) on delete set null;
create index idx_transactions_user_payable on public.transactions (user_id, payable_id);

create trigger trg_payables_updated before update on public.payables
  for each row execute function public.set_updated_at();

-- RLS 4 policy thuần auth.uid() = user_id (không nhánh admin)
alter table public.payables enable row level security;
create policy payables_select on public.payables for select using (auth.uid() = user_id);
create policy payables_insert on public.payables for insert with check (auth.uid() = user_id);
create policy payables_update on public.payables for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy payables_delete on public.payables for delete using (auth.uid() = user_id);
```

## 4. Trigger — `recalc_payable_paid()` (trong `0012_payables.sql`)

Gương `recalc_invoice_paid` (0011): AFTER INSERT/UPDATE/DELETE trên `transactions`.

```sql
create or replace function public.recalc_payable_paid()
returns trigger language plpgsql as $$
declare pay_id uuid; paid bigint; tot bigint; cur_status public.payable_status;
begin
  pay_id := coalesce(new.payable_id, old.payable_id);
  if pay_id is null then return coalesce(new, old); end if;

  select coalesce(sum(amount), 0) into paid
    from public.transactions where payable_id = pay_id and type = 'expense';
  select total_amount, status into tot, cur_status
    from public.payables where id = pay_id;

  if cur_status = 'cancelled' then
    update public.payables set amount_paid = paid where id = pay_id;
    return coalesce(new, old);
  end if;

  update public.payables set amount_paid = paid,
    status = case
      when tot > 0 and paid >= tot then 'paid'::public.payable_status
      when paid > 0 then 'partial'::public.payable_status
      else 'unpaid'::public.payable_status end
    where id = pay_id;
  return coalesce(new, old);
end; $$;

create trigger trg_transactions_recalc_payable
  after insert or update or delete on public.transactions
  for each row execute function public.recalc_payable_paid();
```

> Cả hai trigger (`…recalc_invoice`, `…recalc_payable`) cùng chạy trên mỗi thay đổi `transactions`; mỗi hàm thoát sớm khi id liên quan null → không ảnh hưởng chéo.

## 5. Server (`server/finance/`) — giữ nguyên quy ước tách **read** / **write**

Read = file thường (import trực tiếp trong Server Component). Write = file `'use server'` (Server Action). Tách theo mối quan tâm để mỗi file gọn.

- **Validators** (`lib/validators/`, + unit test):
  - `payable.ts`: `creditorName?`, `title?`, `categoryId?`, `totalAmount ≥ 0 int`, `dueDate?`, `note?`.
  - `transaction.ts`: `type ∈ {income,expense}`, `amount int > 0`, `categoryId?`, `occurredAt?`, `method`, `reference?`, `note?`.
  - **Mở rộng `lib/validators/payment.ts`** thêm `payablePaymentSchema` (`payableId`, `amount int > 0`, `method`, `paidAt?`, `reference?`) — tái dùng `PAYMENT_METHODS` + `PAYMENT_METHOD_LABEL` sẵn có.
  - `category.ts`: `kind ∈ {income,expense}`, `name` (trim, min 1).
- **Read:**
  - `payables.ts`: `listPayables({status?, page?})` (JOIN `categories(name)`), `getPayable(id)` (kèm `transactions` chi), `payablesTotal()` (còn nợ = Σ`total_amount - amount_paid` khi status ∉ {paid,cancelled}).
  - `ledger.ts`: `listTransactions({type?, categoryId?, from?, to?, page?})` (enrich nhãn nguồn từ `invoice_id`/`payable_id`/`category_id`) — **dùng chung cho Sổ thu/chi & Lịch sử**; `listUpcomingDue()` gộp `invoices`+`payables` chưa `paid/cancelled` có `due_date`, chia **quá hạn / sắp tới**, sắp theo `due_date`.
  - `categories.ts`: `listCategories({kind?, includeArchived?})`.
- **Write (`'use server'`)**, tất cả gate `requireWritable`, **không** nhận `user_id`:
  - `payables-actions.ts`: `createPayable` · `updatePayable` · `cancelPayableAction` · `recordPayablePayment`.
  - `ledger-actions.ts`: `createTransaction` (thu/chi tự do) · `deleteTransactionAction` (chỉ dòng tự do — `invoice_id IS NULL AND payable_id IS NULL`).
  - `categories-actions.ts`: `createCategory` · `updateCategory` · `archiveCategoryAction`.

## 6. Giao diện (`app/(app)/tai-chinh/**`)

- `layout.tsx`: sub-nav tabs (Phải thu · Phải trả · Thu/chi · Hạn thanh toán · Lịch sử · Danh mục), đánh dấu tab active theo `pathname`; render responsive (scroll ngang trên mobile). Bọc mọi trang con `/tai-chinh/*`.
- `phai-tra/page.tsx`: tổng còn nợ + danh sách (chủ nợ, danh mục, tổng/còn nợ, hạn + badge **quá hạn** dẫn xuất, trạng thái); lọc trạng thái; responsive bảng/card; nút "+ Thêm khoản phải trả".
- `phai-tra/moi/page.tsx`: form tạo (chủ nợ, danh mục expense, tiêu đề, tổng, hạn, ghi chú).
- `phai-tra/[id]/page.tsx`: chi tiết + form **ghi trả** (số tiền/phương thức/ngày/tham chiếu) + lịch sử giao dịch chi + nút **hủy** (ẩn form khi đã trả đủ/hủy).
- `thu-chi/page.tsx`: form nhanh thêm dòng thu/chi (danh mục theo `type`, phương thức, ngày, số tiền, ghi chú); danh sách lọc loại/danh mục/khoảng ngày; xóa dòng tự do.
- `han-thanh-toan/page.tsx`: gộp 2 chiều — mục "Quá hạn" (đỏ) và "Sắp tới", mỗi dòng: chiều (Thu/Trả), tên (học sinh/chủ nợ), còn lại, hạn, link tới chi tiết. Sắp theo `due_date`.
- `lich-su/page.tsx`: timeline `transactions` (thu/chi) theo `occurred_at` giảm dần, nhãn nguồn + phương thức + tham chiếu; lọc loại/khoảng ngày.
- `danh-muc/page.tsx`: CRUD categories theo nhóm income/expense (thêm nhanh, đổi tên, archive).
- Chỉ semantic token; tiền `formatVND`; ngày `formatDate` (`Asia/Ho_Chi_Minh`).

## 7. Kiểm thử — release blocker

- `scripts/test-rls-payables.mjs`: cách ly `payables` (A/B/admin; A không đọc/ghi/sửa/xóa của B; giả mạo `user_id` → 403; admin không đọc). `categories`/`transactions` RLS đã PASS ở GĐ5 (`test-rls-finance.mjs`).
- `scripts/test-payable-flow.mjs` (raw fetch, `service_role` tạo dữ liệu rồi kiểm qua USER token): tạo phải trả `total` → trả một phần → `partial` + `amount_paid` đúng; trả đủ → `paid`; trigger đúng qua INSERT/DELETE; số tiền `bigint` chính xác; quá hạn dẫn xuất đúng.
- Unit test 3 validators (`payable`, `transaction`, `category`).
- **Đóng GĐ:** `tsc && npm test && npm run lint && npm run build` xanh + mọi test RLS PASS.

## 8. DoD (đối chiếu ROADMAP §GĐ6)

- [ ] Tạo khoản phải trả, trả dần → công nợ còn lại cập nhật đúng (qua trigger).
- [ ] Ghi thu/chi tự do vào sổ; phân loại theo danh mục.
- [ ] Màn hình hạn thanh toán hiển thị đúng khoản sắp tới/quá hạn (cả 2 chiều).
- [ ] RLS test cho `payables` (+ `categories` đã có) PASS; ADMIN không đọc được `payables`.

## 9. Tài liệu liên quan
- `docs/DATABASE.md §5.4` (schema) · `docs/ROADMAP.md §GĐ6` · `docs/superpowers/specs/2026-07-15-5-phai-thu-design.md` (mẫu GĐ5) · `docs/IMPLEMENTATION_STATUS.md`.
