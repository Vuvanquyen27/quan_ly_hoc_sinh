# PERMISSIONS — Phân quyền ADMIN & USER

**Phiên bản:** 1.0 · **Ngày:** 2026-07-13
Tài liệu này định nghĩa mô hình phân quyền, ma trận quyền chi tiết, và **cơ chế kỹ thuật thực thi** để bảo đảm cách ly dữ liệu tuyệt đối giữa các khách hàng và tách biệt hoàn toàn quyền ADMIN.

> Nguyên tắc tối cao: **Phân quyền là ở máy chủ và ở cơ sở dữ liệu (RLS), KHÔNG ở giao diện.** Ẩn nút chỉ để trải nghiệm; chặn thật nằm ở tầng dữ liệu/máy chủ.

---

## 1. Mô hình vai trò

| Vai trò | Ai | Phạm vi |
|---|---|---|
| `user` | Giáo viên — khách hàng trả tiền | Toàn quyền trên **dữ liệu của chính mình**; không thấy dữ liệu USER khác; không truy cập chức năng ADMIN |
| `admin` | Chủ hệ thống / đội vận hành | Quản lý **vòng đời tài khoản USER** và cấu hình nền tảng; **không** thao tác dữ liệu nghiệp vụ bên trong không gian USER ở luồng thường |
| _(khách chưa đăng nhập)_ | Ẩn danh | Chỉ trang công khai (landing, đăng ký, đăng nhập) |

**Không có** vai trò trung gian ở MVP (không có "trợ giảng", "kế toán", v.v.). Mỗi không gian làm việc thuộc về đúng một USER.

**Lưu trữ vai trò:** trong `auth.users.app_metadata.role` (Supabase). Chỉ sửa được bằng `service_role` ở máy chủ. Giá trị này có trong JWT nên RLS và middleware đọc được **không cần truy vấn bảng** (tránh đệ quy RLS).

```jsonc
// Ví dụ app_metadata trong JWT của một ADMIN
{ "role": "admin" }
// USER thường: role = "user" (hoặc không có → mặc định coi là user)
```

---

## 2. Phòng thủ theo lớp (Defense in Depth)

Mỗi yêu cầu đi qua **4 lớp**; lớp sâu nhất (RLS) là lớp không thể vượt qua:

```
1. UI/UX      → Ẩn/hiện nút theo vai trò & gói. (Chỉ trải nghiệm — KHÔNG phải bảo mật)
2. Middleware → Chặn truy cập route (/admin cần role=admin; /app cần đăng nhập)
3. Máy chủ    → Route Handler/Server Action xác minh phiên + vai trò + quyền sở hữu trước khi thao tác
4. CSDL (RLS) → PostgreSQL RLS bắt buộc auth.uid() = user_id; admin check qua JWT claim
```

Nếu lớp 1–3 bị lỗi/bỏ sót, **RLS vẫn chặn** việc đọc/ghi dữ liệu chéo. Đây là lưới an toàn cuối cùng.

---

## 3. Ma trận quyền theo tài nguyên

**Chú thích:** ✅ Toàn quyền (trong phạm vi của mình) · 🔎 Chỉ đọc · ⛔ Không có quyền · 🅰️ Quyền quản trị (mức tài khoản/nền tảng, không phải dữ liệu nghiệp vụ)

### 3.1. Dữ liệu nghiệp vụ (thuộc không gian USER)

