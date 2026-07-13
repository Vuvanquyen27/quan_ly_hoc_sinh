# Thiết kế — Giai đoạn 3A: Bài học (`lessons`)

**Ngày:** 2026-07-13
**Trạng thái:** Đã duyệt (chờ nở implementation plan)
**Phạm vi:** Nửa đầu Giai đoạn 3 (ROADMAP §GĐ3). Nửa sau (Tài liệu + Storage) tách sang spec 3B.

---

## 1. Mục tiêu & phạm vi

Thư viện **bài học** của USER: tạo / sửa / lưu-trữ (xóa mềm) / tìm-kiếm / lọc, trang chi tiết **render Markdown an toàn**. Tái dùng nguyên khuôn mẫu "lát cắt dọc CRUD+RLS" đã chốt ở Giai đoạn 2 (students).

**KHÔNG thuộc 3A** (để 3B): bảng `documents`, upload tệp, Supabase Storage, signed URL, đính kèm tài liệu vào bài học/học sinh.

**Phụ thuộc:** Giai đoạn 2 (khuôn mẫu CRUD + hàm `public.set_updated_at()` đã tồn tại; helper `getSessionContext`/`isReadOnly` trong `lib/auth.ts`).

---

## 2. Data model — bảng `lessons` (bám DATABASE.md §5.2)

Migration mới: **`supabase/migrations/0005_lessons.sql`**
> ⚠️ Đổi so với `docs/plans/GIAI_DOAN_3.md` (ghi `0004_lessons_documents`): số 0004 đã dùng cho `students`, và ta tách 3A/3B → 3A = `0005_lessons.sql`; 3B sẽ là `0006_documents.sql` + `0007_storage_documents.sql`.

```sql
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  grade_level text,
  description text,
  content text,                      -- Markdown
  tags text[] not null default '{}',
  order_index int not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lessons_user on public.lessons (user_id);
create index idx_lessons_user_subject on public.lessons (user_id, subject);

create trigger trg_lessons_updated before update on public.lessons
  for each row execute function public.set_updated_at();

-- RLS: chỉ chủ sở hữu (KHÔNG nhánh admin) — copy khuôn students
alter table public.lessons enable row level security;
create policy lessons_select on public.lessons for select using (auth.uid() = user_id);
create policy lessons_insert on public.lessons for insert with check (auth.uid() = user_id);
create policy lessons_update on public.lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lessons_delete on public.lessons for delete using (auth.uid() = user_id);
```

**Ghi chú:** DATABASE.md khai báo `status` kiểu `text` → giữ `text` + CHECK ràng buộc giá trị (không tạo enum riêng), để khớp nguồn chân lý mà vẫn chặn dữ liệu sai.

---

## 3. Tầng ứng dụng (tái dùng khuôn students)

### 3.1 Validator — `lib/validators/lesson.ts`
- Zod `lessonSchema`: `title` bắt buộc (trim, min 1, lỗi tiếng Việt); `subject`/`gradeLevel`/`description`/`content`/`tags` optional; `status` enum `['draft','published']`.
- `tags` nhập dạng **chuỗi phân tách bằng dấu phẩy** ở form → tách thành `text[]` ở tầng action (giống `subjects` của students).
- Export hằng: `LESSON_STATUSES`, `STATUS_LABEL` (`draft`→"Nháp", `published`→"Đã xuất bản").
- Unit test `lib/validators/lesson.test.ts`: hợp lệ; thiếu title (fail); status ngoài enum (fail).

### 3.2 Queries — `server/lessons/queries.ts`
- `type Lesson` (các cột cần cho list/detail).
- `listLessons({ search?, subject?, status?, page? })` → `{ rows, total, page, pageSize }`, **phân trang** `range` + `count: 'exact'`, `is('archived_at', null)`, `order('updated_at', desc)`; lọc `subject`/`status`; `ilike('title', %search%)`. Hằng `LESSONS_PAGE_SIZE = 20`.
- `getLesson(id)` → `Lesson | null` (RLS đảm bảo của chính USER).

### 3.3 Actions — `server/lessons/actions.ts` (`'use server'`)
- `requireWritable()` (copy từ students: `getSessionContext` + `isReadOnly` → chặn chế độ chỉ đọc).
- `saveLesson(prev, formData)`: validate → nếu có `id` ẩn thì `update`, không thì `insert` (**KHÔNG truyền `user_id`**, để DB default `auth.uid()`); `tags` tách từ chuỗi; `revalidatePath('/bai-hoc')` + `redirect`.
- `archiveLessonAction(formData)`: đặt `archived_at = now()` theo `id`.

---

## 4. Giao diện (tuân theo chuẩn UI mới của trang `hoc-sinh`)

