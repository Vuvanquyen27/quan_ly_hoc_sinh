# Giai đoạn 2 — Quản lý học sinh (pattern chuẩn) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`. Bước dùng checkbox.

**Goal:** CRUD hồ sơ học sinh đầy đủ (thêm/sửa/lưu trữ/tìm kiếm), thiết lập **pattern tái dùng** cho mọi bảng nghiệp vụ sau: migration + RLS 4 policy + server actions lấy `user_id` từ phiên + UI list/form/detail + bộ test cách ly.

**Architecture:** Vertical slice. Đọc bằng Server Component + server client (RLS lọc theo `user_id`); ghi bằng Server Action (Zod validate, `user_id = auth.uid()`); xóa mềm bằng `archived_at`.

**Tech Stack:** Next.js App Router, Supabase/RLS, `@supabase/ssr`, Zod, shadcn/ui.

## Global Constraints
- `user_id NOT NULL DEFAULT auth.uid()`; RLS `auth.uid() = user_id` (KHÔNG nhánh admin).
- Không nhận `user_id` từ client. Xóa mềm, không xóa cứng.
- Tiếng Việt, VND (`default_fee`), `Asia/Ho_Chi_Minh`. TDD + commit thường xuyên.

**Phụ thuộc:** Giai đoạn 1 (auth, gating, layout (app)).

> 📌 **Đây là plan mẫu.** Các giai đoạn 3–8 lặp lại cấu trúc 6 task này cho bảng của chúng (lessons, documents, sessions, invoices, payables, transactions…).

---

### Task 1: Migration `students` + RLS + chỉ mục

**Files:**
- Create: `supabase/migrations/0003_students.sql`

- [ ] **Step 1: Bảng + enum** (theo `DATABASE.md §5.2`):
```sql
create type student_status as enum ('active','paused','inactive');

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  gender text,
  grade_level text,
  subjects text[] not null default '{}',
  phone text, email text,
  parent_name text, parent_phone text,
  address text,
  default_fee bigint not null default 0,
  fee_type text not null default 'per_session',
  status student_status not null default 'active',
  avatar_url text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.students (user_id);
create index on public.students (user_id, status);
create index on public.students (user_id, full_name);
```