| Tài nguyên | USER (chủ sở hữu) | USER khác | ADMIN |
|---|---|---|---|
| Hồ sơ học sinh (`students`) | ✅ CRUD | ⛔ | ⛔ (không xem chi tiết ở luồng thường) |
| Bài học/nội dung (`lessons`) | ✅ CRUD | ⛔ | ⛔ |
| Tài liệu/tệp/liên kết (`documents`) | ✅ CRUD | ⛔ | ⛔ |
| Buổi học/lịch (`sessions`) | ✅ CRUD | ⛔ | ⛔ |
| Điểm danh & ghi chú (`attendance`) | ✅ CRUD | ⛔ | ⛔ |
| Hóa đơn/công nợ phải thu (`invoices`, `invoice_items`) | ✅ CRUD | ⛔ | ⛔ |
| Khoản phải trả (`payables`) | ✅ CRUD | ⛔ | ⛔ |
| Dòng tiền & thanh toán (`transactions`) | ✅ CRUD | ⛔ | ⛔ |
| Danh mục thu/chi (`categories`) | ✅ CRUD | ⛔ | ⛔ |
| Thông báo (`notifications`) | ✅ đọc/đánh dấu | ⛔ | ⛔ |
| Cài đặt cá nhân (`user_settings`) | ✅ CRUD | ⛔ | ⛔ |
| Tệp trên Storage (tiền tố `user_id/`) | ✅ CRUD | ⛔ | ⛔ |

> **ADMIN cố tình KHÔNG có quyền** đọc/sửa dữ liệu nghiệp vụ (học sinh, bài học, lịch dạy, tài liệu, công nợ, thu/chi). Điều này được **RLS thực thi**: policy các bảng nghiệp vụ chỉ dùng `auth.uid() = user_id`, **không** có nhánh `is_admin()`. Nếu sau này cần hỗ trợ kỹ thuật, sẽ làm tính năng **impersonation có kiểm soát + ghi log** riêng (ngoài MVP).

### 3.2. Hồ sơ & tài khoản

| Tài nguyên | USER | ADMIN |
|---|---|---|
| Hồ sơ của chính mình (`profiles`: tên, ảnh, SĐT…) | ✅ đọc/sửa phần thông tin | 🔎 đọc thông tin tài khoản |
| Vai trò (`role`) | ⛔ (không tự đổi) | 🅰️ đặt/đổi |
| Trạng thái khóa tài khoản (`is_locked`) | 🔎 (biết mình bị khóa) | 🅰️ khóa/mở |
| Thuê bao (`subscriptions`: gói, trạng thái, ngày bắt đầu/hết hạn) | 🔎 chỉ xem | 🅰️ quản lý |
| Lịch sử thanh toán/kích hoạt/gia hạn (`subscription_payments`) | 🔎 chỉ xem của mình | 🅰️ tạo/xác nhận |

### 3.3. Nền tảng (chỉ ADMIN)

| Tài nguyên | USER | ADMIN |
|---|---|---|
| Danh sách/chi tiết tài khoản USER | ⛔ | 🅰️ |
| Danh mục gói (`plans`) | 🔎 (gói đang mở bán) | 🅰️ CRUD |
| Thuê bao & thanh toán (`subscriptions`, `subscription_payments`) | 🔎 của mình | 🅰️ quản lý toàn bộ |
| Nhật ký kiểm toán (`admin_audit_logs`) | ⛔ | 🅰️ đọc |
| Thống kê tổng hợp nền tảng | ⛔ | 🅰️ |

---

## 4. Ma trận thao tác ADMIN (chi tiết)

ADMIN chỉ thao tác trên **tài khoản** và **thuê bao**. Mọi thao tác kiểm tra `role=admin` ở máy chủ.

| Thao tác ADMIN | Mô tả | Ghi log |
|---|---|---|
| Xem/sửa thông tin tài khoản | Liệt kê/chi tiết, sửa thông tin tài khoản USER | `update_account` |
| Khóa tài khoản | Đặt `is_locked = true` | `lock_account` ✅ |
| Mở khóa tài khoản | Đặt `is_locked = false` | `unlock_account` ✅ |
| Xác nhận thanh toán & kích hoạt | Tạo `subscription_payments` (kind=`activation`); đặt `subscriptions`: gói, `started_at`, `expires_at`, `status=active` | `activate_subscription` ✅ |
| Gia hạn thuê bao | Tạo `subscription_payments` (kind=`renewal`); đẩy `expires_at` | `renew_subscription` ✅ |
| Đổi gói | Đổi `plan_id`/`billing_cycle` | `change_plan` |
| Hủy thuê bao | Đặt `status=cancelled`, `cancelled_at` | `cancel_subscription` |
| Quản lý danh mục gói | CRUD `plans` | — |
| Xem thống kê | Số liệu tổng hợp (không phải dữ liệu nghiệp vụ từng USER) | — |

