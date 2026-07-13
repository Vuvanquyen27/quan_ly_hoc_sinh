# ARCHITECTURE — Kiến trúc kỹ thuật

**Phiên bản:** 1.0 · **Ngày:** 2026-07-13
Tài liệu này là **cầu nối giữa thiết kế và mã nguồn**: cấu trúc thư mục, sơ đồ route, phân tầng, cách dùng Supabase, middleware, luồng xác thực và cách ly dữ liệu. Đọc kèm [`DATABASE.md`](./DATABASE.md) và [`PERMISSIONS.md`](./PERMISSIONS.md).

> Trạng thái: **bản thiết kế** — chưa lập trình. Dùng làm bản vẽ khi bắt đầu Giai đoạn 0.

---

## 1. Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│                         Trình duyệt                          │
│   Next.js App Router (Server + Client Components)            │
│   Tailwind + shadcn/ui · tiếng Việt · responsive            │
└───────────────┬───────────────────────────┬──────────────────┘
                │ (anon key, có RLS)         │
                ▼                            ▼
     ┌────────────────────┐      ┌─────────────────────────┐
     │  Middleware (Edge  │      │  Server: Route Handlers │
     │  → Node runtime)   │      │  & Server Actions       │
     │  - refresh session │      │  - xác thực + vai trò   │
     │  - chặn route      │      │  - service_role (ADMIN) │
     └─────────┬──────────┘      └───────────┬─────────────┘
               │                             │
               ▼                             ▼
     ┌──────────────────────────────────────────────────────┐
     │                    Supabase                          │
     │  Auth · PostgreSQL (RLS) · Storage                   │
     │  RLS: auth.uid() = user_id  · is_admin() (JWT)       │
     └──────────────────────────────────────────────────────┘
