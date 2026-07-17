# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-16
**Giai đoạn hiện tại:** Giai đoạn 9 **đã code xong** (Khu vực ADMIN — DB + server + UI + test RLS); **migration `0016` + test RLS admin CHƯA áp/chạy trên Supabase thật** (chờ `.env.local`); kế tiếp **Giai đoạn 10 — Kiểm thử bảo mật & Phát hành**
**Nhánh làm việc:** `claude/codebase-review-guidance-jac3k3`

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
| 8 | Cài đặt & Thông báo | ✅ Xong | migration `0014` (notifications+RLS) `0015` (bucket avatars public); RLS notifications+avatars PASS; `/cai-dat` (hồ sơ+avatar+tùy chọn+gói); `/thong-bao` + chuông header; nút "Tạo nhắc nhở" (dedup, gate prefs); cài đặt lưu, hiển thị VN cố định MVP |
| 9 | Khu vực ADMIN | 🧩 Code xong (chưa áp DB) | migration `0016` (subscription_payments + admin_audit_logs + 3 enum + RLS); `assertAdmin()`+`writeAudit()`; `app/admin` layout+nav riêng; quản lý tài khoản (khóa/mở/sửa), thuê bao (kích hoạt/gia hạn/đổi/hủy + subscription_payments), gói (CRUD), thống kê, nhật ký; script `set-admin` + `test-rls-admin`. **Build+lint+unit PASS**; **migration+RLS test chờ chạy trên Supabase** |
| 10 | Kiểm thử bảo mật & Phát hành | 🚧 Đang làm | **Phần code (không cần Supabase) đã xong + verify:** CI `.github/workflows/ci.yml` (quality: lint+test+build+quét bí mật; rls: test cách ly khi có secrets); security headers `next.config.ts`; `scripts/check-bundle-secrets.mjs` (bundle SẠCH 39 tệp). **Còn:** chạy test RLS trên Supabase thật, `listAccounts`→RPC, SMTP, landing, deploy |

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

