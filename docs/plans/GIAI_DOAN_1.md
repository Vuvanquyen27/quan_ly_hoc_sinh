# Giai đoạn 1 — Xác thực, Hồ sơ & Thuê bao · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`. Bước dùng checkbox.

**Goal:** USER đăng ký/đăng nhập/khôi phục mật khẩu; tự động có `profiles` + `user_settings` + `subscriptions` (trialing 14 ngày); route được bảo vệ; gating thuê bao/khóa hoạt động.

**Architecture:** Supabase Auth + `@supabase/ssr`. Trigger DB khởi tạo dữ liệu tài khoản khi có user mới. Vai trò đọc từ JWT `app_metadata.role`. Middleware chặn route; layout + server actions xác minh sâu.

**Tech Stack:** Next.js App Router, Supabase Auth/Postgres/RLS, `@supabase/ssr`, Zod.

## Global Constraints
- `user_id NOT NULL DEFAULT auth.uid()` + **RLS** mọi bảng khách.
- Vai trò/hạn/khóa: chỉ `service_role`/ADMIN đổi — USER không tự đổi.
- Trạng thái thuê bao: `trialing/active/past_due/expired/cancelled`.
- Tiếng Việt, VND, `Asia/Ho_Chi_Minh`. TDD + commit thường xuyên.

**Phụ thuộc:** Giai đoạn 0 hoàn tất (Supabase clients, format, middleware khung).

---

### Task 1: Migration — enums + bảng tài khoản/thuê bao + RLS

**Files:**
- Create: `supabase/migrations/0001_accounts_subscriptions.sql`

**Interfaces (Produces):** bảng `plans`, `profiles`, `user_settings`, `subscriptions`; enum `subscription_status`, `billing_cycle`.

- [ ] **Step 1: Viết migration** — theo `DATABASE.md §4, §5.1`:
```sql
-- Enums
create type subscription_status as enum ('trialing','active','past_due','expired','cancelled');
create type billing_cycle       as enum ('monthly','yearly');

-- plans (nền tảng)
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  price bigint not null default 0,
  billing_cycle billing_cycle not null,
  features jsonb not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- profiles (1-1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role text not null default 'user',
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_settings (1-1)
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'VND',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  locale text not null default 'vi',
  date_format text not null default 'dd/MM/yyyy',
  default_session_duration_min int not null default 90,
  notify_session_reminder boolean not null default true,
  notify_payment_due boolean not null default true,
  updated_at timestamptz not null default now()
);

-- subscriptions (1-1)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status subscription_status not null default 'trialing',
  billing_cycle billing_cycle,
  trial_ends_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.subscriptions (status);
create index on public.subscriptions (expires_at);
```

- [ ] **Step 2: Hàm is_admin()** (trong cùng migration):
```sql
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
```

- [ ] **Step 3: RLS** — theo `DATABASE.md §7`:
```sql
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.subscriptions enable row level security;

-- plans: USER đọc gói is_active; ADMIN toàn quyền
create policy plans_read on public.plans for select using (is_active or public.is_admin());
create policy plans_admin on public.plans for all using (public.is_admin()) with check (public.is_admin());

-- profiles: chủ hồ sơ đọc/sửa; ADMIN đọc
create policy profiles_select on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- user_settings: chủ sở hữu
create policy settings_all on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions: USER chỉ đọc của mình; ADMIN quản lý
create policy subs_select on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy subs_admin on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
```

- [ ] **Step 4: Áp migration** — `supabase db push` (hoặc chạy SQL qua CLI/dashboard đã versioned).
Expected: 4 bảng + enum + hàm + policy tạo thành công.

- [ ] **Step 5: Commit** — `git add supabase/migrations && git commit -m "feat(db): bảng tài khoản & thuê bao + RLS"`

---

### Task 2: Trigger khởi tạo tài khoản khi có user mới

**Files:**
- Create: `supabase/migrations/0002_handle_new_user.sql`

- [ ] **Step 1: Hàm + trigger**:
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_settings (user_id) values (new.id);
  insert into public.subscriptions (user_id, status, trial_ends_at)
    values (new.id, 'trialing', now() + interval '14 days');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Áp & kiểm thử tay** — tạo 1 user test → xác nhận 3 bản ghi được tạo, `subscriptions.status='trialing'`, `trial_ends_at ≈ now()+14d`.

- [ ] **Step 3: Commit** — `git commit -m "feat(db): trigger tạo profiles/user_settings/subscriptions khi đăng ký"`

---

### Task 3: Trang xác thực (đăng ký / đăng nhập / quên mật khẩu)

**Files:**
- Create: `app/(auth)/layout.tsx`, `app/(auth)/dang-ky/page.tsx`, `app/(auth)/dang-nhap/page.tsx`, `app/(auth)/quen-mat-khau/page.tsx`
- Create: `server/auth/actions.ts` (signUp/signIn/resetPassword)
- Create: `lib/validators/auth.ts` (Zod)

- [ ] **Step 1: Zod schema** — `lib/validators/auth.ts`: email hợp lệ, mật khẩu ≥ 8 ký tự (thông báo lỗi tiếng Việt).

- [ ] **Step 2: Server actions** — `server/auth/actions.ts`: dùng `createServerSupabase()`; `signUp`/`signInWithPassword`/`resetPasswordForEmail`; trả `{ ok, error? }`.

