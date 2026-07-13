# IMPLEMENTATION STATUS — Trạng thái triển khai

**Ngày cập nhật:** 2026-07-13  
**Giai đoạn hiện tại:** Giai đoạn 0 — Nền móng dự án  
**Mục tiêu gần nhất:** hoàn tất khung Next.js, định dạng tiếng Việt, Supabase client, middleware khung, kiểm tra build.

---

## 1. Trạng thái hiện tại

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Git repository | ✅ Có | Đã có `.git`, nhánh hiện tại `main` |
| Next.js App Router | ✅ Có | Đã scaffold `app/`, `next.config.ts`, `package.json` |
| TypeScript | ✅ Có | Đã có `tsconfig.json`, `next-env.d.ts` |
| Tailwind CSS | ✅ Có | Đang dùng Tailwind CSS v4 qua `@import "tailwindcss"` trong `app/globals.css` |
| App đang chạy local | ✅ Có | Người dùng xác nhận đang chạy Next |
| Trang chủ tiếng Việt | ⏳ Chưa | `app/page.tsx` vẫn là trang mặc định của Next |
| `<html lang="vi">` | ⏳ Chưa | `app/layout.tsx` hiện vẫn là `lang="en"` |
| Metadata tiếng Việt | ⏳ Chưa | Metadata hiện vẫn là `Create Next App` |
| shadcn/ui | ⏳ Chưa | Chưa có `components.json`, `components/ui/*` |
| Tiện ích định dạng `vi-VN` | ⏳ Chưa | Chưa có `lib/format.ts` và test |
| Vitest | ⏳ Chưa | Chưa có script `test` |
| Supabase dependencies | ⏳ Chưa | Chưa có `@supabase/supabase-js`, `@supabase/ssr` |
| Supabase clients | ⏳ Chưa | Chưa có `lib/supabase/client.ts`, `server.ts`, `admin.ts` |
| `.env.local` | ⏳ Chưa | `.env.example` đã có; `.env.local` chưa có và đang được `.gitignore` chặn |
| Middleware refresh session | ⏳ Chưa | Chưa có `middleware.ts` |
| Supabase CLI | ⚠️ Chưa | Lệnh `supabase` chưa có trong PATH |
| Vercel CLI | ✅ Có | `vercel` đã có |

---

## 2. Việc cần chuẩn bị trước khi đi tiếp

1. **Điền biến môi trường local**
   - Tạo `.env.local` từ `.env.example`.
   - Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Không commit `.env.local`.

2. **Tạo hoặc xác nhận Supabase project**
   - Lấy URL và API keys ở Supabase Project Settings.
   - Sau Giai đoạn 1 mới cần migration thật, nhưng Giai đoạn 0 cần env để kiểm tra server client.

3. **Cài Supabase CLI khi bắt đầu migration**
   - Hiện máy chưa nhận lệnh `supabase`.
   - Có thể dùng `npx supabase ...` hoặc cài CLI riêng trước Giai đoạn 1.

4. **Quyết định mức cập nhật UI nền**
   - Trước mắt chỉ cần trang chủ tiếng Việt tối giản.
   - Không thêm tính năng nghiệp vụ trước khi hoàn tất Giai đoạn 0.

---

## 3. Checklist Giai đoạn 0

Theo `docs/plans/GIAI_DOAN_0.md`, các bước còn lại nên làm theo thứ tự:

- [x] Khởi tạo Next.js App Router + TypeScript + Tailwind.
- [ ] Đổi `app/layout.tsx` sang `lang="vi"` và metadata tiếng Việt.
- [ ] Thay trang chủ mặc định bằng landing tối giản tiếng Việt.
- [ ] Cài Vitest và tạo `lib/format.ts` + `lib/format.test.ts`.
- [ ] Chạy `npm test` để xác nhận format tiền/ngày.
- [ ] Cài shadcn/ui và thêm component nền (`button`, `card`, `input`).
- [ ] Cài `@supabase/supabase-js` và `@supabase/ssr`.
- [ ] Tạo 3 Supabase client: browser, server, admin.
- [ ] Thêm `import "server-only"` trong admin client.
- [ ] Tạo `.env.local` từ `.env.example`.
- [ ] Kiểm tra kết nối Supabase từ server.
- [ ] Tạo middleware khung refresh session.
- [ ] Chạy `npm run lint`.
- [ ] Chạy `npm run build`.
- [ ] Quét `.next/static/**/*.js` bảo đảm không có `service_role`.
- [ ] Cập nhật tài liệu lệnh thường dùng.

---

## 4. Lệnh hiện có

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Sau khi cài Vitest sẽ thêm:

```bash
npm test
npm run test:watch
```

---

## 5. Nguyên tắc không được lệch

- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc biến `NEXT_PUBLIC_*`.
- Không tạo bảng dữ liệu khách nếu chưa có `user_id` + RLS.
- Không xây tính năng nghiệp vụ trước khi xong nền móng Giai đoạn 0.
- ADMIN không được có đường đọc dữ liệu nghiệp vụ USER.
- Mọi thay đổi schema về sau phải nằm trong `supabase/migrations/*.sql`.

---

## 6. Bước đề xuất ngay sau file này

1. Sửa layout/trang chủ sang tiếng Việt.
2. Thêm format util + test.
3. Cài shadcn/ui.
4. Thêm Supabase clients.
5. Chạy `npm run lint` và `npm run build`.
