# Thiết kế — Giai đoạn 3B: Tài liệu (`documents`) + Supabase Storage

**Ngày:** 2026-07-14
**Trạng thái:** Đã duyệt (chờ nở implementation plan)
**Phạm vi:** Nửa sau Giai đoạn 3 (ROADMAP §GĐ3). Nửa đầu (Bài học) đã hoàn thành ở spec 3A.

---

## 1. Mục tiêu & phạm vi

Quản lý **tài liệu** của USER dưới hai dạng: **tệp** (upload lên Supabase Storage, bucket riêng tư) và **liên kết ngoài** (URL: Google Drive, YouTube…). Tài liệu **đính kèm được** vào bài học (`lessons`) và/hoặc học sinh (`students`). Tái dùng nguyên khuôn "lát cắt dọc CRUD+RLS" đã chốt ở Giai đoạn 2/3A, bổ sung một lớp Storage mỏng (upload + signed URL).

**KHÔNG thuộc 3B (YAGNI):** versioning/thùng-rác tài liệu, nén/thumbnail ảnh, xem trước (preview) nội tuyến, kéo-thả upload nhiều tệp một lần, chia sẻ tài liệu ra ngoài.

**Phụ thuộc:** Giai đoạn 2 (`students`, khuôn CRUD, `public.set_updated_at()`, helper `getSessionContext`/`isReadOnly` trong `lib/auth.ts`), Giai đoạn 3A (`lessons`).

---

## 2. Quyết định thiết kế (chốt qua brainstorming 2026-07-14)

1. **Loại tài liệu MVP:** cả **tệp upload** lẫn **liên kết ngoài** (đúng plan gốc GIAI_DOAN_3 Task 4).
2. **Giới hạn tệp:** tối đa **10MB**; whitelist MIME: `pdf`, ảnh (`png`, `jpg/jpeg`, `webp`), Office (`doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`), `txt`. Chặn phần còn lại (exe/script…).
3. **Điểm truy cập UI:** trang **`/tai-lieu` riêng** (liệt kê tất cả) **+ đính kèm/hiển thị** trong chi tiết bài học & học sinh.
4. **Xóa tài liệu:** **xóa cứng** bản ghi + gỡ object khỏi Storage. Tài liệu không phải dữ liệu tài chính nên không áp xóa mềm (CLAUDE.md §8 chỉ yêu cầu xóa mềm cho dữ liệu tài chính).

---

## 3. Data model — bảng `documents` (bám DATABASE.md §5.3)

Migration mới: **`supabase/migrations/0006_documents.sql`**
> Số thứ tự: `0004_students`, `0005_lessons` đã dùng → 3B = `0006_documents.sql` + `0007_storage_documents.sql`.

```sql
create type public.document_type as enum ('file', 'link');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  type public.document_type not null,
  storage_path text,                 -- nếu type='file': '{user_id}/{doc_id}/{filename}'
  file_name text,                    -- tên gốc
  file_size bigint,                  -- byte
  mime_type text,
  url text,                          -- nếu type='link'
  lesson_id uuid references public.lessons(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_user on public.documents (user_id);
create index idx_documents_user_lesson on public.documents (user_id, lesson_id);
create index idx_documents_user_student on public.documents (user_id, student_id);

create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- RLS: chỉ chủ sở hữu (KHÔNG nhánh admin) — copy khuôn students/lessons
alter table public.documents enable row level security;
create policy documents_select on public.documents for select using (auth.uid() = user_id);
create policy documents_insert on public.documents for insert with check (auth.uid() = user_id);
create policy documents_update on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy documents_delete on public.documents for delete using (auth.uid() = user_id);
```

**Ghi chú:** DATABASE.md khai báo `type` kiểu `document_type` (enum) → tạo enum thật (khác `lessons.status` là `text`+CHECK), để khớp nguồn chân lý. FK `lesson_id`/`student_id` dùng `ON DELETE SET NULL` → xóa bài học/học sinh **không mất** tài liệu.

---

## 4. Storage — bucket riêng tư `documents` (bám DATABASE.md §10)

Migration: **`supabase/migrations/0007_storage_documents.sql`**

- Tạo bucket **`documents`** riêng tư (`public = false`) qua `storage.buckets` (insert nếu chưa có).
- 4 policy trên `storage.objects` (select/insert/update/delete) khớp
  `bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text`.
