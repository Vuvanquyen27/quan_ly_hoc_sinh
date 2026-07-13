---
name: vertical-slice-crud-rls
description: Use when adding a new USER-owned business data table to the EduFlow codebase (sessions, attendance, categories, invoices, invoice_items, payables, transactions, notifications) — any Giai đoạn 4–8 CRUD feature needing migration + RLS isolation + server actions + list/form/detail UI. Triggers - "thêm bảng", "lát cắt dọc", "CRUD entity mới", "quản lý <thực thể>".
---

# Vertical Slice CRUD + RLS (EduFlow)

## Overview

Khuôn mẫu bắt buộc để thêm một bảng dữ liệu khách vào EduFlow. **Nhân bản chính xác** hai lát cắt đã kiểm chứng — `students` (GĐ2) và `lessons` (GĐ3A) — thay vì tự thiết kế lại. Mọi lệch khỏi khuôn = thiếu nhất quán hoặc lỗ hổng cách ly.

**Nguồn chân lý để copy:** `server/students/*.ts`, `server/lessons/*.ts`, `lib/validators/student.ts`, `app/(app)/hoc-sinh/**`, `components/students/student-form.tsx`, `supabase/migrations/0004_students.sql`, `scripts/test-rls-students.mjs`. Đọc file gần nhất cùng loại và đổi tên thực thể.

## When to Use

- Thêm bất kỳ bảng nghiệp vụ mới thuộc một USER (có cột `user_id`).
- KHÔNG dùng cho: bảng ADMIN (`subscriptions`, `admin_audit_logs` — có nhánh `is_admin`), bảng hệ thống, hay Storage (xem spec 3B riêng).

## Bản đồ file (tạo đúng các đường dẫn này)

| File | Trách nhiệm |
|---|---|
| `supabase/migrations/00NN_<table>.sql` | Bảng + 4 policy RLS + index + trigger. Số NN kế tiếp. |
| `scripts/test-rls-<table>.mjs` | Test cách ly (copy `test-rls-students.mjs`, đổi tên bảng + field bắt buộc). |
| `lib/validators/<entity>.ts` + `.test.ts` | Zod schema (KHÔNG có `user_id`) + unit test. |
| `server/<entity>/queries.ts` | `list<Entity>` (phân trang) + `get<Entity>`. |
| `server/<entity>/actions.ts` | `save<Entity>` + `archive<Entity>Action`. |
| `app/(app)/<route>/page.tsx` + `moi/` + `[id]/` + `[id]/sua/` | Danh sách / thêm / chi tiết / sửa. |
| `components/<entity>/<entity>-form.tsx` | Form `useActionState`. |
| `components/app-nav.tsx` | Thêm mục vào `NAV_ITEMS`. |

## Bất biến bảo mật (KHÔNG được vi phạm)

1. `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`.
2. **4 policy RLS**, không nhánh admin:
   ```sql
   alter table public.<t> enable row level security;
   create policy <t>_select on public.<t> for select using (auth.uid() = user_id);
   create policy <t>_insert on public.<t> for insert with check (auth.uid() = user_id);
   create policy <t>_update on public.<t> for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create policy <t>_delete on public.<t> for delete using (auth.uid() = user_id);
   ```
3. Trigger: `create trigger trg_<t>_updated before update on public.<t> for each row execute function public.set_updated_at();` (hàm đã tồn tại — KHÔNG tạo lại).
4. Index tối thiểu `(user_id)` và `(user_id, <cột-lọc>)`.
5. Server actions: **KHÔNG BAO GIỜ** đưa `user_id` vào payload insert — để DB default `auth.uid()`. (Comment: `// Không truyền user_id — CSDL đặt mặc định auth.uid().`)
6. Xóa mềm bằng `archived_at`, không xóa cứng.

## Hợp đồng tầng server (khớp students/lessons)

- Actions dùng helper local `requireWritable()` = `getSessionContext()` (`@/lib/auth`) + `isReadOnly(ctx)`; chưa đăng nhập → `redirect('/dang-nhap')`.
- `save<Entity>(_prev, formData)` trả **`ActionState = { error?: string } | null`** (dùng cho `useActionState`), thành công → `revalidatePath` + `redirect`. KHÔNG trả `{ ok, data }`.
- `list<Entity>(params)` trả `{ rows, total, page, pageSize }`: `.select('*', { count: 'exact' }).is('archived_at', null).order(...).range(from, to)`, `PAGE_SIZE = 20`.
- Dùng `createServerSupabase()` (anon+phiên) — **KHÔNG** dùng `admin.ts`/service_role cho dữ liệu nghiệp vụ.

## UI (khớp trang `hoc-sinh` sau nâng cấp DSCITY)

- Chỉ semantic token: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, badge `bg-secondary text-secondary-foreground`. KHÔNG hex.
- CTA `buttonVariants({ variant: 'success' })`; responsive **bảng `hidden md:block` + card `md:hidden`**; phân trang Trước/Sau giữ query.
- Form: Client Component `useActionState`, field ẩn `id` khi sửa, lỗi Zod tiếng Việt.

## Quy trình 8 bước (mỗi bước 1 commit, TDD)

1. Migration + `scripts/test-rls-<t>.mjs` → áp → chạy test PASS. 2. Validator + unit test. 3. Queries + actions (`tsc --noEmit`). 4. (Nếu có nội dung rich) component phụ. 5. Form + thêm/sửa. 6. Danh sách + nav. 7. Chi tiết + lưu trữ. 8. `npm test` + `lint` + `build` + test RLS → cập nhật `IMPLEMENTATION_STATUS.md`.

## Lệnh

```bash
node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/00NN_<table>.sql
node --env-file=.env.local scripts/test-rls-<table>.mjs   # phải: "✅ CÁCH LY RLS ... ĐẠT."
npx tsc --noEmit && npm test && npm run lint && npm run build
```

## Common Mistakes (những lệch khỏi khuôn — sửa ngay)

| Sai (baseline hay làm) | Đúng (khuôn EduFlow) |
|---|---|
| Gán `user_id: user.id` trong insert | Bỏ hẳn `user_id` — DB default `auth.uid()` |
| Trả `{ ok, data, error }` | `ActionState = { error?: string } \| null` + redirect |
| Bịa helper `assertCanWrite()` | Dùng `getSessionContext` + `isReadOnly` (`@/lib/auth`) |
| Test RLS bằng `@supabase/supabase-js` | Copy template raw-fetch `test-rls-students.mjs` |
| Đặt `server/finance/x.ts`, `_components/` | `server/<entity>/{queries,actions}.ts`, `components/<entity>/` |
| Thêm `or is_admin()` vào policy | Bảng nghiệp vụ KHÔNG có nhánh admin |
| Tạo lại `set_updated_at()` | Hàm đã có — chỉ tạo trigger |
| Bỏ trang chi tiết vì "đơn giản" | Giữ đủ list/moi/[id]/sua cho nhất quán |

## Red Flags — DỪNG nếu bạn đang

- Viết `user_id` vào bất kỳ payload ghi nào.
- Định nghĩa `type ... = { ok: ... }` cho action.
- Import `@supabase/supabase-js` trong script test (phải raw fetch).
- Thêm `is_admin` vào policy bảng dữ liệu khách.
- Coi test cách ly RLS là tùy chọn — nó là **release blocker**.
