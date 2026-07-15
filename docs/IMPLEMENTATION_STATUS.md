# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-15
**Giai đoạn hiện tại:** Giai đoạn 7 **đã hoàn tất** (Báo cáo & Dashboard — views + server + UI); kế tiếp **Giai đoạn 8 — Cài đặt & Thông báo**
**Nhánh làm việc:** `feat/gd7-bao-cao` (chuẩn bị merge vào `main`)

---

## 1. Tiến độ theo giai đoạn

| GĐ | Tên | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Nền móng dự án | ✅ Xong | Next.js + TS + Tailwind + shadcn/ui, 3 Supabase client, middleware (`proxy.ts`), format `vi-VN` |
| 1 | Xác thực & Hồ sơ | ✅ Xong | Đăng ký/đăng nhập/quên MK, trigger tạo profiles+user_settings+subscriptions, bảo vệ route, gating chỉ-đọc; RLS GĐ1 đạt |
| 2 | Quản lý học sinh | ✅ Xong | CRUD + phân trang + test đơn vị; migration `0004` đã áp; **cách ly RLS students PASS** |
| 3A | Bài học (`lessons`) | ✅ Xong | CRUD + Markdown (sanitize) + phân trang; migration `0005` đã áp; **cách ly RLS lessons PASS** |
| 3B | Tài liệu + Storage | ✅ Xong | migration `0006`/`0007` áp; CRUD tài liệu (file+link) + signed URL + đính kèm bài học/học sinh; **cách ly RLS documents + Storage PASS** |
| 4A | Lịch & Buổi học | ✅ Xong | migration `0008` áp; RLS sessions PASS; lịch Danh sách/Ngày/Tuần; tạo/sửa buổi; chuyển trạng thái scheduled→completed/cancelled |
| 4B | Điểm danh (`attendance`) | ✅ Xong | migration `0009` áp; RLS attendance PASS; upsert điểm danh trong trang sửa buổi; lịch sử trong chi tiết học sinh |
| 5A | Tài chính: Phải thu (nền tảng) | ✅ Xong | migration `0010`/`0011`; RLS finance PASS; trigger `amount_paid`/`status` + RPC tổng hợp hóa đơn (chống tính trùng); server queries/actions |
| 5B | Tài chính: Phải thu (giao diện) | ✅ Xong | nav Tài chính; danh sách + công nợ; chi tiết + ghi thu + hủy; tạo từ buổi (preview) + thủ công |
| 6 | Tài chính: Phải trả & Sổ thu/chi | ✅ Xong | migration `0012`; RLS payables PASS; trigger `recalc_payable_paid`; sub-nav tabs; phải trả (list/tạo/chi tiết/sửa/trả dần); sổ thu/chi + danh mục; hạn thanh toán (gộp 2 chiều) + lịch sử |
| 7 | Báo cáo & Dashboard | ✅ Xong | migration `0013` (4 view `security_invoker`, gom tháng giờ VN); RLS view PASS + đối chiếu số liệu PASS; `/bao-cao` (kỳ + tổng + biểu đồ CSS/SVG + công nợ + quá hạn); `/tong-quan` chỉ số thật + buổi sắp tới + cảnh báo + biểu đồ 6 tháng; nav "Báo cáo" |
| 8–10 | (Cài đặt → Phát hành) | ⏳ Chưa | Theo `docs/ROADMAP.md` |

---

## 2. Chi tiết Giai đoạn 3B (đối chiếu `docs/superpowers/plans/2026-07-14-3b-tai-lieu.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0006_documents.sql` (bảng + RLS 4 policy + 2 index) | ✅ Áp lên DB | FK `lesson_id`/`student_id` SET NULL khi xóa bài học/học sinh |
| Migration `0007_storage_documents.sql` (bucket riêng tư + policy) | ✅ Áp lên DB | Bucket `documents` private; policy theo tiền tố `user_id/` |
| Validator Zod `lib/validators/document.ts` + test | ✅ Xong | 5 test PASS |
| Storage module `server/documents/storage.ts` (upload/signedUrl/delete) | ✅ Xong | Signed URL phát phía server, không nhận `user_id` từ client |
| Queries `listDocuments`/`getDocument` | ✅ Xong | Phân trang, lọc theo `lesson_id`/`student_id` |
| Actions `saveDocument`/`deleteDocumentAction` | ✅ Xong | Gate `requireWritable`, xóa object Storage khi xóa tài liệu file |
| Nav "Tài liệu" trong sidebar | ✅ Xong | Liên kết `/tai-lieu` |
| Form tài liệu (`document-form.tsx`) | ✅ Xong | Toggle file/link, upload input, đính kèm bài học |
| Trang danh sách `/tai-lieu` | ✅ Xong | Phân trang, responsive bảng/card |
| Trang thêm `/tai-lieu/moi` & sửa `/tai-lieu/[id]/sua` | ✅ Xong | Dùng chung form |
| Tích hợp vào chi tiết bài học (`/bai-hoc/[id]`) | ✅ Xong | Section "Tài liệu đính kèm" với danh sách + nút thêm |
| Tích hợp vào chi tiết học sinh (`/hoc-sinh/[id]`) | ✅ Ghi chú | Placeholder text "Lịch sử buổi học" / "Công nợ" được thay bằng section "Tài liệu liên quan"; các module Lịch/Tài chính đến GĐ4+ |
| Script test cách ly RLS+Storage `scripts/test-rls-documents.mjs` | ✅ PASS | A/B/admin; đọc-ghi chéo; giả mạo `user_id` 403; B không upload vào tiền tố A; signed URL cách ly |