**Giai đoạn 8 — Cài đặt & Thông báo** (đối chiếu spec `2026-07-15-8-cai-dat-thong-bao-design.md` + plan `2026-07-15-8-cai-dat-thong-bao.md`)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0014_notifications.sql` (enum `notification_type` + bảng + RLS 4 policy + 2 index) | ✅ Áp lên DB | `session_reminder`/`payment_due`/`system`; FK CASCADE |
| Migration `0015_storage_avatars.sql` (bucket `avatars` public + 3 policy ghi theo tiền tố) | ✅ Áp lên DB | Đọc công khai; cách ly chiều ghi `user_id/` |
| Validators `settings.ts` (profile/settings) + `notification.ts` (nhãn) + test | ✅ Xong | 3 test PASS |
| Server `server/settings/` (getSettings + updateProfile whitelist + updateSettings + uploadAvatar) | ✅ Xong | Gate `requireWritable`; **chỉ ghi** `full_name/phone/avatar_url`; upload `avatars/{uid}/avatar.<ext>` |
| Server `server/notifications/` (list/unreadCount + markRead/markAllRead/delete + generateReminders) | ✅ Xong | `generateReminders` dedup theo `(type, entity_id)`, gate `notify_*`; trả `void` (form action) |
| UI `/cai-dat` (hồ sơ + avatar upload + tùy chọn + gói chỉ đọc) | ✅ Xong | Ghi chú "hiển thị VN cố định" ở form tùy chọn |
| UI `/thong-bao` (danh sách + "Tạo nhắc nhở" + "Đọc hết" + đánh dấu/xóa) + chuông & Cài đặt ở header | ✅ Xong | Chuông hiện `unreadCount`; header thêm 2 icon |
| Script `scripts/test-rls-notifications.mjs` | ✅ PASS | Cách ly `notifications` (A/B/admin; forge 403; B không sửa của A) **+** Storage `avatars` (B chặn khỏi tiền tố A) |

**Giai đoạn 9 — Khu vực ADMIN** (đối chiếu `docs/plans/GIAI_DOAN_9.md` + `docs/PERMISSIONS.md §4`)

> ⚠️ Code + build + unit test + lint đã xong. **Migration `0016` và `test-rls-admin.mjs` CHƯA chạy trên Supabase thật** (môi trường phiên này không có `.env.local`). Cần chạy 2 bước đó để đóng GĐ9.

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Migration `0016_admin_subscriptions.sql` (3 enum + `subscription_payments` + `admin_audit_logs` + RLS) | 🧩 Viết xong, **chưa áp** | `subscription_payments`: USER đọc của mình / ADMIN toàn quyền; `admin_audit_logs`: chỉ ADMIN đọc, ghi qua `service_role`; `actor_id` ON DELETE RESTRICT (giữ log). **Dùng số `0016`** — plan ghi `0012` nhưng số đó đã dùng cho payables |
| Bootstrap admin `scripts/set-admin.mjs` + `scripts/set-admin.md` | ✅ Xong | Đặt `app_metadata.role='admin'` qua `service_role` (+ đồng bộ `profiles.role`); có cờ `--revoke`; KHÔNG qua UI công khai |
| Helper `lib/admin.ts` (`assertAdmin` + `writeAudit`) | ✅ Xong | `assertAdmin` đọc role từ JWT `app_metadata` (server-side, không tin middleware/client); `writeAudit` ghi qua admin client; `import 'server-only'` |
| Validators `lib/validators/admin.ts` (nhãn + schema) | ✅ Xong | `activateSchema`/`renewSchema`/`changePlanSchema`/`accountUpdateSchema`/`planSchema` + nhãn tiếng Việt |
| Vỏ khu admin: `app/admin/layout.tsx` + `components/admin/admin-nav.tsx` | ✅ Xong | Layout riêng (không dùng vỏ `(app)`), xác minh lại role ở server; nav desktop + bottom-nav mobile. `proxy.ts` **đã có sẵn** chặn `/admin/**` cho non-admin |
| Server `server/admin/queries.ts` (đọc, admin client sau `assertAdmin`) | ✅ Xong | `listAccounts` (search/lọc/phân trang), `getAccountDetail`, `listPlansAdmin`/`getPlan`, `getPlatformStats`, `listAuditLogs` (đính email actor/target) |
| Server `accounts-actions.ts` (khóa/mở/sửa) | ✅ Xong | `lockAccount`/`unlockAccount`/`updateAccount` → admin client + `writeAudit` (`lock_account`/`unlock_account`/`update_account`) |
| Server `subscriptions-actions.ts` (kích hoạt/gia hạn/đổi/hủy) | ✅ Xong | `confirmPaymentAndActivate`/`renewSubscription` tạo `subscription_payments` + đẩy `expires_at` theo chu kỳ (giờ VN); `changePlan`/`cancelSubscription`; đủ 4 audit action |
| Server `plans-actions.ts` (CRUD gói) | ✅ Xong | `createPlan`/`updatePlan`; bắt trùng mã (`23505`) |
| UI `/admin` (thống kê) + `/admin/tai-khoan` (list) + `/[id]` (chi tiết: sửa/khóa/thuê bao/lịch sử) | ✅ Xong | Panel thuê bao tự điền số tiền theo gói; responsive bảng/card |
| UI `/admin/goi` (+`/moi` +`/[id]/sua`) + `/admin/nhat-ky` (lọc action + phân trang) | ✅ Xong | Dùng chung `PlanForm`; nhật ký hiển thị email + metadata |
| Script `scripts/test-rls-admin.mjs` | 🧩 Viết xong, **chưa chạy** | USER không đọc/ghi `admin_audit_logs`; cách ly `subscription_payments`; ADMIN không đọc `students`; USER không tự kích hoạt thuê bao |

**Review GĐ9 (6 góc, max effort) — kết luận: KHÔNG có lỗ hổng cách ly P0; schema khớp tài liệu.** Đã sửa các bug/điểm cứng hóa sau (build+lint+test lại xanh):

| Đã sửa | Chi tiết |
|---|---|
| `addCycleDate` tràn biên tháng | Kẹp về ngày cuối tháng đích (31/01 +1th → 28/02, không phải 03/03). Kiểm chứng Node mọi ca 29–31 + năm nhuận |
| `periodStart` chưa validate ngày | Thêm regex `yyyy-mm-dd` → không còn `RangeError` khi input xấu |
| `writeAudit` nuốt lỗi | Kiểm `error` + `console.error` (audit bắt buộc — không im lặng) |
| Audit "ma" khi `userId` sai | lock/unlock/updateAccount dùng `.select('id')` — chỉ audit khi thực sự đổi 1 hàng |
| State panel cũ sau kích hoạt/gia hạn | activate/renew `redirect` về trang chi tiết → form remount dữ liệu mới |
| `changePlan` thiếu revalidate list | Thêm `revalidatePath('/admin/tai-khoan')` |
| Thống kê sai khi >1000 thuê bao | `getPlatformStats` đếm bằng `count` SQL từng trạng thái (không tally JS bị cap 1000) |
| Double-click void action → double audit | `SubmitButton` (`useFormStatus`) vô hiệu khi đang gửi cho khóa/mở/đổi/hủy |
| Gia hạn tài khoản trial | Neo từ `trial_ends_at` nếu trial còn hạn (không mất phần trial) |

**Hoãn sang GĐ10 (đã ghi nhận, không chặn merge):**
- **Nguyên tử hóa** kích hoạt/gia hạn (insert payment + update subscription) bằng **RPC Postgres** như `0011` — tránh payment "confirmed" mồ côi nếu update lỗi giữa chừng.
- **Đọc bằng client đã xác thực** (JWT admin) để RLS `is_admin()` là lưới an toàn, thay vì service_role bỏ qua RLS cho các hàm ĐỌC (khớp PERMISSIONS.md §5.4). *Chưa đổi trong phiên này vì không có Supabase thật để kiểm chứng đường đọc qua RLS.*
- `listAccounts` chuyển sang **view/RPC lọc+phân trang ở CSDL** khi >1000 tài khoản (hiện full-scan + cắt trang JS).
- Đưa điều kiện `is_locked`/hết hạn vào **RLS** (PERMISSIONS §6) — hiện chặn ở tầng app.
- Dọn trùng lặp (helper ngày VN vs `lib/datetime.ts`, khối phân trang, `SUB_STATUS_LABEL` vs `cai-dat`).

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

## 5. Kiểm thử / chất lượng gần nhất (2026-07-15, sau GĐ8)

| Lệnh | Kết quả |
|---|---|
| `npm test` | ✅ 57 test PASS (54 cũ + **settings 3**) — 14 file test |
| `npm run lint` | ✅ 0 error (71 warning trong `scripts/*.mjs`, `server/*/*.ts` — unused-destructure/`any`, vô hại, pre-existing) |
| `npm run build` | ✅ Thành công; thêm route `/cai-dat` + `/thong-bao`; chuông & Cài đặt ở header |
| Cách ly RLS `students`/`lessons`/`documents`/`sessions`/`attendance` | ✅ PASS |
| Cách ly RLS `finance`/`payables`/view báo cáo | ✅ PASS |
| Cách ly RLS `notifications` + Storage `avatars` (`test-rls-notifications.mjs`) | ✅ PASS (forge 403; B chặn khỏi tiền tố avatars/A) |
| Đối chiếu số liệu báo cáo (`test-report-values.mjs`) | ✅ PASS (gom tháng giờ VN đúng) |
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
| `0014_notifications.sql` | enum `notification_type` + bảng `notifications` + RLS 4 policy + 2 index |
| `0015_storage_avatars.sql` | bucket Storage `avatars` (public) + 3 policy ghi/sửa/xóa theo tiền tố `user_id/` |
| `0016_admin_subscriptions.sql` | **⏳ CHƯA áp** — 3 enum (`subscription_payment_status`/`subscription_event_kind`/`admin_action`) + `subscription_payments` + `admin_audit_logs` + RLS (`is_admin()`) |

Áp bằng: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/<file.sql>` (cần `SUPABASE_DB_URL` trong `.env.local`).
**GĐ9 cần chạy:** `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0016_admin_subscriptions.sql`

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
node --env-file=.env.local scripts/test-rls-notifications.mjs      # test cách ly notifications + Storage avatars
node --env-file=.env.local scripts/set-admin.mjs <email>          # cấp quyền admin (GĐ9) — thêm --revoke để thu hồi
node --env-file=.env.local scripts/test-rls-admin.mjs             # test cách ly admin (subscription_payments/audit/nghiệp vụ)
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