- **Đường dẫn object:** `{user_id}/{doc_id}/{filename}` — cấp thư mục đầu là `user_id` để chính sách cách ly theo tiền tố.
- **Tải/đọc:** luôn qua **signed URL** phát ở máy chủ, TTL ngắn (~60s). Không bao giờ trả `storage_path` thô cho client dùng trực tiếp.

---

## 5. Tầng ứng dụng (tái dùng khuôn students/lessons)

### 5.1 Validator — `lib/validators/document.ts`
- Zod `documentSchema` (discriminated theo `type`):
  - `title` bắt buộc (trim, min 1, lỗi tiếng Việt).
  - `type` enum `['file','link']`.
  - `type='link'` → `url` bắt buộc, `.url()` hợp lệ.
  - `type='file'` → cần metadata tệp (kiểm tra thực tế ở action vì file nằm trong `FormData`).
  - `lessonId`/`studentId` optional (uuid hoặc rỗng).
  - `description` optional.
- Hằng export: `DOCUMENT_TYPES`, `TYPE_LABEL` (`file`→"Tệp", `link`→"Liên kết"), `MAX_FILE_SIZE = 10 * 1024 * 1024`, `ALLOWED_MIME_TYPES` (mảng whitelist §2.2).
- Unit test `lib/validators/document.test.ts`: link hợp lệ (pass); link thiếu/ sai url (fail); file hợp lệ (pass); title rỗng (fail).

### 5.2 Storage — `server/documents/storage.ts` (server-only)
- `uploadDocumentFile(file: File, userId: string, docId: string)` → upload vào `documents/{userId}/{docId}/{filename}`; trả `{ storagePath, fileName, fileSize, mimeType }`.
- `createDocumentSignedUrl(storagePath: string, expiresIn = 60)` → signed URL.
- `removeDocumentFile(storagePath: string)` → xóa object.
- Dùng server client `@supabase/ssr`; kiểm `MAX_FILE_SIZE` + `ALLOWED_MIME_TYPES` (defensive) trước khi upload.

### 5.3 Queries — `server/documents/queries.ts`
- `type DocumentRow` (cột cho list/detail).
- `listDocuments({ search?, type?, lessonId?, studentId?, page? })` → `{ rows, total, page, pageSize }`, phân trang `range` + `count: 'exact'`, `order('updated_at', desc)`; lọc `type`/`lessonId`/`studentId`; `ilike('title', %search%)`. Hằng `DOCUMENTS_PAGE_SIZE = 20`.
- `getDocument(id)` → `DocumentRow | null` (RLS đảm bảo của chính USER).
- `listDocumentsForLesson(lessonId)` / `listDocumentsForStudent(studentId)` → mảng (dùng ở trang chi tiết bài học/học sinh).

### 5.4 Actions — `server/documents/actions.ts` (`'use server'`)
- `requireWritable()` (copy từ lessons: `getSessionContext` + `isReadOnly` → chặn chế độ chỉ đọc).
- `saveDocument(prev, formData)`: validate → nếu `type='file'` và có tệp mới: upload qua storage (§5.2) trước, lấy metadata; nếu `type='link'`: lưu `url`. **KHÔNG truyền `user_id`** (DB default `auth.uid()`). Có `id` ẩn → `update`, không thì `insert`. Chuẩn hóa `lessonId`/`studentId` rỗng → `null`. `revalidatePath('/tai-lieu')` (+ path bài học/học sinh liên quan) + `redirect`.
- `deleteDocumentAction(formData)`: đọc bản ghi theo `id`; nếu có `storage_path` → `removeDocumentFile`; rồi `delete` bản ghi. (Xóa cứng, §2.4.)
- `getSignedUrlAction(id)`: lấy `storage_path` của tài liệu (RLS chặn của người khác) → trả signed URL để mở/tải.

---

## 6. Giao diện (chuẩn UI DSCITY — semantic token, responsive)

