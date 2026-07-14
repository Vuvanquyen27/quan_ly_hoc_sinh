# Giai đoạn 4B — Điểm danh (`attendance`) · Design

**Ngày:** 2026-07-15 · **Nhánh:** `feat/gd4b-diem-danh`
**Trạng thái:** Đã chốt (người dùng duyệt — Phương án A)
**Nguồn chân lý schema:** `docs/DATABASE.md §5.3` · **Roadmap:** `docs/ROADMAP.md §GĐ4` · **Plan tổng:** `docs/plans/GIAI_DOAN_4.md` (Task 5)

---

## 1. Mục tiêu

Sau mỗi buổi học, giáo viên ghi **điểm danh** (có mặt/vắng/trễ/có phép), **tình trạng bài tập**, và **nhận xét** cho học sinh của buổi. Dữ liệu hiển thị lại trong **lịch sử của học sinh**. Cách ly tuyệt đối theo `user_id` + RLS.

MVP dạy **1 kèm 1**: mỗi `session` có đúng **1** bản ghi `attendance`. Bảng tách riêng khỏi `sessions` để mở rộng lớp nhóm sau này mà không đổi cấu trúc.

## 2. Quyết định thiết kế

| Quyết định | Chọn | Lý do |
|---|---|---|
| **Vị trí form điểm danh** | **A — trong trang sửa buổi** `/lich-day/[id]/sua` | Người dùng chọn. Trang này đã là nơi tập trung thao tác trên 1 buổi (đã có nút đổi trạng thái). Không tạo route trùng lặp. Nhanh cho MVP. |
| **Cơ chế ghi** | **Upsert** theo `UNIQUE(session_id, student_id)` | 1 buổi ↔ 1 điểm danh; ghi lại nhiều lần chỉ cập nhật. Không dùng archive/soft-delete. |
| **Khi nào cho điểm danh** | Buổi **`scheduled` hoặc `completed`**; **không** cho buổi `cancelled` | Điểm danh vô nghĩa với buổi đã hủy. Cho ghi trước khi hoàn thành để linh hoạt. |
| **Lưu điểm danh ↔ trạng thái buổi** | Độc lập — lưu điểm danh **không** tự đổi `status` | Giữ đơn giản, tránh tác dụng phụ bất ngờ; GV tự bấm "Đánh dấu hoàn thành". |
| **`homework_done`** | Tri-state: `null` (Không ghi nhận) / `true` (Đã làm) / `false` (Chưa làm) | Khớp cột `boolean` nullable trong DATABASE §5.3. |
| **Học sinh của điểm danh** | Lấy `student_id` từ `session.student_id` (không cho chọn) | MVP 1-1: buổi đã gắn 1 học sinh. Tránh lệch dữ liệu. |

## 3. Schema — `supabase/migrations/0009_attendance.sql`

```sql
create type public.attendance_status as enum ('present','absent','late','excused');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  homework_done boolean,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_session_student_unique unique (session_id, student_id)
);

create index idx_attendance_user_student on public.attendance (user_id, student_id);
create index idx_attendance_user_session on public.attendance (user_id, session_id);

create trigger trg_attendance_updated before update on public.attendance
  for each row execute function public.set_updated_at();

alter table public.attendance enable row level security;
create policy attendance_select on public.attendance for select using (auth.uid() = user_id);
create policy attendance_insert on public.attendance for insert with check (auth.uid() = user_id);
create policy attendance_update on public.attendance for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy attendance_delete on public.attendance for delete using (auth.uid() = user_id);
```

- Enum `attendance_status` **chưa tồn tại** (migration `0008` chỉ tạo `session_status`/`session_mode`) → tạo mới ở đây.
- RLS 4 policy thuần `auth.uid() = user_id` — **không** nhánh `is_admin` (ADMIN không đọc dữ liệu nghiệp vụ).
- Hàm `public.set_updated_at()` đã tồn tại — chỉ tạo trigger.

## 4. Tầng server — `server/attendance/`