- [ ] **Step 2: RLS 4 policy** (mẫu chuẩn — copy cho bảng sau):
```sql
alter table public.students enable row level security;
create policy students_select on public.students for select using (auth.uid() = user_id);
create policy students_insert on public.students for insert with check (auth.uid() = user_id);
create policy students_update on public.students for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy students_delete on public.students for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Trigger updated_at** — tạo hàm `set_updated_at()` dùng chung (nếu chưa có) + trigger cho `students`.

- [ ] **Step 4: Áp migration** — `supabase db push`. Expected: bảng + RLS ok.

- [ ] **Step 5: Commit** — `git commit -m "feat(db): bảng students + RLS + chỉ mục"`

---

### Task 2: Validator + Server Actions

**Files:**
- Create: `lib/validators/student.ts` (Zod)
- Create: `server/students/actions.ts`

**Interfaces (Produces):**
- `createStudent(input)` / `updateStudent(id, input)` / `archiveStudent(id)` / `listStudents(query)` → `{ ok, data?, error? }`

- [ ] **Step 1: Zod schema** — `student.ts`: `full_name` bắt buộc; `default_fee` số nguyên ≥ 0; `status` trong enum; thông báo lỗi tiếng Việt.

- [ ] **Step 2: Actions** — `actions.ts`:
  - Mọi action: `getSessionContext()` + `assertCanWrite()` (từ GĐ1) trước khi ghi.
  - `createStudent`: validate → insert (KHÔNG truyền `user_id`, để DB default `auth.uid()`).
  - `updateStudent`/`archiveStudent`: thao tác theo `id`; RLS tự chặn nếu không thuộc user.
  - `listStudents`: nhận `{ search?, status?, page? }`; truy vấn phân trang (`range`), lọc `archived_at is null`.

- [ ] **Step 3: Test đơn vị validator** — `lib/validators/student.test.ts`: hợp lệ/không hợp lệ (thiếu tên, phí âm). Run `npm test` → PASS.

- [ ] **Step 4: Commit** — `git commit -m "feat(students): validator + server actions CRUD"`

---

### Task 3: Trang danh sách (tìm kiếm/lọc/phân trang)

**Files:**
- Create: `app/(app)/hoc-sinh/page.tsx`, `components/students/student-table.tsx`, `components/students/student-filters.tsx`

- [ ] **Step 1: Server Component list** — `page.tsx` đọc `listStudents` theo `searchParams` (search/status/page); render bảng.
- [ ] **Step 2: Bộ lọc + tìm kiếm** — ô tìm theo tên, lọc trạng thái/môn; cập nhật URL query.
- [ ] **Step 3: Trạng thái rỗng/tải/lỗi** — empty state hướng dẫn "Thêm học sinh đầu tiên".
- [ ] **Step 4: Responsive** — bảng cuộn ngang trên điện thoại hoặc chuyển card.
- [ ] **Step 5: Commit** — `git commit -m "feat(students): trang danh sách + tìm kiếm/lọc"`

---

### Task 4: Form thêm/sửa

**Files:**
- Create: `app/(app)/hoc-sinh/moi/page.tsx`, `app/(app)/hoc-sinh/[id]/sua/page.tsx`, `components/students/student-form.tsx`

- [ ] **Step 1: Form dùng lại** — `student-form.tsx` (Client Component) với shadcn `Input`/`Select`/`Textarea`; hiển thị lỗi Zod tiếng Việt; nhập `default_fee` định dạng VND.
- [ ] **Step 2: Trang thêm** — gọi `createStudent`; thành công → chuyển danh sách + toast.
- [ ] **Step 3: Trang sửa** — nạp dữ liệu học sinh (RLS đảm bảo của mình); gọi `updateStudent`.
- [ ] **Step 4: Commit** — `git commit -m "feat(students): form thêm/sửa"`

---

### Task 5: Trang chi tiết học sinh

**Files:**
- Create: `app/(app)/hoc-sinh/[id]/page.tsx`

- [ ] **Step 1: Hiển thị hồ sơ** — thông tin học sinh; nút Sửa/Lưu trữ.
- [ ] **Step 2: Khu vực chờ dữ liệu liên quan** — chỗ dành cho buổi học/công nợ/tài liệu (điền ở GĐ4–5); giờ hiển thị "Chưa có dữ liệu".
- [ ] **Step 3: Lưu trữ** — nút gọi `archiveStudent` (xác nhận); đặt `archived_at`.
- [ ] **Step 4: Commit** — `git commit -m "feat(students): trang chi tiết + lưu trữ"`

---

### Task 6: Kiểm thử cách ly RLS (mẫu tái dùng)

**Files:**
- Create: `supabase/tests/rls_students.sql` (hoặc script test)

- [ ] **Step 1: Chuẩn bị 2 user A, B** + mỗi user 1 học sinh.
- [ ] **Step 2: Đọc chéo** — A `select` học sinh của B → **0 dòng**.
- [ ] **Step 3: Ghi chéo** — A `update`/`delete` học sinh của B → **0 dòng ảnh hưởng**.
- [ ] **Step 4: Giả mạo** — A `insert` với `user_id = B` → bị chặn (`with check`).
- [ ] **Step 5: ADMIN không đọc** — tài khoản admin `select` students → **0 dòng** (không nhánh `is_admin`).
- [ ] **Step 6: Commit** — `git commit -m "test(rls): cách ly students (mẫu cho các bảng sau)"`

---

## Tiêu chí hoàn thành (đối chiếu ROADMAP §GĐ2)
- [ ] Thêm/sửa/lưu trữ/tìm kiếm học sinh hoạt động, responsive.
- [ ] Bộ test RLS đầy đủ PASS (đọc/ghi chéo, giả mạo, admin không đọc).
- [ ] Danh sách phân trang + dùng chỉ mục `(user_id, ...)`.
- [ ] Không thao tác ghi nào nhận `user_id` từ client (rà soát code).

## Self-review (đã kiểm)
- Pattern RLS 4 policy + action lấy `user_id` từ phiên là khuôn mẫu cho GĐ3–8.
- Tên action nhất quán (`createStudent`/`updateStudent`/`archiveStudent`/`listStudents`).
- Khớp `DATABASE.md §5.2`; không placeholder.