Các thao tác đánh dấu ✅ là **bắt buộc** ghi `admin_audit_logs`: `actor_id`, `action`, `target_user_id`, `target_subscription_id`, `metadata`, `created_at`. (Toàn bộ: kích hoạt, gia hạn, đổi/hủy gói, khóa, mở khóa.)

> **Ranh giới cứng:** ADMIN **không** có bất kỳ thao tác nào đọc/sửa `students`, `lessons`, `sessions`, `documents`, `invoices`, `payables`, `transactions`… của USER. Xem §3.1.

---

## 5. Cơ chế kỹ thuật thực thi

### 5.1. Xác thực (Authentication)
- Supabase Auth (email/mật khẩu; có thể thêm magic link sau).
- Phiên quản lý qua cookie bằng `@supabase/ssr` để hoạt động với Next.js App Router (Server Components, Route Handlers, Middleware).

### 5.2. Kiểm tra vai trò (Authorization)
- Đọc `role` từ JWT (`app_metadata.role`) — không truy vấn bảng.
- Middleware chặn `/admin/**` nếu `role !== 'admin'`; chặn `/app/**` nếu chưa đăng nhập.
- **Quan trọng:** Middleware chỉ là lớp 2. Mọi Route Handler/Server Action vẫn phải **tự xác minh lại** vai trò/quyền sở hữu (không tin client, không tin chỉ mỗi middleware).

### 5.3. Row Level Security (RLS) — lớp lõi
Bật RLS trên mọi bảng dữ liệu khách. Mẫu policy chuẩn:

```sql
-- Bật RLS
alter table public.students enable row level security;

-- USER chỉ thấy dữ liệu của mình
create policy "students_select_own"
on public.students for select
using ( auth.uid() = user_id );

-- USER chỉ tạo dữ liệu gắn với chính mình
create policy "students_insert_own"
on public.students for insert
with check ( auth.uid() = user_id );

-- USER chỉ sửa dữ liệu của mình
create policy "students_update_own"
on public.students for update
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- USER chỉ xóa dữ liệu của mình
create policy "students_delete_own"
on public.students for delete
using ( auth.uid() = user_id );
```

Hàm hỗ trợ kiểm tra ADMIN từ JWT (dùng cho các bảng nền tảng):

```sql
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Ví dụ: bảng plans cho USER đọc gói đang mở bán, ADMIN toàn quyền
alter table public.plans enable row level security;

create policy "plans_read_public_active"
on public.plans for select
using ( is_active = true or public.is_admin() );

create policy "plans_admin_write"
on public.plans for all
using ( public.is_admin() )
with check ( public.is_admin() );
```

### 5.4. `service_role` — chỉ ở máy chủ
- `SUPABASE_SERVICE_ROLE_KEY` **bỏ qua RLS** → chỉ dùng trong Route Handler/Server Action cho các tác vụ ADMIN thực sự (đặt vai trò, đổi trạng thái tài khoản).
- **Tuyệt đối không** import/khởi tạo client `service_role` trong Client Component hoặc bất kỳ mã gửi tới trình duyệt.
- Client trình duyệt chỉ dùng `anon key` (đi kèm RLS).

```
Biến môi trường:
  NEXT_PUBLIC_SUPABASE_URL         → công khai, dùng ở client
  NEXT_PUBLIC_SUPABASE_ANON_KEY    → công khai, dùng ở client (RLS bảo vệ)
  SUPABASE_SERVICE_ROLE_KEY        → BÍ MẬT, chỉ máy chủ, KHÔNG có tiền tố NEXT_PUBLIC
```

### 5.5. Đặt `user_id` khi ghi dữ liệu
- Không nhận `user_id` từ client. Ở Server Action/Route Handler, lấy `user_id` từ phiên đã xác thực (`auth.uid()`), rồi mới ghi.
- Có thể đặt mặc định ở CSDL để chắc chắn:

```sql
alter table public.students
  alter column user_id set default auth.uid();
```