**Quy ước UI dùng chung** (đồng bộ với `app/(app)/hoc-sinh/page.tsx` sau khi nâng cấp):
- Chỉ dùng **semantic token**: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`; badge trạng thái `bg-secondary text-secondary-foreground`. **Không** hardcode mã màu hex.
- CTA chính dùng `buttonVariants({ variant: 'success' })`; nút phụ `variant="outline"`.
- **Responsive:** bảng `hidden md:block` cho desktop + danh sách **card** `md:hidden` cho điện thoại.
- Ô nhập dùng `inputClass` nền `bg-card`.

**Route & file:**
- `app/(app)/bai-hoc/page.tsx` — danh sách: tìm theo tiêu đề, lọc **môn + trạng thái**, phân trang (Trước/Sau giữ query), empty-state "Thêm bài học đầu tiên", cột: Tiêu đề · Môn · Khối · Trạng thái. Tiêu đề link sang chi tiết.
- `app/(app)/bai-hoc/moi/page.tsx` — trang thêm (gọi `saveLesson`).
- `app/(app)/bai-hoc/[id]/sua/page.tsx` — trang sửa (nạp `getLesson`).
- `app/(app)/bai-hoc/[id]/page.tsx` — chi tiết: metadata bài học + **render Markdown** `content`; nút Sửa / Lưu trữ (xác nhận).
- `components/lessons/lesson-form.tsx` — form dùng lại (Client Component) shadcn `Input`/`Select`/`Textarea`; textarea lớn cho `content`; hiển thị lỗi Zod tiếng Việt.
- **Nav:** thêm mục **"Bài học"** (`/bai-hoc`, icon lucide `BookOpen`) vào mảng `NAV_ITEMS` trong `components/app-nav.tsx` — tự động hiện ở cả `DesktopNav` và `BottomNav` (điện thoại).

---

## 5. Render Markdown (điểm mới của 3A)

- Thêm dependency: **`react-markdown`**, **`remark-gfm`** (bảng, checklist, link tự động), **`rehype-sanitize`** (lọc HTML/script nguy hiểm).
- `components/lessons/markdown.tsx` — Client Component bọc `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>`; style bằng lớp `prose`-nhẹ thủ công (không thêm `@tailwindcss/typography` ở 3A — YAGNI).
- Nội dung do chính USER viết & chỉ mình họ xem → rủi ro XSS chỉ tự-gây, nhưng vẫn **sanitize mặc định** làm chuẩn.

---

## 6. Kiểm thử (bám DoD)

- **Unit:** `lib/validators/lesson.test.ts` (Vitest) — như §3.1.
- **Cách ly RLS:** `scripts/test-rls-lessons.mjs` — nhân bản `scripts/test-rls-students.mjs`: tạo A, B, C(admin); A tạo 1 bài học; A đọc thấy 1; B đọc thấy 0; B chèn với `user_id=A` → chặn (403); C(admin) đọc `lessons` → 0. Dọn user sau cùng.
  Chạy: `node --env-file=.env.local scripts/test-rls-lessons.mjs`.
- Trước khi coi 3A "xong": `npm test` xanh, `npm run lint` 0 error, `npm run build` OK, script RLS PASS.

---

## 7. Giả định & cắt bỏ (YAGNI)

1. **Không** làm kéo-thả sắp xếp `order_index` ở 3A (giữ cột, mặc định 0; danh sách sắp theo `updated_at` mới nhất trước).
2. Lọc danh sách **chỉ theo môn + trạng thái** (+ tìm theo tiêu đề); `tags` chỉ **hiển thị**, chưa lọc theo tag.
3. `status` draft/published chỉ là **nhãn + bộ lọc**, chưa có workflow xuất bản.
4. **Không** thêm `@tailwindcss/typography` — tự style Markdown tối giản.
5. Đính kèm tài liệu, Storage → **3B**.

---

## 8. Tiêu chí hoàn thành 3A (đối chiếu ROADMAP §GĐ3, phần bài học)

- [ ] Tạo / sửa / lưu-trữ / tìm-kiếm / lọc bài học hoạt động, **responsive**.
- [ ] Trang chi tiết render Markdown (tiêu đề, danh sách, in đậm, link, bảng) và **sanitize**.
- [ ] Danh sách **phân trang** + dùng chỉ mục `(user_id, ...)`.
- [ ] **Không** thao tác ghi nào nhận `user_id` từ client (rà soát code).
- [ ] **Test cách ly RLS `lessons` PASS** (đọc/ghi chéo, giả mạo `user_id`, admin không đọc) — tiêu chí chặn.

---

## 9. Sau 3A

- Tạo **skill dự án** codify khuôn "lát cắt dọc CRUD+RLS" (`writing-skills`) sau khi có 2 lần áp dụng (students + lessons).
- Sang **3B**: `documents` + Supabase Storage (bucket riêng tư, signed URL, đính kèm).
