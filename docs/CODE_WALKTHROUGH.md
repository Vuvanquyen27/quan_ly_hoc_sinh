# CODE WALKTHROUGH — Giải thích code và luồng chạy

**Ngày lập:** 2026-07-13  
**Mục tiêu:** Tóm tắt dự án EduFlow theo dạng bảng để có thể đưa sang Google Sheets: từng khu vực code làm gì, thứ tự chạy hiện tại, phần đã có, phần còn là kế hoạch và các điểm cần xử lý tiếp.

> Ghi chú: Nội dung dưới đây phản ánh code trong repo tại thời điểm đọc. Tài liệu `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/PERMISSIONS.md`, `docs/ROADMAP.md` mô tả bản thiết kế đầy đủ; code hiện tại mới ở nền móng.

---

## 1. Tổng Quan Dự Án

| Hạng mục | Hiện trạng | Tác dụng |
|---|---|---|
| Framework | Next.js 16.2.10 App Router, React 19, TypeScript strict | Làm ứng dụng web server-first, hỗ trợ route theo thư mục `app/`. |
| UI/CSS | Tailwind CSS v4, shadcn/ui base-nova, Base UI, lucide | Cung cấp hệ thống style, component nền và token theme. |
| Backend/BaaS | Supabase `@supabase/supabase-js`, `@supabase/ssr` | Dùng cho Auth, PostgreSQL, RLS, Storage theo thiết kế. |
| Giai đoạn | Giai đoạn 0 gần hoàn tất, một phần Giai đoạn 1 database đã được tạo file migration | Repo đã có nền Next, helper Supabase, script kiểm tra, migration tài khoản/thuê bao ban đầu. |
| Route đang có | `/` và `/_not-found` sau build | Trang chủ landing hoạt động; các link `/dang-nhap`, `/dang-ky`, `/tong-quan` mới là link, chưa có page. |
| Bảo mật | Có tách client/server/admin Supabase client, có `server-only` cho admin client | Giảm rủi ro lộ `SUPABASE_SERVICE_ROLE_KEY` ra client bundle. |

---

## 2. Luồng Chạy Hiện Tại

