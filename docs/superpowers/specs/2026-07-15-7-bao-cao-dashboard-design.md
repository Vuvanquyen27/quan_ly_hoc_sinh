# Giai đoạn 7 — Báo cáo & Dashboard · Design

**Ngày:** 2026-07-15 · **Nhánh (dự kiến):** `feat/gd7-bao-cao`
**Trạng thái:** Đã chốt hướng (người dùng duyệt: biểu đồ **CSS/SVG tự vẽ**, không thêm thư viện)
**Nguồn chân lý:** `docs/DATABASE.md §9` (views) · `docs/ROADMAP.md §GĐ7` · plan tổng `docs/plans/GIAI_DOAN_7.md`
**Tiền đề:** GĐ5 (`invoices`/`transactions`) + GĐ6 (`payables`, `listUpcomingDue`) đã xong & merge `main`.

---

## 1. Mục tiêu & Phạm vi

Cung cấp **báo cáo** doanh thu/chi phí/dòng tiền/công nợ và **dashboard tổng quan** cho giáo viên — đọc-thôi, cách ly tuyệt đối theo `user_id` (RLS kế thừa qua view `security_invoker`).

**Trong phạm vi:**
- 4 view báo cáo (`security_invoker=true`): `v_cashflow_monthly`, `v_receivables_outstanding`, `v_payables_outstanding`, `v_upcoming_sessions`.
- Server read `server/reports/queries.ts` đọc view + thống kê dashboard.
- Trang **Báo cáo** `/bao-cao`: chọn kỳ → tổng thu/chi/lợi nhuận/dòng tiền ròng + công nợ phải thu (theo học sinh) & phải trả + danh sách quá hạn + biểu đồ dòng tiền theo tháng.
- **Dashboard** `/tong-quan` (nâng cấp): thẻ chỉ số nhanh, "Buổi sắp tới", cảnh báo quá hạn, biểu đồ dòng tiền 6 tháng.
- Biểu đồ **CSS/SVG tự vẽ** (`components/reports/cashflow-chart.tsx`), 0 thư viện mới.
- Nav "Báo cáo" (mục thứ 7).

**Ngoài phạm vi (YAGNI / P1):** xuất CSV/Excel; `v_revenue_by_student`; biểu đồ tương tác nâng cao; báo cáo theo học sinh chi tiết.

## 2. Quyết định thiết kế

| Vấn đề | Chọn | Lý do |
|---|---|---|
| **Số migration** | `0013_report_views.sql` | 0010–0012 đã dùng (plan cũ ghi `0010` là lỗi thời). |
| **Nguồn số liệu** | 4 view `security_invoker=true` | Roadmap + DATABASE.md §9; kế thừa RLS bảng cơ sở → RLS-test được. |
| **⚠ Múi giờ gom tháng** | `date_trunc('month', occurred_at at time zone 'Asia/Ho_Chi_Minh')` | DATABASE.md §9 dùng UTC → giao dịch đầu/cuối tháng lệch tháng; sửa như RPC GĐ5. |
| **Quyền đọc view** | `grant select on <view> to authenticated` trong migration | PostgREST cần quyền SELECT; RLS vẫn chặn cross-user vì `security_invoker`. |
| **Biểu đồ** | CSS/SVG tự vẽ (cột thu/chi + đường ròng) | Người dùng chọn; 0 dependency; nhẹ, hợp mobile-first + LCP<2.5s. |
| **Cảnh báo quá hạn** | Dùng lại `listUpcomingDue()` (GĐ6) | DRY; đã gộp 2 chiều + đã test. |
| **Công nợ phải trả** | `v_payables_outstanding` tổng theo `user_id` | Danh sách chi tiết đã có ở `/tai-chinh/phai-tra`; báo cáo chỉ cần tổng. |
| **Dashboard** | Nâng cấp `/tong-quan` (thay 2 thẻ "—") | Không tạo route mới; giữ thẻ Thuê bao sẵn có. |
| **Nav "Báo cáo"** | Mục thứ 7, icon `BarChart3` → `/bao-cao` | Tính năng chính; bottom-nav 7 item vẫn vừa điện thoại phổ thông. |

## 3. Views — `0013_report_views.sql`

Tất cả `with (security_invoker = true)` + `grant select ... to authenticated`.

```sql
-- Dòng tiền theo tháng (giờ VN)
create view public.v_cashflow_monthly with (security_invoker = true) as
select
  user_id,
  date_trunc('month', (occurred_at at time zone 'Asia/Ho_Chi_Minh')) as month,
  coalesce(sum(amount) filter (where type = 'income'), 0)  as total_income,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as total_expense,
  coalesce(sum(amount) filter (where type = 'income'), 0)
    - coalesce(sum(amount) filter (where type = 'expense'), 0) as net_cashflow
from public.transactions
group by user_id, date_trunc('month', (occurred_at at time zone 'Asia/Ho_Chi_Minh'));

-- Phải thu còn lại theo học sinh
create view public.v_receivables_outstanding with (security_invoker = true) as
select i.user_id, i.student_id, s.full_name as student_name,
  sum(i.total_amount - i.amount_paid) as outstanding
from public.invoices i
join public.students s on s.id = i.student_id
where i.status not in ('paid','cancelled')
group by i.user_id, i.student_id, s.full_name;

-- Phải trả còn lại (tổng)
create view public.v_payables_outstanding with (security_invoker = true) as
select user_id, sum(total_amount - amount_paid) as outstanding
from public.payables
where status not in ('paid','cancelled')
group by user_id;

-- Buổi sắp tới (7 ngày)
create view public.v_upcoming_sessions with (security_invoker = true) as
select se.user_id, se.id, se.student_id, st.full_name as student_name,
  se.start_time, se.end_time, se.status
from public.sessions se
join public.students st on st.id = se.student_id
where se.status = 'scheduled'
  and se.start_time >= now()
  and se.start_time < now() + interval '7 days';

grant select on public.v_cashflow_monthly, public.v_receivables_outstanding,
  public.v_payables_outstanding, public.v_upcoming_sessions to authenticated;
```