---

## 3. Chi tiết Giai đoạn 4A (đối chiếu `docs/superpowers/plans/2026-07-14-4a-buoi-hoc.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0008_sessions.sql` (bảng + RLS 4 policy + index) | ✅ Áp lên DB | FK `student_id` → students CASCADE; status CHECK |
| `lib/datetime.ts` + test | ✅ Xong | Hàm tiện ích thời gian `Asia/Ho_Chi_Minh`, tái sử dụng `lib/format.ts` |
| Validator Zod `lib/validators/session.ts` + test | ✅ Xong | Validate startTime < endTime, status, format, học phí |
| Queries `server/sessions/queries.ts` (`listSessions`/`getSession`) | ✅ Xong | Lọc theo ngày/tuần, JOIN student name |
| Actions `server/sessions/actions.ts` (`saveSession`/`changeSessionStatus`) | ✅ Xong | Gate `requireWritable`; không nhận `user_id` từ client |
| Nav "Lịch dạy" trong sidebar | ✅ Xong | Liên kết `/lich-day` |
| Component `session-form.tsx` (form tạo/sửa buổi) | ✅ Xong | Chọn học sinh, giờ, hình thức, học phí tự điền từ `default_fee` |
| Component `session-card.tsx` + `calendar-view.tsx` (lịch Danh sách/Ngày/Tuần) | ✅ Xong | Điều hướng tiến/lùi, hiển thị đúng `Asia/Ho_Chi_Minh`; gợi ý hoàn thành buổi quá giờ |
| Trang `/lich-day` (danh sách + lịch) | ✅ Xong | Tab chế độ xem; phân trang |
| Trang `/lich-day/moi` & `/lich-day/[id]/sua` | ✅ Xong | Dùng chung form; sửa có nút đổi trạng thái |
| Script test cách ly RLS `scripts/test-rls-sessions.mjs` | ✅ PASS | A/B/admin; đọc-ghi chéo; giả mạo `user_id` 403; admin không đọc |

