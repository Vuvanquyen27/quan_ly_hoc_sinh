# Thiết kế — Giai đoạn 4A: Buổi học (`sessions`) + Lịch

**Ngày:** 2026-07-14
**Trạng thái:** Đã duyệt (chờ nở implementation plan)
**Phạm vi:** Nửa đầu Giai đoạn 4 (ROADMAP §GĐ4). Nửa sau — **Điểm danh (`attendance`)** — tách sang spec 4B.

---

## 1. Mục tiêu & phạm vi

Quản lý **buổi học** của USER: lên lịch dạy, xem theo **Danh sách / Ngày / Tuần**, chuyển **trạng thái buổi** (sắp diễn ra → hoàn thành/đã hủy). Tái dùng khuôn "lát cắt dọc CRUD+RLS" của GĐ2/3, thêm một lớp UI lịch mỏng tính khoảng ngày theo chế độ xem. Thời gian lưu `timestamptz` (UTC), hiển thị `Asia/Ho_Chi_Minh`.

**KHÔNG thuộc 4A (YAGNI / để 4B hoặc sau):**
- Bảng `attendance`, form điểm danh, ghi chú sau buổi, hiển thị lịch sử buổi trong chi tiết học sinh → **4B**.
- Lưới **Tháng**; **lịch lặp** (`recurrence_group_id` chỉ giữ cột); **phát hiện trùng giờ** → sau.
- Tài chính: `is_billed` chỉ là cột, chưa tổng hợp hóa đơn → GĐ6+.

**Phụ thuộc:** GĐ2 (`students`, `students.default_fee`, khuôn CRUD, `public.set_updated_at()`, helper `getSessionContext`/`isReadOnly`); GĐ3 (`lessons` cho FK tùy chọn `lesson_id`); tiện ích định dạng `vi-VN` từ GĐ0.

---

## 2. Quyết định thiết kế (chốt qua brainstorming 2026-07-14)

1. **Tách 4A/4B:** 4A = `sessions` + lịch + chuyển trạng thái; 4B = `attendance` + ghi chú + hiển thị lịch sử học sinh.
2. **UI lịch MVP:** **Danh sách + Ngày + Tuần** (bỏ lưới Tháng).
3. **P1 defer:** không lặp lịch, không phát hiện trùng giờ ở 4A.
4. **Số migration:** `0008_sessions.sql` (0004 students, 0005 lessons, 0006 documents, 0007 storage đã dùng).

---

## 3. Data model — bảng `sessions` (bám DATABASE.md §5.3)

Migration mới: **`supabase/migrations/0008_sessions.sql`**

```sql
create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.session_mode as enum ('online', 'offline');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  mode public.session_mode not null default 'offline',
  location text,
  status public.session_status not null default 'scheduled',
  fee_amount bigint not null default 0 check (fee_amount >= 0),
  is_billed boolean not null default false,
  cancel_reason text,
  recurrence_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_time_valid check (end_time > start_time)
);

create index idx_sessions_user_start on public.sessions (user_id, start_time);
create index idx_sessions_user_status on public.sessions (user_id, status);
create index idx_sessions_user_student on public.sessions (user_id, student_id);

create trigger trg_sessions_updated before update on public.sessions
  for each row execute function public.set_updated_at();

-- RLS: chỉ chủ sở hữu (KHÔNG nhánh admin)
alter table public.sessions enable row level security;
create policy sessions_select on public.sessions for select using (auth.uid() = user_id);
create policy sessions_insert on public.sessions for insert with check (auth.uid() = user_id);
create policy sessions_update on public.sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sessions_delete on public.sessions for delete using (auth.uid() = user_id);
```

**Ghi chú:** `student_id` `ON DELETE CASCADE` (xóa học sinh → xóa buổi liên quan); `lesson_id` `ON DELETE SET NULL`. `fee_amount` số nguyên VND (bigint), CHECK ≥ 0. `recurrence_group_id` giữ cột cho P1 tương lai, chưa dùng.

---

## 4. Xử lý thời gian (điểm mới quan trọng của 4A)