| Bước | Thành phần | Luồng xử lý | Ghi chú |
|---|---|---|---|
| 1 | `npm run dev` hoặc `npm run build` | Next đọc `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, Tailwind/PostCSS, TypeScript | Build đã pass với route `/` và proxy middleware. |
| 2 | Request từ trình duyệt | `proxy.ts` chạy trước hầu hết route không phải asset tĩnh | Next.js 16 dùng convention `proxy` thay cho `middleware`. |
| 3 | `proxy.ts` | Gọi `updateSession(request)` trong `lib/supabase/middleware.ts` | Mục tiêu hiện tại là refresh session Supabase và đồng bộ cookie. |
| 4 | `updateSession` | Tạo Supabase server client bằng anon key, đọc cookie request, gọi `supabase.auth.getUser()` | Nếu env Supabase chưa đúng thì bắt lỗi và vẫn cho request đi tiếp. |
| 5 | Root layout | `app/layout.tsx` nạp font Geist, set `<html lang="vi">`, metadata tiếng Việt, import `globals.css` | Áp ngôn ngữ, font và CSS toàn app. |
| 6 | Trang chủ | `app/page.tsx` render landing tĩnh EduFlow | Có CTA tới `/dang-ky`, `/dang-nhap`, `/tong-quan`, nhưng các page đó chưa tồn tại. |
| 7 | UI runtime | Tailwind class và CSS variables trong `app/globals.css` tạo theme sáng/tối, token shadcn | Component trong `components/ui/*` có thể tái dùng cho form/trang sau. |
| 8 | Supabase helper | Khi code sau này cần auth/data, dùng `createBrowserSupabase`, `createServerSupabase`, hoặc `createAdminSupabase` theo ngữ cảnh | Hiện chưa có page/action nghiệp vụ dùng các helper này. |

---

## 3. Chi Tiết File Code

| Nhóm | File | Tác dụng chính | Cách nó được gọi/chạy | Trạng thái/ghi chú |
|---|---|---|---|---|
| App route | `app/page.tsx` | Trang landing tiếng Việt, mô tả EduFlow, mock lịch học và KPI | Next render cho route `/` | Hoạt động; chỉ là UI tĩnh, chưa gọi API. |
| App route | `app/layout.tsx` | Root layout: metadata, font Geist, `lang="vi"`, body flex | Bọc mọi route trong `app/` | Hoạt động. |
| Style | `app/globals.css` | Import Tailwind, animation, shadcn CSS; khai báo token theme, dark mode, base layer | Nạp từ `app/layout.tsx` | Hoạt động; là nền style cho toàn app. |
| Routing/session | `proxy.ts` | Proxy middleware Next 16, match mọi route trừ static/image/favicon | Next chạy trước request phù hợp matcher | Hiện chỉ refresh session; chưa chặn auth/admin route. |
| Supabase | `lib/supabase/middleware.ts` | Tạo Supabase SSR client trong proxy, đồng bộ cookie, gọi `auth.getUser()` | Được `proxy.ts` gọi | Có TODO: chặn `/admin`, gating thuê bao, route app ở giai đoạn sau. |
| Supabase | `lib/supabase/client.ts` | Tạo Supabase browser client bằng anon key | Dành cho Client Component sau này | Chưa được dùng trong page hiện tại. |
| Supabase | `lib/supabase/server.ts` | Tạo Supabase server client bằng anon key, đọc/ghi cookie qua `next/headers` | Dành cho Server Component/Action/Route Handler | Có try/catch khi Server Component không set được cookie. |
| Supabase | `lib/supabase/admin.ts` | Tạo Supabase admin client bằng `SUPABASE_SERVICE_ROLE_KEY`, tắt persist session | Chỉ dùng server cho tác vụ ADMIN sau khi xác minh role | Có `import 'server-only'`; không import ở client. |
| Format | `lib/format.ts` | `formatVND`, `formatDate`, `formatDateTime` theo `vi-VN`, `Asia/Ho_Chi_Minh` | Dùng cho UI/tài chính/ngày giờ | Đã có test pass 6/6. |
| Test | `lib/format.test.ts` | Unit test định dạng tiền và ngày giờ | Chạy bằng `npm test` / Vitest | Pass. |
| Utility | `lib/utils.ts` | Hàm `cn()` merge `clsx` và `tailwind-merge` | Dùng trong shadcn UI component | Hoạt động. |
| UI | `components/ui/button.tsx` | Button primitive có variants `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` và nhiều size | Dùng lại trong form/trang sau | Chưa được dùng ở landing hiện tại. |
| UI | `components/ui/card.tsx` | Bộ component `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, ... | Dùng lại cho layout panel/form sau | Chưa được dùng ở landing hiện tại. |
| UI | `components/ui/input.tsx` | Input primitive style theo shadcn/Base UI | Dùng cho form đăng nhập/đăng ký sau | Chưa được dùng ở landing hiện tại. |
| Config | `components.json` | Cấu hình shadcn: style base-nova, alias `@/components`, `@/lib`, icon lucide | shadcn CLI/component generator đọc | Đã cấu hình. |
| Config | `next.config.ts` | Cố định Turbopack root bằng `__dirname` | Next build/dev đọc | Tránh Next chọn nhầm workspace root. |
| Config | `eslint.config.mjs` | ESLint Next core-web-vitals + TypeScript, ignore `.next`, build output | `npm run lint` | Lint pass. |
| Config | `postcss.config.mjs` | PostCSS dùng `@tailwindcss/postcss` | Next/Tailwind build đọc | Hoạt động. |
| Config | `vitest.config.ts` | Vitest chạy môi trường Node | `npm test` | Hoạt động. |
| Env mẫu | `.env.example` | Mẫu biến Supabase public/private, locale/timezone/currency | Người dev copy thành `.env.local` | Không chứa secret thật; `.env.local` bị gitignore. |
| Git | `.gitignore` | Bỏ qua `node_modules`, `.next`, `.env*`, IDE, build output | Git dùng | Giữ `.env.example`. |
| Script | `scripts/check-supabase.mjs` | Kiểm tra URL/anon key Supabase qua `/auth/v1/settings`, mask key khi in | Chạy `node --env-file=.env.local scripts/check-supabase.mjs` | Không in secret; cần credential thật. |
| Script | `scripts/verify-schema.mjs` | Kiểm tra các bảng GĐ1 `plans`, `profiles`, `user_settings`, `subscriptions` qua REST API | Chạy `node --env-file=.env.local scripts/verify-schema.mjs` | Ưu tiên service key nếu có, fallback anon. |
| Static | `public/*.svg`, `app/favicon.ico` | Asset mặc định của scaffold | Dùng khi được link từ UI/browser | Chưa quan trọng với nghiệp vụ. |

---

## 4. Database, Migration, Seed

| File | Nội dung | Tác dụng khi chạy | Trạng thái/ghi chú |
|---|---|---|---|
| `supabase/migrations/0001_accounts_subscriptions.sql` | Tạo enum `subscription_status`, `billing_cycle`; hàm `set_updated_at`, `is_admin`; bảng `plans`, `profiles`, `user_settings`, `subscriptions`; trigger `updated_at`; bật RLS và policy | Thiết lập nền tài khoản, cài đặt người dùng, thuê bao và quyền đọc/ghi ban đầu | Có thể chạy nếu Supabase project sẵn sàng. |
| `supabase/migrations/0002_handle_new_user.sql` | Hiện chỉ có chữ `xong` | Không phải SQL migration hợp lệ | Cần thay bằng trigger `handle_new_user` tạo `profiles`, `user_settings`, `subscriptions` khi Auth tạo user. |
| `supabase/seed.sql` | Insert 2 plan: `pro_monthly`, `pro_yearly` | Seed dữ liệu gói Pro tháng/năm cho dev | Dùng sau khi migration `plans` đã chạy. |

### RLS hiện có trong migration 0001

| Bảng | Policy | Ý nghĩa |
|---|---|---|
| `plans` | USER đọc plan active; ADMIN toàn quyền qua `is_admin()` | Cho khách xem gói, admin quản lý gói. |
| `profiles` | USER đọc/sửa profile của mình; ADMIN đọc | Cho người dùng sửa thông tin cơ bản; role/is_locked vẫn cần server/admin kiểm soát. |
| `user_settings` | USER toàn quyền bản ghi của mình | Cách ly cài đặt cá nhân theo `user_id`. |
| `subscriptions` | USER chỉ đọc của mình; ADMIN toàn quyền qua `is_admin()` | USER không tự sửa thuê bao; admin/server cập nhật. |

---

## 5. Luồng Thiết Kế Theo Tài Liệu

| Luồng | Các bước theo spec | Code hiện tại |
|---|---|---|
| Đăng ký USER | Landing -> đăng ký email/mật khẩu -> Supabase Auth tạo user -> trigger tạo `profiles`, `user_settings`, `subscriptions(trialing +14d)` -> đăng nhập -> dashboard | Chưa có trang auth; migration trigger đang thiếu vì `0002_handle_new_user.sql` là placeholder. |
| Đăng nhập/session | Form đăng nhập -> Supabase Auth -> cookie session -> proxy/middleware refresh session -> layout app kiểm tra gating | Mới có refresh session; chưa có form auth và route gating. |
| App USER | `/tong-quan`, `/hoc-sinh`, `/lich-day`, `/tai-chinh`, ... yêu cầu đăng nhập; data query qua server client + RLS | Chưa có các route nghiệp vụ. |
| ADMIN | `/admin/**` yêu cầu JWT `app_metadata.role='admin'`; action admin dùng service role sau khi assert admin; ghi audit log | Chưa có `/admin`; admin client đã có hàng rào `server-only`. |
| Học sinh | CRUD `students`, xóa mềm `archived_at`, RLS `auth.uid() = user_id` | Chưa code. Có plan GĐ2. |
| Bài học/tài liệu | CRUD `lessons`, `documents`; Storage private bucket theo tiền tố `user_id/` | Chưa code. Có plan GĐ3. |
| Lịch/buổi học | CRUD `sessions`, điểm danh `attendance`, trạng thái scheduled/completed/cancelled | Chưa code. Có plan GĐ4. |
| Tài chính | Hóa đơn từ buổi completed, transactions cập nhật công nợ, báo cáo cashflow | Chưa code. Có plan GĐ5-GĐ7. |

---

## 6. Kế Hoạch Giai Đoạn

| Giai đoạn | Tài liệu | Mục tiêu | Trạng thái code |
|---|---|---|---|
| 0 | `docs/plans/GIAI_DOAN_0.md` | Nền Next, format, shadcn, Supabase clients, proxy, build/lint/test | Phần lớn đã có; còn Supabase thật/Vercel preview tùy credential. |
| 1 | `docs/plans/GIAI_DOAN_1.md` | Auth, profile, trial, route protect, trigger user mới | Mới có migration 0001 và helper Supabase; auth UI/trigger/gating chưa xong. |
| 2 | `docs/plans/GIAI_DOAN_2.md` | CRUD học sinh + RLS mẫu | Chưa code. |
| 3 | `docs/plans/GIAI_DOAN_3.md` | Bài học + tài liệu + Storage | Chưa code. |
| 4 | `docs/plans/GIAI_DOAN_4.md` | Lịch, buổi học, điểm danh | Chưa code. |
| 5 | `docs/plans/GIAI_DOAN_5.md` | Hóa đơn phải thu, thanh toán học phí | Chưa code. |
| 6 | `docs/plans/GIAI_DOAN_6.md` | Khoản phải trả, sổ thu/chi | Chưa code. |
| 7 | `docs/plans/GIAI_DOAN_7.md` | Báo cáo, dashboard | Chưa code. |
| 8 | `docs/plans/GIAI_DOAN_8.md` | Cài đặt, thông báo | Chưa code. |
| 9 | `docs/plans/GIAI_DOAN_9.md` | Khu ADMIN, thuê bao, audit log | Chưa code. |
| 10 | `docs/plans/GIAI_DOAN_10.md` | Kiểm thử bảo mật, tối ưu, release | Chưa code. |

---

## 7. Lệnh Và Kết Quả Kiểm Tra

| Lệnh | Kết quả | Ý nghĩa |
|---|---|---|
| `npm test` | PASS: 1 file, 6 tests | Hàm format tiền/ngày giờ đang đúng theo test hiện có. |
| `npm run lint` | PASS, không output lỗi | ESLint không phát hiện lỗi hiện tại. |
| `npm run build` | PASS, Next build thành công | App build production được; route hiện có là `/` và `/_not-found`, có Proxy middleware. |
| Quét `.next/static/**/*.js` tìm `service_role` | PASS: `NO_SERVICE_ROLE_IN_STATIC_JS` | Không thấy chuỗi `service_role` trong bundle JS tĩnh sau build. |

---

## 8. Điểm Cần Làm Tiếp / Rủi Ro

| Mức | Vấn đề | Tác động | Đề xuất |
|---|---|---|---|
| Cao | `supabase/migrations/0002_handle_new_user.sql` không phải SQL hợp lệ | Migration GĐ1 sẽ lỗi hoặc không tạo trigger user mới | Thay bằng function/trigger `handle_new_user` tạo profile, settings, subscription trial. |
| Cao | Link `/dang-nhap`, `/dang-ky`, `/tong-quan` chưa có page | Người dùng click sẽ vào 404 | Triển khai auth routes GĐ1 trước khi demo thật. |
| Cao | `proxy.ts` chưa chặn route app/admin | Chưa có bảo vệ route theo phiên/vai trò | Bổ sung logic redirect/deny trong GĐ1 và xác minh lại ở server action/layout. |
| Trung bình | Chưa có server action/helper auth chung | Các thao tác ghi sau này dễ lặp logic | Tạo `lib/auth.ts`/action guard theo plan GĐ1. |
| Trung bình | Supabase credential trong `.env.local` cần giá trị thật | Không kiểm tra được kết nối/schema nếu placeholder | Chạy `scripts/check-supabase.mjs` và `scripts/verify-schema.mjs` sau khi điền key thật. |
| Trung bình | Tài liệu README/CLAUDE có chỗ mô tả trạng thái cũ hơn code | Người đọc có thể nhầm “chưa có shadcn/Supabase clients” | Ưu tiên `docs/IMPLEMENTATION_STATUS.md` và code thực tế; cập nhật README/CLAUDE nếu cần. |

---

## 9. Cấu Trúc Sheet Đề Xuất Khi Đưa Lên Google Sheets

| Sheet | Nội dung |
|---|---|
| `Tong quan` | Bảng mục 1 và trạng thái chung. |
| `Luong chay` | Bảng mục 2 và mục 5. |
| `Chi tiet file` | Bảng mục 3. |
| `Database` | Bảng mục 4. |
| `Roadmap` | Bảng mục 6. |
| `Kiem tra` | Bảng mục 7. |
| `Rui ro` | Bảng mục 8. |