**Giai đoạn 4B — Điểm danh (`attendance`)** (đối chiếu `docs/superpowers/plans/2026-07-15-4b-diem-danh.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0009_attendance.sql` (enum `attendance_status` + bảng + RLS 4 policy + 2 index + trigger) | ✅ Áp lên DB | FK `session_id`/`student_id` CASCADE; `UNIQUE(session_id, student_id)` |
| Validator Zod `lib/validators/attendance.ts` + test | ✅ Xong | 4 test PASS |
| Queries `getAttendanceForSession`/`listAttendanceForStudent` | ✅ Xong | JOIN buổi để hiển thị lịch sử; sắp theo giờ buổi giảm dần |
| Action `saveAttendance` (upsert) | ✅ Xong | Gate `requireWritable`; không nhận `user_id`; chặn buổi đã hủy; `onConflict: session_id,student_id` |
| Form `components/attendance/attendance-form.tsx` gắn trang sửa buổi | ✅ Xong | status / bài tập (tri-state) / nhận xét; ẩn khi buổi đã hủy |
| Lịch sử điểm danh trong chi tiết học sinh (`/hoc-sinh/[id]`) | ✅ Xong | Section "Lịch sử buổi học & điểm danh"; hiển thị giờ `Asia/Ho_Chi_Minh` |
| Script test cách ly RLS `scripts/test-rls-attendance.mjs` | ✅ PASS | A/B/admin; đọc-ghi chéo; giả mạo `user_id` 403; admin không đọc |

**Giai đoạn 5 — Tài chính phải thu** (đối chiếu spec `2026-07-15-5-phai-thu-design.md` + plan `2026-07-15-5a-phai-thu-nen-tang.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0010_finance_receivables.sql` (4 enum + `categories`/`invoices`/`invoice_items`/`transactions` + RLS + index + CHECK) | ✅ Áp lên DB | CHECK `invoice_id⇒income`, `payable_id⇒expense`; `invoices.student_id` RESTRICT |
| Migration `0011_finance_functions.sql` (trigger `recalc_invoice_paid` + RPC `create_invoice_from_sessions`) | ✅ Áp lên DB | RPC atomic SECURITY INVOKER; đặt `sessions.is_billed=true` chống tính trùng |
| Validators `lib/validators/invoice.ts` + `payment.ts` + test | ✅ Xong | 9 test PASS |
| Server `server/finance/queries.ts` (list/get/preview/receivables) | ✅ Xong | Phân trang; công nợ gom theo học sinh |
| Server `server/finance/actions.ts` (tạo từ buổi/tạo tay/ghi thu/hủy) | ✅ Xong | Gate `requireWritable`; không nhận `user_id`; ghi thu → trigger cập nhật |
| Script test cách ly RLS `scripts/test-rls-finance.mjs` | ✅ PASS | 4 bảng; A/B/admin; giả mạo `user_id` 403; admin không đọc |
| Script test nghiệp vụ `scripts/test-invoice-flow.mjs` | ✅ PASS | Tổng hợp đúng 600k/2 dòng; chống trùng; trigger partial→paid→partial |
| Nav "Tài chính" + trang `/tai-chinh/phai-thu` (danh sách + lọc + badge quá hạn + công nợ) | ✅ Xong | Tổng công nợ + chip học sinh nợ; responsive bảng/card |
| Trang `/tai-chinh/phai-thu/[id]` (chi tiết + ghi thu + hủy + lịch sử) | ✅ Xong | `PaymentForm`; nút hủy (soft cancel); ẩn form khi đã thu đủ/hủy |
| Trang `/tai-chinh/phai-thu/moi` (tạo từ buổi + thủ công) | ✅ Xong | Preview buổi qua query param → tạo (RPC); form thủ công nhập tổng |

**Giai đoạn 6 — Tài chính phải trả & sổ thu/chi** (đối chiếu spec `2026-07-15-6-phai-tra-thu-chi-design.md` + plan `2026-07-15-6-phai-tra-thu-chi.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0012_payables.sql` (enum `payable_status` + bảng `payables` + FK `transactions.payable_id` + index + trigger + RLS) | ✅ Áp lên DB | FK `payable_id → payables` SET NULL; `category_id → categories` SET NULL |
| Trigger `recalc_payable_paid` + `trg_transactions_recalc_payable` | ✅ Xong | Gương `recalc_invoice_paid`; thoát sớm khi `payable_id` null → không đụng luồng hóa đơn |
| Validators `payable.ts` + `transaction.ts` + `category.ts` + `payablePaymentSchema` (payment.ts) + test | ✅ Xong | 9 test PASS |
| Server read `payables.ts` (list/get/total), `ledger.ts` (listTransactions/listUpcomingDue), `categories.ts` (list) | ✅ Xong | `listTransactions` enrich nhãn nguồn (hóa đơn/khoản trả/danh mục); `listUpcomingDue` gộp 2 chiều |
| Server write `payables-actions.ts`, `ledger-actions.ts`, `categories-actions.ts` | ✅ Xong | Gate `requireWritable`; không nhận `user_id`; xóa chỉ dòng tự do; hủy payable = soft cancel |
| Điều hướng: `tai-chinh/layout.tsx` + `finance-tabs.tsx` (sub-nav 6 tab) | ✅ Xong | Nav chính "Tài chính" giữ `/tai-chinh/phai-thu`; tab active theo pathname |
| UI phải trả: `/phai-tra` (list+công nợ), `/moi`, `/[id]` (ghi trả + hủy), `/[id]/sua` | ✅ Xong | Badge quá hạn dẫn xuất; form dùng chung tạo/sửa |
| UI sổ thu/chi `/thu-chi` (form nhanh + lọc + xóa dòng tự do) + danh mục `/danh-muc` (CRUD + archive) | ✅ Xong | Danh mục lọc theo `type` ở client |
| UI hạn thanh toán `/han-thanh-toan` (quá hạn/sắp tới, 2 chiều) + lịch sử `/lich-su` | ✅ Xong | Sắp theo `due_date`; timeline mọi giao dịch |
| Script test cách ly RLS `scripts/test-rls-payables.mjs` | ✅ PASS | A/B/admin; đọc-ghi-sửa chéo; giả mạo `user_id` 403; admin không đọc |
| Script test nghiệp vụ `scripts/test-payable-flow.mjs` | ✅ PASS | Trả dần partial→paid→partial; trigger đúng qua INSERT/DELETE; CHECK chặn income gắn payable |

**Giai đoạn 7 — Báo cáo & Dashboard** (đối chiếu spec `2026-07-15-7-bao-cao-dashboard-design.md` + plan `2026-07-15-7-bao-cao-dashboard.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0013_report_views.sql` (4 view `security_invoker` + grant authenticated) | ✅ Áp lên DB | `v_cashflow_monthly` gom tháng theo **giờ VN**; `v_receivables_outstanding`/`v_payables_outstanding`/`v_upcoming_sessions` |
| Helper `lib/reports.ts` (`vnYearMonth`/`lastNMonths`/`monthLabel`) + test | ✅ Xong | 3 test PASS |
| Server `server/reports/queries.ts` | ✅ Xong | `cashflowMonthly`/`cashflowRange`/`reportSummary`/`receivablesOutstanding`/`payablesOutstanding`/`upcomingSessions`/`dashboardStats` đọc view |
| Biểu đồ `components/reports/cashflow-chart.tsx` (CSS/SVG, 0 thư viện) | ✅ Xong | Cột thu/chi + ròng theo tháng, responsive |
| Trang `/bao-cao` | ✅ Xong | Chọn kỳ (from/to tháng) + thẻ tổng thu/chi/lợi nhuận/ròng + biểu đồ + công nợ 2 chiều + quá hạn (dùng `listUpcomingDue`) |
| Dashboard `/tong-quan` (nâng cấp) | ✅ Xong | Chỉ số thật (HS đang học, buổi 7 ngày, phải thu, dòng tiền tháng), buổi sắp tới, cảnh báo quá hạn, biểu đồ 6 tháng |
| Nav "Báo cáo" (`components/app-nav.tsx`) | ✅ Xong | Mục thứ 7, icon `BarChart3` → `/bao-cao` |
| Script `scripts/test-rls-report-views.mjs` | ✅ PASS | A thấy cả 4 view; B & admin thấy 0 dòng (security_invoker cách ly) |
| Script `scripts/test-report-values.mjs` | ✅ PASS | Đối chiếu số liệu: GD `30/06 18:00Z` gom đúng **tháng 7 VN**; thu/chi/ròng + phải thu khớp |

---

## 4. Chi tiết Giai đoạn 3A (đối chiếu `docs/superpowers/plans/2026-07-13-3a-bai-hoc.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0005_lessons.sql` (bảng + RLS 4 policy + 2 index + trigger + CHECK status) | ✅ Áp lên DB | |
| Validator Zod `lib/validators/lesson.ts` + test | ✅ Xong | 3 test PASS |
| Queries `listLessons`/`getLesson` | ✅ Xong | Phân trang (`range`+`count`, `LESSONS_PAGE_SIZE=20`), sắp theo `updated_at` |
| Actions `saveLesson`/`archiveLessonAction` | ✅ Xong | Gate `requireWritable`, không nhận `user_id` từ client |
| Component `Markdown` (react-markdown + remark-gfm + rehype-sanitize) | ✅ Xong | Sanitize HTML nguy hiểm |
| UI danh sách / form thêm-sửa / chi tiết + nav "Bài học" | ✅ Xong | Token semantic + responsive bảng/card |
| Script test cách ly RLS `scripts/test-rls-lessons.mjs` | ✅ PASS | A/B/admin, đọc-ghi chéo, giả mạo `user_id` 403, admin không đọc |

---

## 5. Kiểm thử / chất lượng gần nhất (2026-07-15, sau GĐ7)

| Lệnh | Kết quả |
|---|---|
| `npm test` | ✅ 54 test PASS (51 cũ + **reports helper 3**) — 13 file test |
| `npm run lint` | ✅ 0 error (59 warning trong `scripts/*.mjs`, `server/*/*.ts` — unused-destructure/`any`, vô hại, pre-existing) |
| `npm run build` | ✅ Thành công; thêm route `/bao-cao`; nâng cấp `/tong-quan`; nav "Báo cáo" |
| Cách ly RLS `students`/`lessons`/`documents`/`sessions`/`attendance` | ✅ PASS |
| Cách ly RLS `finance`/`payables` | ✅ PASS |
| Cách ly RLS view báo cáo (`test-rls-report-views.mjs`) | ✅ PASS (A thấy 4 view; B & admin 0 dòng — security_invoker) |
| Đối chiếu số liệu báo cáo (`test-report-values.mjs`) | ✅ PASS (gom tháng giờ VN đúng; thu/chi/ròng/phải thu khớp) |
| Nghiệp vụ hóa đơn/phải trả (`test-invoice-flow`/`test-payable-flow`) | ✅ PASS (không hồi quy) |

---

## 6. Migration đã áp lên DB

| File | Nội dung |
|---|---|
| `0001_accounts_subscriptions.sql` | enums, plans, subscriptions… (GĐ1) |
| `0002_handle_new_user.sql` | trigger tạo profiles/user_settings/subscriptions |
| `0003_profiles_column_guard.sql` | vá cột profiles |
| `0004_students.sql` | bảng students + RLS |
| `0005_lessons.sql` | bảng lessons + RLS |
| `0006_documents.sql` | bảng documents + RLS 4 policy + 2 index; FK `lesson_id`/`student_id` SET NULL khi xóa |
| `0007_storage_documents.sql` | bucket `documents` riêng tư + Storage policy theo tiền tố `user_id/` |
| `0008_sessions.sql` | bảng `sessions` + RLS 4 policy + index; FK `student_id` → students |
| `0009_attendance.sql` | enum `attendance_status` + bảng `attendance` + RLS 4 policy + 2 index + trigger; `UNIQUE(session_id, student_id)`; FK CASCADE |
| `0010_finance_receivables.sql` | 4 enum + `categories`/`invoices`/`invoice_items`/`transactions` + RLS 4 policy/bảng + index + CHECK |
| `0011_finance_functions.sql` | trigger `recalc_invoice_paid` (amount_paid/status) + RPC `create_invoice_from_sessions` (tổng hợp atomic) |
| `0012_payables.sql` | enum `payable_status` + bảng `payables` + FK `transactions.payable_id` + index `(user_id, payable_id)` + trigger `recalc_payable_paid` + RLS 4 policy |
| `0013_report_views.sql` | 4 view `security_invoker` báo cáo (`v_cashflow_monthly` gom tháng giờ VN, `v_receivables_outstanding`, `v_payables_outstanding`, `v_upcoming_sessions`) + grant `authenticated` |

Áp bằng: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/<file.sql>` (cần `SUPABASE_DB_URL` trong `.env.local`).

---

## 7. Lệnh hiện có

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
node --env-file=.env.local scripts/run-migration.mjs <file.sql>      # áp migration
node --env-file=.env.local scripts/test-rls-students.mjs             # test cách ly students
node --env-file=.env.local scripts/test-rls-lessons.mjs              # test cách ly lessons
node --env-file=.env.local scripts/test-rls-documents.mjs            # test cách ly documents + Storage
node --env-file=.env.local scripts/test-rls-sessions.mjs             # test cách ly sessions
node --env-file=.env.local scripts/test-rls-attendance.mjs           # test cách ly attendance
node --env-file=.env.local scripts/test-rls-finance.mjs              # test cách ly tài chính phải thu
node --env-file=.env.local scripts/test-invoice-flow.mjs             # test nghiệp vụ hóa đơn tự động + trigger
node --env-file=.env.local scripts/test-rls-payables.mjs            # test cách ly payables (phải trả)
node --env-file=.env.local scripts/test-payable-flow.mjs           # test nghiệp vụ phải trả + trigger
node --env-file=.env.local scripts/test-rls-report-views.mjs       # test cách ly 4 view báo cáo
node --env-file=.env.local scripts/test-report-values.mjs          # đối chiếu số liệu view (gom tháng giờ VN)
```

---

## 8. Nguyên tắc không được lệch

- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc biến `NEXT_PUBLIC_*`.
- Không tạo bảng dữ liệu khách nếu chưa có `user_id` + RLS.
- Mọi thay đổi schema qua `supabase/migrations/*.sql` (versioned).
- RLS bảng nghiệp vụ **không** có nhánh `is_admin` — ADMIN không đọc dữ liệu USER.
- Test cách ly RLS là tiêu chí **chặn** đóng mỗi giai đoạn có bảng mới.

---

## 9. Bước kế tiếp

1. **Merge `feat/gd7-bao-cao` vào `main`** (giữ nếp — sau khi mọi kiểm thử xanh).
2. **Giai đoạn 8 — Cài đặt & Thông báo**: UI cài đặt (hồ sơ/tiền tệ/múi giờ/tùy chọn nhắc); migration `notifications` (enum `notification_type`) + RLS; thông báo in-app (nhắc buổi/nhắc học phí — sinh định kỳ P1); đánh dấu đã đọc; test cách ly RLS `notifications`. Phụ thuộc GĐ1.