- **Lưu:** `timestamptz` — luôn UTC trong DB.
- **Nhập:** ô `<input type="datetime-local">` cho giờ bắt đầu/kết thúc; giá trị được hiểu là **giờ Việt Nam** (Asia/Ho_Chi_Minh, UTC+7, không đổi giờ mùa). Ở action, chuyển chuỗi local VN → UTC ISO trước khi lưu bằng helper `vnLocalToUtc(local: string): string` (đặt trong `lib/datetime.ts` hoặc cùng validators). Vì VN không có DST, quy đổi là trừ 7 giờ — nhưng viết helper tường minh và có **unit test**.
- **Hiển thị:** dùng tiện ích định dạng `vi-VN` sẵn có (GĐ0): ngày `dd/MM/yyyy`, giờ 24h, timezone `Asia/Ho_Chi_Minh`. Nếu tiện ích hiện tại chưa ép timezone, bổ sung tham số `timeZone: 'Asia/Ho_Chi_Minh'` khi format (không tự chế lại định dạng).

---

## 5. Tầng ứng dụng (tái dùng khuôn students/lessons)

### 5.1 Validator — `lib/validators/session.ts`
- Zod `sessionSchema`: `studentId` bắt buộc (uuid, lỗi tiếng Việt "Vui lòng chọn học sinh"); `startTime`/`endTime` chuỗi datetime-local không rỗng; refine `start < end` ("Giờ kết thúc phải sau giờ bắt đầu"); `feeAmount` số nguyên ≥ 0 (ép từ chuỗi, mặc định 0); `mode` enum `['online','offline']`; `lessonId`/`title`/`location` optional.
- Hằng export: `SESSION_STATUSES` (`['scheduled','completed','cancelled']`), `STATUS_LABEL` (Sắp diễn ra / Đã hoàn thành / Đã hủy), `SESSION_MODES`, `MODE_LABEL` (Trực tuyến / Trực tiếp).
- Helper `vnLocalToUtc(local)` + `utcToVnLocal(iso)` (điền form sửa).
- Unit test `lib/validators/session.test.ts`: hợp lệ; thiếu `studentId` (fail); `start ≥ end` (fail); `fee < 0` (fail); `vnLocalToUtc`/`utcToVnLocal` khứ hồi đúng.

### 5.2 Queries — `server/sessions/queries.ts`
- `type SessionRow` (cột cần cho lịch/detail) + tùy chọn `student_name` (join `students.full_name` để hiển thị) — dùng `select('*, students(full_name)')` hoặc join phẳng.
- `listSessions({ from, to, status?, studentId? })` → mảng `SessionRow` lọc `start_time >= from AND start_time < to`, `order('start_time', asc)`; lọc `status`/`studentId` nếu có. (Không phân trang — lịch đọc theo khoảng ngày; khoảng tối đa 1 tuần/ngày nên số buổi nhỏ.)
- `getSession(id)` → `SessionRow | null`.

### 5.3 Actions — `server/sessions/actions.ts` (`'use server'`)
- `requireWritable()` (copy từ lessons).
- `saveSession(prev, formData)`: validate → chuyển giờ VN→UTC → nếu `feeAmount` để trống/0 và là buổi mới: lấy `students.default_fee` của học sinh đó làm `fee_amount`; **KHÔNG** truyền `user_id`; có `id` ẩn → update, không thì insert; `revalidatePath('/lich-day')` + redirect.
- `changeSessionStatus(formData)`: đọc `id`, `status` (∈ enum), `cancelReason?`; nếu `status='cancelled'` mà không có lý do → trả lỗi; cập nhật `status` (+ `cancel_reason` khi hủy); `revalidatePath('/lich-day')`.

---

## 6. Giao diện (`/lich-day`, chuẩn UI DSCITY — semantic token, responsive)

**Quy ước dùng chung** (đồng bộ `hoc-sinh`/`bai-hoc`/`tai-lieu`): chỉ semantic token; CTA chính `buttonVariants({ variant: 'success' })`, phụ `variant="outline"`; badge trạng thái `bg-secondary text-secondary-foreground`; input `bg-card`. Không hardcode hex.

**Route & file:**
- `app/(app)/lich-day/page.tsx` — trang lịch: đọc `?view=` (`list`|`day`|`week`, mặc định `week`) + `?date=` (mốc, mặc định hôm nay). Tính `[from, to]` theo view (ngày: 1 ngày; tuần: T2–CN; danh sách: khoảng 30 ngày tới). Gọi `listSessions`. Bộ chọn view + nút ◀ ▶ + nhãn khoảng. Empty-state "Chưa có buổi nào — Tạo buổi đầu tiên".
- `components/calendar/calendar-view.tsx` — render theo view:
  - **Danh sách**: nhóm theo ngày, mỗi buổi 1 dòng (giờ · học sinh · môn · badge).
  - **Ngày**: các buổi trong ngày, sắp theo giờ.
  - **Tuần**: MVP hiển thị **nhóm theo ngày** (T2–CN, mỗi ngày một cụm buổi) — đủ cho dạy 1-1, giữ interface `CalendarView` để nâng cấp lưới 7 cột sau. (Quyết định 2026-07-14: chọn nhóm-theo-ngày thay vì lưới 7 cột ở MVP.)