**Quy ước dùng chung** (đồng bộ `hoc-sinh`/`bai-hoc`): chỉ semantic token (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`); CTA chính `buttonVariants({ variant: 'success' })`, phụ `variant="outline"`; bảng `hidden md:block` + card `md:hidden`; input `bg-card`. Không hardcode hex.

**Route & file:**
- `app/(app)/tai-lieu/page.tsx` — danh sách: tìm theo tiêu đề, lọc **loại (Tệp/Liên kết)** + (tùy chọn) theo bài học/học sinh, phân trang giữ query, empty-state "Thêm tài liệu đầu tiên". Cột: Tiêu đề · Loại · Đính kèm (bài học/học sinh) · Cập nhật. Nút mở/tải tệp gọi `getSignedUrlAction`.
- `app/(app)/tai-lieu/moi/page.tsx` — trang thêm (gọi `saveDocument`).
- `app/(app)/tai-lieu/[id]/sua/page.tsx` — trang sửa (nạp `getDocument`).
- `components/documents/document-form.tsx` — form dùng lại (Client): chọn `type` (radio Tệp/Liên kết) → hiện input tương ứng (`<input type=file>` hoặc URL); select đính kèm bài học/học sinh (nạp danh sách tối giản); hiển thị lỗi Zod tiếng Việt.
- `components/documents/document-list.tsx` — bảng + card tái dùng (dùng ở `/tai-lieu` và nhúng).
- **Nhúng:** trong `app/(app)/bai-hoc/[id]/page.tsx` & `app/(app)/hoc-sinh/[id]/page.tsx` thêm khối "Tài liệu liên quan" (dùng `listDocumentsForLesson/ForStudent`) + nút "Đính kèm" (link sang `/tai-lieu/moi?lessonId=...` hoặc `?studentId=...`).
- **Nav:** thêm mục **"Tài liệu"** (`/tai-lieu`, icon lucide `FileText`) vào `NAV_ITEMS` trong `components/app-nav.tsx`.

---

## 7. Kiểm thử (bám DoD)

- **Unit:** `lib/validators/document.test.ts` (Vitest) — như §5.1.
- **Cách ly RLS + Storage:** `scripts/test-rls-documents.mjs` — nhân bản `scripts/test-rls-lessons.mjs`, thêm phần Storage:
  - A tạo 1 tài liệu link → A đọc thấy 1, B đọc thấy 0.
  - B chèn `documents` với `user_id = A` → chặn (403).
  - A upload tệp vào `A/…`; B tải object trong tiền tố `A/` → **bị chặn**; A tải được của mình.
  - C(admin) đọc `documents` → 0.
  - Dọn user + object sau cùng.
  - Chạy: `node --env-file=.env.local scripts/test-rls-documents.mjs`.
- Trước khi coi 3B "xong": `npm test` xanh, `npm run lint` 0 error, `npm run build` OK, script RLS PASS.

---

## 8. Giả định & cắt bỏ (YAGNI)

1. Xóa tài liệu = **xóa cứng** bản ghi + gỡ object Storage (không thùng rác/xóa mềm).
2. Không versioning, không thumbnail/nén ảnh, không preview nội tuyến (mở qua signed URL ở tab mới).
3. Upload **một tệp/lần** qua form thường (không kéo-thả, không multi-upload).
4. Đính kèm: mỗi tài liệu gắn **tối đa 1 bài học + 1 học sinh** (theo schema DATABASE.md, không bảng nối nhiều-nhiều).
5. Lọc danh sách theo loại + đính kèm + tìm tiêu đề; chưa lọc theo MIME/kích thước.

---

## 9. Tiêu chí hoàn thành 3B (đối chiếu ROADMAP §GĐ3 + DoD plan)

- [ ] Tạo/sửa/xóa tài liệu (tệp & liên kết), **responsive**.
- [ ] Upload/đọc tệp **chỉ trong tiền tố của mình**; A không đọc tệp của B (Storage policy).
- [ ] Đính kèm tài liệu vào bài học & học sinh; xóa bài học/học sinh → `documents.lesson_id/student_id = NULL` (không mất tài liệu).
- [ ] Tải tệp qua **signed URL** phát ở server (không lộ path thô).
- [ ] **Không** thao tác ghi nào nhận `user_id` từ client (rà soát code).
- [ ] **Test cách ly RLS `documents` + Storage PASS** — tiêu chí chặn.

---

## 10. Sau 3B

- Cập nhật `docs/IMPLEMENTATION_STATUS.md` (đóng GĐ3), commit.
- Sang **Giai đoạn 4** — Lịch & Buổi học (`sessions`, `attendance`) theo `docs/plans/GIAI_DOAN_4.md`.