> Ghi chú kiểm chứng khi code: xác nhận tên cột `sessions` (`start_time`/`end_time`/`status`/`student_id`) khớp `0008_sessions.sql`; không `order by` trong view (sắp ở app).

## 4. Server — `server/reports/queries.ts` (read, không `'use server'`)

- `cashflowMonthly({ months })` / `cashflowRange({ fromMonth, toMonth })` → đọc `v_cashflow_monthly`, trả `{ month, total_income, total_expense, net_cashflow }[]` (điền tháng trống = 0 ở app cho biểu đồ liên tục).
- `receivablesOutstanding()` → `v_receivables_outstanding` (theo học sinh) + tổng.
- `payablesOutstanding()` → `v_payables_outstanding` (tổng).
- `upcomingSessions()` → `v_upcoming_sessions`, sắp `start_time` tăng.
- `dashboardStats()` → tổng hợp cho dashboard: số học sinh đang quản lý (`students` `archived_at IS NULL`; đối chiếu semantics `status` khi code), số buổi tuần này (`sessions` `scheduled` trong tuần theo giờ VN), phải thu tổng (`v_receivables_outstanding`), thu–chi tháng hiện tại (từ `v_cashflow_monthly`).
- `reportSummary({ fromMonth, toMonth })` → tổng thu/chi/lợi nhuận/ròng trong kỳ (cộng dồn từ `v_cashflow_monthly`).

## 5. Giao diện

- `components/reports/cashflow-chart.tsx` — biểu đồ CSS/SVG: mỗi tháng 1 cặp cột (thu xanh, chi đỏ) tỉ lệ theo `max`, tooltip `title`, nhãn tháng `MM/YY`; đường/điểm ròng tùy chọn; responsive (scroll ngang nếu hẹp); token semantic.
- `components/reports/stat-card.tsx` — thẻ chỉ số (tái dùng khuôn `StatCard` sẵn ở `/tong-quan`, tách ra dùng chung).
- `/bao-cao/page.tsx` — bộ chọn kỳ (query param `from`/`to` dạng `YYYY-MM`, mặc định 6 tháng gần nhất) → thẻ tổng (thu/chi/lợi nhuận/ròng) + biểu đồ + bảng phải thu (theo HS) + tổng phải trả + danh sách quá hạn (từ `listUpcomingDue`). Responsive bảng/card.
- `/tong-quan/page.tsx` (nâng cấp) — giữ thẻ Thuê bao; thêm thẻ: học sinh đang học, buổi tuần này, phải thu, dòng tiền tháng; "Buổi sắp tới" (list); cảnh báo quá hạn (đỏ, từ `listUpcomingDue().overdue`); biểu đồ dòng tiền 6 tháng.
- `components/app-nav.tsx` — thêm mục `{ href: '/bao-cao', label: 'Báo cáo', icon: BarChart3 }`.
- Tiền `formatVND`; ngày `formatDate`/`formatDateTime` (`Asia/Ho_Chi_Minh`).

## 6. Kiểm thử — release blocker

- `scripts/test-rls-report-views.mjs`: A tạo dữ liệu (transaction/invoice/payable/session); B & admin query **cả 4 view** → **0 dòng** (security_invoker cách ly); A thấy dữ liệu của mình. Giả lập qua REST `/rest/v1/v_*`.
- Đối chiếu thủ công 1 tháng mẫu: tổng thu/chi/công nợ từ view khớp tính tay từ bảng nguồn.
- Đóng GĐ: `tsc && npm test && npm run lint && npm run build` xanh; không hồi quy GĐ5/6.

## 7. DoD (đối chiếu ROADMAP §GĐ7)
- [ ] Số liệu báo cáo khớp nguồn (đối chiếu 1 tháng).
- [ ] Views tôn trọng RLS: A **không** thấy số của B (script PASS).
- [ ] Dashboard hiển thị chỉ số thật + buổi sắp tới + cảnh báo quá hạn + biểu đồ; responsive, tải nhanh.

## 8. Tài liệu liên quan
- `docs/DATABASE.md §9` · `docs/ROADMAP.md §GĐ7` · `docs/plans/GIAI_DOAN_7.md` · spec GĐ6 `2026-07-15-6-phai-tra-thu-chi-design.md` (mẫu) · `docs/IMPLEMENTATION_STATUS.md`.