1. **Đóng GĐ9 trên Supabase thật** (cần `.env.local` có `SUPABASE_DB_URL` + `SUPABASE_SERVICE_ROLE_KEY`):
   - Áp migration: `node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0016_admin_subscriptions.sql`
   - Cấp admin đầu tiên: `node --env-file=.env.local scripts/set-admin.mjs <email-của-bạn>` → đăng xuất/đăng nhập lại.
   - Chạy test cách ly: `node --env-file=.env.local scripts/test-rls-admin.mjs` (phải PASS trước khi đóng GĐ9).
   - Kiểm thử tay: đăng nhập admin → `/admin` (thống kê), tạo gói ở `/admin/goi`, vào một tài khoản → kích hoạt/gia hạn/khóa → xem `/admin/nhat-ky`.
2. **Giai đoạn 10 — Kiểm thử bảo mật & Phát hành**: chạy trọn bộ kiểm thử phân quyền `docs/PERMISSIONS.md §8` (9 mục, gồm chặn `/admin/**` cho USER thường ở tầng server), tối ưu, chuẩn bị phát hành.
3. (Tùy chọn, đã cân nhắc ở GĐ8) Migration siết RLS cột `profiles` để chặn USER tự đổi `is_locked` ở tầng CSDL — hiện đã chặn ở `0003` (revoke UPDATE, chỉ cấp `full_name/phone/avatar_url`), nên rủi ro đã được xử lý.