```

**Nguyên tắc nền tảng:**
- **Server-first:** logic nhạy cảm (ghi dữ liệu, thao tác ADMIN) đặt trong Server Actions/Route Handlers, không ở client.
- **RLS là lưới an toàn cuối:** kể cả khi tầng trên lỗi, PostgreSQL RLS vẫn chặn truy cập chéo.
- **Client chỉ có `anon key`:** mọi truy vấn từ trình duyệt đi kèm RLS. `service_role` chỉ ở server.

---

## 2. Cấu trúc thư mục (đề xuất)

```
quản lý học sinh/
├─ app/
│  ├─ (marketing)/                # Trang công khai
│  │  ├─ page.tsx                 # Landing
│  │  └─ layout.tsx
│  ├─ (auth)/                     # Đăng ký / đăng nhập / quên mật khẩu
│  │  ├─ dang-nhap/page.tsx
│  │  ├─ dang-ky/page.tsx
│  │  └─ quen-mat-khau/page.tsx
│  ├─ (app)/                      # Không gian USER (yêu cầu đăng nhập)
│  │  ├─ layout.tsx               # Vỏ app: sidebar, kiểm tra phiên + gating
│  │  ├─ tong-quan/page.tsx       # Dashboard
│  │  ├─ hoc-sinh/                # Học sinh (list, [id], moi)
│  │  ├─ bai-hoc/                 # Bài học
│  │  ├─ tai-lieu/                # Tài liệu
│  │  ├─ lich-day/                # Lịch & buổi học
│  │  ├─ tai-chinh/               # Phải thu, phải trả, thu/chi, hạn TT
│  │  ├─ bao-cao/                 # Báo cáo
│  │  └─ cai-dat/                 # Cài đặt + thông tin thuê bao
│  ├─ admin/                      # Khu vực ADMIN (yêu cầu role=admin)
│  │  ├─ layout.tsx               # Vỏ admin riêng + chặn non-admin
│  │  ├─ tai-khoan/               # Danh sách/chi tiết USER
│  │  ├─ thue-bao/                # Xác nhận thanh toán, kích hoạt/gia hạn
│  │  ├─ goi/                     # Quản lý plans
│  │  └─ nhat-ky/                 # admin_audit_logs
│  ├─ layout.tsx                  # Root: <html lang="vi">, font, theme
│  └─ globals.css
├─ components/
│  ├─ ui/                         # shadcn/ui
│  └─ ...                         # Component nghiệp vụ dùng lại
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts                # Browser client (anon)
│  │  ├─ server.ts                # Server client (anon, đọc cookie)
│  │  └─ admin.ts                 # Service-role client (CHỈ server)
│  ├─ auth.ts                     # Helper phiên + vai trò + gating
│  ├─ format.ts                   # Định dạng VND, ngày (vi-VN, Asia/HCM)
│  └─ validators/                 # Zod schema cho form/action
├─ server/
│  ├─ students/                   # Server actions theo miền nghiệp vụ
│  ├─ sessions/
│  ├─ finance/
│  └─ admin/                      # Actions ADMIN (dùng admin client)
├─ supabase/
│  ├─ migrations/                 # SQL versioned (schema + RLS)
│  └─ seed.sql                    # Seed dev (không dùng ở prod)
├─ middleware.ts                  # Bảo vệ route + refresh session
├─ docs/                          # PRD, PERMISSIONS, DATABASE, ROADMAP, plans/
├─ CLAUDE.md · README.md · .env.example
```

> **Ghi chú đặt tên route tiếng Việt:** dùng slug không dấu (`hoc-sinh`, `lich-day`) để URL sạch; nhãn hiển thị có dấu trong UI. Nhóm `(app)`/`(auth)`/`(marketing)` là *route group* (không xuất hiện trong URL).

---

## 3. Sơ đồ route & bảo vệ

| Nhóm | Đường dẫn | Ai truy cập | Bảo vệ |
|---|---|---|---|
| Marketing | `/`, `/gia`, ... | Ai cũng được | — |
| Auth | `/dang-nhap`, `/dang-ky`, `/quen-mat-khau` | Khách chưa đăng nhập | Nếu đã đăng nhập → chuyển `/tong-quan` |
| App (USER) | `/tong-quan`, `/hoc-sinh`, `/lich-day`, `/tai-chinh`, ... | USER đã đăng nhập | Middleware: cần phiên; Layout: gating thuê bao/khóa |
| Admin | `/admin/**` | Chỉ `role=admin` | Middleware: cần `role=admin`; server action: xác minh lại |

**Ba lớp bảo vệ** (chi tiết ở `PERMISSIONS.md §2`): Middleware → Server (action/handler) → RLS. UI ẩn nút chỉ là trải nghiệm.

---

## 4. Phân tầng & luồng dữ liệu

```
UI (Server/Client Component)
   │  gọi
   ▼
Server Action / Route Handler        ← xác thực phiên, lấy auth.uid(), validate (Zod)
   │  dùng
   ▼
Supabase client (server, anon)       ← truy vấn đi kèm RLS
   │
   ▼
PostgreSQL + RLS                      ← auth.uid() = user_id (hoặc is_admin())
```

**Quy tắc:**
- **Đọc danh sách/hiển thị:** ưu tiên Server Component + server client (anon) → RLS tự lọc theo `user_id`.
- **Ghi (create/update/delete):** qua **Server Action**; lấy `user_id` từ phiên (không nhận từ client); validate bằng Zod; để CSDL đặt `user_id default auth.uid()`.
- **Thao tác ADMIN đổi tài khoản/thuê bao:** Server Action trong `server/admin/` dùng **admin client (service_role)** SAU khi đã xác minh `role=admin`; ghi `admin_audit_logs`.
- **Không** đặt truy vấn nghiệp vụ ở Client Component với service_role (tuyệt đối cấm).

---

## 5. Tiện ích Supabase client

Ba client tách biệt trong `lib/supabase/`:

| Tệp | Khóa | Ngữ cảnh | Mục đích |
|---|---|---|---|
| `client.ts` | `anon` | Client Component (trình duyệt) | Truy vấn realtime/nhẹ có RLS; tương tác auth phía client |
| `server.ts` | `anon` | Server Component, Server Action, Route Handler | Truy vấn có RLS, đọc/ghi cookie phiên (`@supabase/ssr`) |
| `admin.ts` | `service_role` | **CHỈ** server (actions ADMIN) | Bỏ qua RLS cho tác vụ quản trị tài khoản/thuê bao |

**Ràng buộc bắt buộc:**
- `admin.ts` phải có guard chống import phía client (vd kiểm tra `typeof window === 'undefined'` / dùng `import 'server-only'`).
- Chỉ `admin.ts` đọc `SUPABASE_SERVICE_ROLE_KEY`. Không biến nào tên `SERVICE_ROLE` được đánh tiền tố `NEXT_PUBLIC_`.
- Dùng `@supabase/ssr` để quản lý phiên qua cookie cho App Router.

---

## 6. Middleware

`middleware.ts` chạy trước request tới các route được bảo vệ:

1. **Refresh session** (Supabase `updateSession` theo `@supabase/ssr`).
2. **Chặn `/app`** (nhóm `(app)`): chưa đăng nhập → redirect `/dang-nhap`.
3. **Chặn `/admin`**: đọc `role` từ JWT (`app_metadata.role`); `!= 'admin'` → 404/redirect.
4. Không đặt logic nghiệp vụ nặng ở middleware; chỉ điều hướng. Xác minh sâu (quyền sở hữu, gating) làm ở **layout/server action**.

> Middleware là **lớp 2**. Mọi Server Action vẫn tự xác minh phiên + vai trò + quyền sở hữu (không tin mỗi middleware).

**Gating thuê bao** (đọc/ghi theo `subscriptions.status`) thực thi ở `(app)/layout.tsx` + trong từng Server Action ghi dữ liệu: `expired`/`cancelled`/`is_locked` → chặn thao tác ghi (xem `PERMISSIONS.md §6`).

---

## 7. Luồng xác thực & khởi tạo

```
Đăng ký (email/mật khẩu) → Supabase Auth tạo auth.users
   → Trigger DB tạo: profiles + user_settings + subscriptions(trialing, +14 ngày)
   → Xác minh email → Đăng nhập → Middleware set cookie phiên
   → (app)/layout kiểm tra gating → Dashboard
```

- Vai trò `admin` **không** cấp qua đăng ký; chỉ đặt bằng `service_role` (script/seed nội bộ) vào `app_metadata.role`.
- Đặt lại mật khẩu qua luồng chuẩn Supabase (email reset).

---

## 8. Cách ly dữ liệu (tóm tắt kỹ thuật)

- Bảng nghiệp vụ: RLS `auth.uid() = user_id` (không nhánh admin). Xem `DATABASE.md §7`.
- Bảng thuê bao/nền tảng: USER chỉ đọc của mình; ADMIN qua `is_admin()`/service_role.
- Storage bucket `documents`: chính sách theo tiền tố `user_id/`; tải qua **signed URL** phát hành ở server.
- ADMIN **không** có đường đọc dữ liệu nghiệp vụ USER (không xây UI, không nhánh RLS).

---

## 9. Biến môi trường

| Biến | Công khai? | Dùng ở | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | client + server | URL dự án Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | client + server | Khóa anon (RLS bảo vệ) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **BÍ MẬT** | chỉ `lib/supabase/admin.ts` | Bỏ qua RLS — không bao giờ ra client |
| `NEXT_PUBLIC_SITE_URL` | ✅ | redirect auth | URL công khai của app |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | ✅ | format | `Asia/Ho_Chi_Minh` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | ✅ | format | `vi` |

Xem `.env.example`. Quản lý bằng `vercel env` cho môi trường preview/production.

---

## 10. Quy ước code

- **TypeScript strict**; validate input bằng **Zod** ở ranh giới server action.
- **Định dạng** (`lib/format.ts`): tiền `Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND', maximumFractionDigits:0 })`; ngày/giờ theo `Asia/Ho_Chi_Minh`.
- **Tiền** truyền/nhận dạng số nguyên đồng (`bigint`/`number` an toàn ≤ 2^53); tránh số thực.
- **Đặt tên:** bảng/cột `snake_case`; biến/hàm `camelCase`; component `PascalCase`; route slug không dấu.
- **shadcn/ui** cho component cơ bản; Tailwind cho layout; ưu tiên Server Component, chỉ dùng Client Component khi cần tương tác.
- **File nhỏ, một trách nhiệm**; tách theo miền nghiệp vụ (`server/students`, `server/finance`…).
- **Chuỗi hiển thị** gom một chỗ (dễ đa ngôn ngữ sau), MVP tiếng Việt.

---

## 11. Xử lý lỗi & trạng thái UI

- Mỗi màn hình danh sách có 3 trạng thái: **đang tải** (skeleton), **rỗng** (empty state hướng dẫn), **lỗi** (thông báo + thử lại).
- Server Action trả kết quả dạng `{ ok, data?, error? }`; hiển thị lỗi thân thiện tiếng Việt, không lộ chi tiết kỹ thuật.
- Dùng `error.tsx`/`not-found.tsx` của App Router cho lỗi cấp route.

---

## 12. Kiểm thử (định hướng)

- **Đơn vị:** `lib/format.ts`, validators, hàm tổng hợp hóa đơn/dòng tiền.
- **RLS/cách ly:** bộ kiểm thử theo `PERMISSIONS.md §8` (đọc/ghi chéo, giả mạo `user_id`, leo thang vai trò, ADMIN không đọc dữ liệu nghiệp vụ, Storage) — **release blocker**.
- **E2E (P1):** luồng chính (đăng ký → thêm học sinh → tạo buổi → ghi thu học phí → báo cáo).

---

## 13. Tài liệu liên quan
- [`PRD.md`](./PRD.md) · [`PERMISSIONS.md`](./PERMISSIONS.md) · [`DATABASE.md`](./DATABASE.md) · [`ROADMAP.md`](./ROADMAP.md) · [`plans/`](./plans/) · [`../CLAUDE.md`](../CLAUDE.md)