- [ ] **Step 3: UI form** — 3 trang dùng shadcn `Input`/`Button`/`Card`, nhãn tiếng Việt; hiển thị lỗi thân thiện; link chuyển qua lại.

- [ ] **Step 4: Kiểm thử tay** — đăng ký tài khoản mới → nhận email xác minh (hoặc auto-confirm ở dev) → đăng nhập được.

- [ ] **Step 5: Commit** — `git commit -m "feat(auth): đăng ký/đăng nhập/quên mật khẩu"`

---

### Task 4: Middleware chặn route theo phiên & vai trò

**Files:**
- Modify: `middleware.ts` (bổ sung guard sau `updateSession`)

- [ ] **Step 1: Bổ sung logic** — sau khi refresh phiên: nếu path thuộc `(app)` (vd `/tong-quan`, `/hoc-sinh`…) mà chưa đăng nhập → redirect `/dang-nhap`; nếu đã đăng nhập mà vào `/dang-nhap|/dang-ky` → redirect `/tong-quan`; nếu path `/admin/**` mà `app_metadata.role != 'admin'` → redirect `/` (hoặc 404). Đọc user qua `supabase.auth.getUser()` trong middleware.

- [ ] **Step 2: Kiểm thử tay** — truy cập `/tong-quan` khi chưa đăng nhập → về `/dang-nhap`; `/admin` bằng user thường → bị chặn.

- [ ] **Step 3: Commit** — `git commit -m "feat(auth): middleware chặn route theo phiên & vai trò"`

---

### Task 5: Layout (app) — gating thuê bao & khóa

**Files:**
- Create: `app/(app)/layout.tsx`, `lib/auth.ts` (getSessionContext, assertCanWrite)

- [ ] **Step 1: Helper** — `lib/auth.ts`: `getSessionContext()` trả `{ user, profile, subscription }`; `isReadOnly(subscription, profile)` = `is_locked || status in ('expired','cancelled') || (trialing && trial_ends_at < now)`.

- [ ] **Step 2: Layout** — `app/(app)/layout.tsx` (Server Component): lấy context; nếu `is_locked` → trang thông báo khóa; nếu read-only → hiển thị banner "Thuê bao đã hết hạn — vui lòng gia hạn" + truyền cờ read-only xuống UI (ẩn nút ghi là UX; chặn thật ở server action — xem Step 3).

- [ ] **Step 3: Chốt chặn ghi ở server** — trong helper action dùng chung, gọi `assertCanWrite(context)` trước mọi thao tác ghi; nếu read-only → trả lỗi "Tài khoản ở chế độ chỉ đọc".

- [ ] **Step 4: Commit** — `git commit -m "feat(app): gating thuê bao & khóa ở layout + server"`

---

### Task 6: Onboarding + seed một gói (tháng/năm)

**Files:**
- Create: `app/(app)/onboarding/page.tsx` + action cập nhật `profiles.full_name`
- Create: `supabase/seed.sql` (chỉ dev) — seed `plans`

- [ ] **Step 1: Seed plans** — `supabase/seed.sql`:
```sql
insert into public.plans (code, name, price, billing_cycle, sort_order) values
  ('pro_monthly','Gói Pro (tháng)', 99000,  'monthly', 1),
  ('pro_yearly', 'Gói Pro (năm)',   990000, 'yearly',  2)
on conflict (code) do nothing;
```
(Giá ví dụ — điều chỉnh theo quyết định kinh doanh.)

- [ ] **Step 2: Onboarding** — nếu `profiles.full_name` trống → yêu cầu nhập tên giáo viên, lưu qua server action, rồi vào `/tong-quan`.

- [ ] **Step 3: Commit** — `git commit -m "feat(app): onboarding tên giáo viên + seed gói Pro tháng/năm"`

---

### Task 7: Kiểm thử RLS & phân quyền (bắt buộc)

**Files:**
- Create: `supabase/tests/rls_phase1.sql` hoặc test script (theo công cụ chọn)

- [ ] **Step 1: Test cách ly profiles** — user A không đọc được `profiles`/`subscriptions` của user B.
- [ ] **Step 2: Test không leo thang** — user thường `update profiles set role='admin'` → bị RLS chặn (policy update chỉ cho cột thông tin; đổi role không có policy cho USER → thất bại). Xác nhận đổi `subscriptions` bởi USER cũng bị chặn.
- [ ] **Step 3: Test middleware admin** — user thường gọi `/admin` → chặn.
- [ ] **Step 4: Ghi kết quả** — mọi test PASS; nếu FAIL → dừng, sửa policy.
- [ ] **Step 5: Commit** — `git commit -m "test(rls): cách ly & chống leo thang vai trò (GĐ1)"`

---

## Tiêu chí hoàn thành (đối chiếu ROADMAP §GĐ1)
- [ ] Đăng ký → tự tạo profiles + user_settings + subscriptions (trialing, +14 ngày).
- [ ] Đăng nhập/đăng xuất/đặt lại mật khẩu hoạt động.
- [ ] Chưa đăng nhập vào `(app)` → chuyển hướng ở **server**.
- [ ] USER không tự đổi được `role`/trạng thái thuê bao (RLS chặn).
- [ ] `is_locked=true` → không vào app.

## Self-review (đã kiểm)
- Tên hàm nhất quán với Giai đoạn 0 (`createServerSupabase`, `is_admin`).
- SQL khớp `DATABASE.md` (cột, enum, RLS).
- Không placeholder; mỗi task có deliverable kiểm thử được.