- `components/calendar/session-card.tsx` — thẻ buổi: giờ (VN), tên học sinh, tiêu đề/môn, badge trạng thái; link sang `/lich-day/[id]/sua`. Nếu buổi **quá giờ mà vẫn `scheduled`** → hiện gợi ý "Đánh dấu hoàn thành" (nút gọi `changeSessionStatus`).
- `app/(app)/lich-day/moi/page.tsx` + `app/(app)/lich-day/[id]/sua/page.tsx` — form tạo/sửa (nạp `getSession`, danh sách học sinh + bài học cho select).
- `components/sessions/session-form.tsx` — form (Client, theo mẫu `lesson-form.tsx`): chọn học sinh (bắt buộc), bài học (tùy chọn), `datetime-local` bắt đầu/kết thúc, hình thức (radio online/offline), địa điểm/link, học phí (số, tự điền `default_fee` khi chọn học sinh — hoặc để trống để action tự điền), tiêu đề. Nút chuyển trạng thái ở trang sửa (Hoàn thành / Hủy — hủy mở ô lý do).
- **Nav:** thêm mục **"Lịch dạy"** (`/lich-day`, icon lucide `CalendarDays`) vào `NAV_ITEMS`.

---

## 7. Kiểm thử (bám DoD)

- **Unit:** `lib/validators/session.test.ts` — như §5.1 (gồm khứ hồi `vnLocalToUtc`/`utcToVnLocal`).
- **Cách ly RLS:** `scripts/test-rls-sessions.mjs` — nhân bản `scripts/test-rls-lessons.mjs`: A tạo học sinh + 1 buổi; A đọc 1, B đọc 0; B chèn `sessions` với `user_id=A` → chặn (403); C(admin) đọc `sessions` → 0. Dọn user sau cùng. (Lưu ý: cần tạo 1 `students` cho A trước vì `student_id NOT NULL` — tạo qua REST bằng token A.)
  Chạy: `node --env-file=.env.local scripts/test-rls-sessions.mjs`.
- Trước khi coi 4A "xong": `npm test` xanh, `npm run lint` 0 error, `npm run build` OK (routes `/lich-day`, `/lich-day/moi`, `/lich-day/[id]/sua`), script RLS PASS.

---

## 8. Giả định & cắt bỏ (YAGNI)

1. Bỏ **lưới Tháng** ở MVP; chỉ Danh sách/Ngày/Tuần.
2. Không **lịch lặp** / không **phát hiện trùng giờ** (giữ cột `recurrence_group_id`).
3. `is_billed` chỉ là cột; chưa tổng hợp hóa đơn (GĐ6+).
4. **Điểm danh** + hiển thị lịch sử buổi trong chi tiết học sinh → **4B**.
5. VN không có DST → quy đổi UTC±7 tường minh, không dùng thư viện timezone nặng.
6. Lịch đọc theo khoảng ngày (≤ 1 tuần) nên **không phân trang** `listSessions`.

---

## 9. Tiêu chí hoàn thành 4A (đối chiếu ROADMAP §GĐ4 + DoD plan)

- [ ] Xem lịch **Danh sách/Ngày/Tuần**, điều hướng tiến/lùi; hiển thị đúng `Asia/Ho_Chi_Minh`.
- [ ] Tạo/sửa buổi (chọn học sinh, giờ, hình thức, học phí tự điền từ `default_fee`).
- [ ] Chuyển trạng thái (`scheduled → completed/cancelled`, hủy có lý do); buổi quá giờ → gợi ý hoàn thành.
- [ ] **Không** thao tác ghi nào nhận `user_id` từ client.
- [ ] **Test cách ly RLS `sessions` PASS** — tiêu chí chặn.

---

## 10. Sau 4A

- Sang **4B** — `attendance` (`0009_attendance.sql`): form điểm danh (present/absent/late/excused), `homework_done`, `note`, `upsert` theo `UNIQUE(session_id, student_id)`, hiển thị trong chi tiết học sinh.
- Cập nhật `docs/IMPLEMENTATION_STATUS.md` khi đóng 4A.