**`queries.ts`**
- `getAttendanceForSession(sessionId)` → `AttendanceRow | null`.
- `listAttendanceForStudent(studentId)` → danh sách bản ghi điểm danh của học sinh, JOIN `sessions(start_time, status, title)` để hiển thị buổi; sắp theo `sessions.start_time` giảm dần.

**`actions.ts`**
- `saveAttendance(_prev, formData): Promise<ActionState>` với `ActionState = { error?: string } | null`.
  - Gate `requireWritable()` = `getSessionContext()` + `isReadOnly()`; chưa đăng nhập → `redirect('/dang-nhap')`.
  - Đọc `sessionId` từ form; truy `sessions` lấy `student_id` + `status`; chặn nếu buổi `cancelled`.
  - **Upsert** `attendance` với `onConflict: 'session_id,student_id'`. **Không** truyền `user_id` (DB default `auth.uid()`).
  - `revalidatePath('/lich-day/[id]/sua', 'page')` + `revalidatePath('/hoc-sinh/[id]')` (buổi ↔ học sinh); ở lại trang sửa (không redirect đi).

**`lib/validators/attendance.ts` + `.test.ts`**
- Zod (KHÔNG có `user_id`): `status` ∈ 4 giá trị (bắt buộc), `homeworkDone` ∈ `''|'true'|'false'`, `note` optional (trim). Hằng `ATTENDANCE_STATUSES`, `ATTENDANCE_STATUS_LABEL` (tiếng Việt).

## 5. Giao diện

**`components/attendance/attendance-form.tsx`** (Client, `useActionState`)
- Field ẩn `sessionId`. `status` (select/radio, 4 nhãn tiếng Việt), `homework_done` (select 3: Không ghi nhận/Đã làm/Chưa làm), `note` (textarea). Nút "Lưu điểm danh" (`variant="success"`). Hiển thị lỗi Zod tiếng Việt. Prefill từ bản ghi hiện có.
- Chỉ semantic token; responsive.

**Gắn vào `app/(app)/lich-day/[id]/sua/page.tsx`**
- Dưới `SessionForm` + khối đổi trạng thái, thêm `<section>` "Điểm danh & nhận xét" **khi `session.status !== 'cancelled'`**; load `getAttendanceForSession(id)` truyền vào form.

**Lịch sử ở `app/(app)/hoc-sinh/[id]/page.tsx`**
- Thêm section "Lịch sử buổi học & điểm danh": `listAttendanceForStudent(id)` → bảng/card: ngày-giờ buổi (`Asia/Ho_Chi_Minh`), trạng thái điểm danh (badge), bài tập, trích note. Trạng thái rỗng gọn gàng.

## 6. Kiểm thử — release blocker

- **`scripts/test-rls-attendance.mjs`** (copy khuôn `test-rls-students.mjs`, raw fetch — **không** dùng `@supabase/supabase-js`): A tạo được của mình; B không đọc/ghi/sửa/xóa của A; giả mạo `user_id` → chặn; ADMIN không đọc. Phải in `✅ CÁCH LY RLS ATTENDANCE ĐẠT.`
- **Unit test** validator.
- Cổng đóng GĐ: `npx tsc --noEmit && npm test && npm run lint && npm run build` xanh + test RLS PASS.

## 7. Ngoài phạm vi (YAGNI)

- Lớp nhóm nhiều học sinh / điểm danh hàng loạt (bảng đã chừa đường mở rộng).
- Thống kê chuyên cần, biểu đồ.
- Tự động lập hóa đơn từ buổi (thuộc GĐ5).

## 8. DoD (đối chiếu ROADMAP §GĐ4)

- [ ] Ghi điểm danh + nhận xét từ trang buổi; upsert đúng (ghi lại chỉ cập nhật).
- [ ] Hiển thị đúng theo `Asia/Ho_Chi_Minh` trong lịch sử học sinh.
- [ ] Buổi `cancelled` không cho điểm danh.
- [ ] RLS test `attendance` PASS (cách ly tuyệt đối).