---

## 6. Kiểm soát theo trạng thái gói (Subscription Gating)

| Trạng thái | Đọc dữ liệu | Ghi/sửa dữ liệu | Ghi chú |
|---|---|---|---|
| `trialing` (còn hạn) | ✅ | ✅ | Đầy đủ tính năng trong thời gian dùng thử |
| `active` | ✅ | ✅ | Đã trả tiền, thuê bao còn hạn |
| `past_due` | ✅ | ⚠️ hạn chế | Quá hạn thanh toán — nhắc gia hạn |
| `expired` | ✅ (chỉ đọc) | ⛔ | Hết hạn (kể cả trial hết hạn) — chế độ chỉ đọc, giữ dữ liệu |
| `cancelled` | ⚠️ theo chính sách lưu trữ | ⛔ | Đã hủy — có thời gian ân hạn trước khi ẩn |
| `is_locked = true` (ADMIN khóa) | ⛔ | ⛔ | Khóa tài khoản — đăng nhập bị chặn |

- Gating chủ yếu thực thi ở **middleware + máy chủ** (đơn giản, dễ bảo trì cho MVP). Cách ly theo `user_id` vẫn do RLS đảm bảo.
- (Tùy chọn nâng cao, phiên bản sau) đưa điều kiện trạng thái gói vào RLS để chặn ghi ở tầng CSDL.

---

## 7. Nguyên tắc "không dựa vào giao diện"

| Sai (không được làm) | Đúng (bắt buộc) |
|---|---|
| Ẩn nút "Xóa" để chặn xóa | RLS + kiểm tra quyền sở hữu ở server chặn thao tác xóa |
| Ẩn menu `/admin` để chặn USER | Middleware + kiểm tra `role` ở server chặn truy cập |
| Tin `user_id` gửi từ form | Lấy `user_id` từ phiên đã xác thực ở server |
| Lọc dữ liệu USER bằng câu truy vấn ở client | RLS lọc tại CSDL; client không thể vượt qua |
| Dùng `service_role` ở client cho tiện | Chỉ dùng `anon key` ở client; `service_role` ở server |

---

## 8. Kiểm thử phân quyền (bắt buộc trước khi phát hành)

Bộ kiểm thử tối thiểu để chứng minh cách ly dữ liệu:

1. **Cách ly đọc:** USER A không đọc được bất kỳ bản ghi nào của USER B (thử mọi bảng) → phải trả về rỗng/403.
2. **Cách ly ghi:** USER A không thể `insert/update/delete` bản ghi với `user_id` của B → bị RLS từ chối.
3. **Giả mạo `user_id`:** Gửi request cố tình đặt `user_id` = B khi đăng nhập là A → bị chặn.
4. **Chặn ADMIN route:** USER thường gọi API/route `/admin/**` → 403, kể cả khi biết URL.
5. **Chặn leo thang vai trò:** USER thường cố cập nhật `app_metadata.role = admin` → không thể (chỉ `service_role`).
6. **Rò rỉ `service_role`:** Quét bundle client bảo đảm không chứa `SERVICE_ROLE` key.
7. **Gating thuê bao:** Tài khoản `expired`/`cancelled` (kể cả trial hết hạn) không thực hiện được thao tác ghi.
8. **Storage cách ly:** USER A không tải được tệp trong tiền tố `B/` trên Storage.
9. **ADMIN không đọc dữ liệu nghiệp vụ:** đăng nhập bằng tài khoản ADMIN, thử đọc `students`/`sessions`/`invoices`… của USER qua RLS → phải trả về rỗng/từ chối (policy không có nhánh `is_admin`).

> Mục tiêu: **0 trường hợp rò rỉ dữ liệu chéo.** Đây là tiêu chí chặn phát hành (release blocker).

---

## 9. Tài liệu liên quan
- Yêu cầu sản phẩm: [`PRD.md`](./PRD.md)
- Thiết kế CSDL & RLS chi tiết: [`DATABASE.md`](./DATABASE.md)
- Lộ trình: [`ROADMAP.md`](./ROADMAP.md)
