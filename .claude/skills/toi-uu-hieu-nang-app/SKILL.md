---
name: toi-uu-hieu-nang-app
description: Use when page navigation feels slow or janky — especially on mobile ("chuyển trang bị khựng/lag", "vào trang chậm", "không mượt trên điện thoại", "tối ưu tốc độ trang", "app nặng"). Rà soát code đã viết và áp các fix hiệu năng App Router + Supabase theo thứ tự đòn bẩy cao nhất, đo trước/sau. KHÔNG dùng để thiết kế tính năng mới (dùng brainstorming) hay thêm bảng CRUD (dùng vertical-slice-crud-rls).
---

# Tối ưu hiệu năng & độ mượt chuyển trang (EduFlow)

## Overview

Mục tiêu: **chạm vào tab → trang phản hồi tức thì, chuyển mượt trên điện thoại.** Đây là skill *rà soát code đã có* rồi áp fix, KHÔNG phải viết tính năng mới.

Nguyên tắc "thuật toán tốt": **đo trước, không đoán.** Phần lớn cảm giác "chậm" là **thời gian phản hồi cảm nhận** (perceived latency), không phải CPU. Fix cảm-nhận-tốc-độ (skeleton, streaming) cho lời/tiền ít mà hiệu quả gấp bội tối ưu vi mô. Luôn theo vòng lặp bên dưới thay vì nhảy vào sửa lung tung.

## Vòng lặp chẩn đoán (bắt buộc — làm đúng thứ tự)

```
1. ĐO      → xác định trang chậm + bước chặn (blocking step) thực sự
2. XẾP HẠNG → chọn fix có đòn bẩy cao nhất còn thiếu (bảng dưới, từ trên xuống)
3. ÁP 1 FIX → thay đổi tối thiểu, đúng 1 loại fix mỗi lần
4. ĐO LẠI   → xác nhận cải thiện; nếu không, hoàn tác rồi sang fix khác
```

**Không bao giờ** áp nhiều fix cùng lúc rồi đoán cái nào có tác dụng. Một fix → một lần đo.

## Nguyên nhân gốc trong repo này (kiểm tra đầu tiên)

Mỗi `app/(app)/<route>/page.tsx` là Server Component `async` **`await` query Supabase trước khi render bất cứ gì**. Không có `loading.tsx` nào → App Router không có ranh giới Suspense, nên chạm tab = màn hình đứng im chờ trọn vòng **auth + query** mới hiện. Đây là thủ phạm #1 của "khựng, không mượt".

## Bảng đòn bẩy (áp từ TRÊN xuống — dừng khi đã đủ mượt)

| # | Fix | Vì sao đòn bẩy cao | Áp ở đâu |
|---|-----|--------------------|----------|
| 1 | **`loading.tsx` skeleton mỗi route** | Phản hồi tức thì khi chạm — xoá cảm giác đứng hình. Rẻ nhất, tác động lớn nhất. | Mỗi thư mục có `page.tsx` fetch dữ liệu |
| 2 | **Stream bằng `<Suspense>`** | Khung trang (tiêu đề/nav) hiện ngay; danh sách chảy vào sau thay vì chặn toàn trang | Tách phần `await` query ra component con bọc Suspense |
| 3 | **`select` đúng cột + có index** | Query nhanh hơn = bước chặn ngắn hơn. Index `(user_id, cột-lọc)` là bắt buộc | `server/<entity>/queries.ts` |
| 4 | **Giữ Server Component, `'use client'` ở lá** | Ít JS gửi xuống đt = tải & tương tác nhanh hơn | Chỉ đánh `'use client'` component thật sự tương tác |
| 5 | **Prefetch điều hướng** | `next/link` tự prefetch ở prod; đừng tắt. Nav chính nên để prefetch mặc định | `components/app-nav.tsx`, mọi `<Link>` |
| 6 | **Tránh `Date.now()`/dynamic trong render** | Ép trang thành dynamic, mất tối ưu tĩnh (đã từng dính — xem commit `df2c8e1`) | Dùng helper `lib/datetime`, tính giờ ở ranh giới |

## Khuôn code (khớp token & pattern EduFlow)

**1) `loading.tsx` cùng cấp với `page.tsx`** — chỉ semantic token, không hex:

```tsx
// app/(app)/hoc-sinh/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-card" />
        ))}
      </div>
    </div>
  )
}
```

**2) Stream: tách phần fetch ra để khung hiện ngay**

```tsx
import { Suspense } from 'react'

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Học sinh</h1>
      <Suspense fallback={<ListSkeleton />}>
        <StudentList sp={sp} /> {/* async con: await listStudents() ở đây */}
      </Suspense>
    </div>
  )
}
```

**3) Query — chỉ lấy cột cần dùng**

```ts
// Trước: .select('*', { count: 'exact' })   ← kéo dư cột
// Sau:   .select('id, ho_ten, trang_thai, hoc_phi', { count: 'exact' })
```

## Đo lường (bằng chứng, không cảm tính)

- `npm run build` → xem cột **First Load JS** mỗi route; route nào phình JS là ứng viên fix #4.
- Chrome DevTools → **Performance** (bật CPU throttle 4×, Network Fast/Slow 4G) mô phỏng điện thoại; đo thời gian từ lúc chạm tới lúc thấy nội dung.
- Lighthouse mobile: theo **LCP** (nội dung chính) và **INP** (độ nhạy chạm). Ghi số **trước → sau** mỗi fix vào mô tả PR/commit.

## Common Mistakes

| Sai | Đúng |
|-----|------|
| Nhảy vào tối ưu vi mô (memo, useMemo) khi chưa có `loading.tsx` | Áp fix #1–#2 trước — chúng giải quyết 80% cảm giác chậm |
| Biến cả trang thành `'use client'` để "nhanh hơn" | Ngược lại — gửi thêm JV xuống đt. Giữ Server Component |
| Đổi `select('*')` → cột lẻ nhưng quên cột đang render | Rà JSX xem cột nào thực dùng rồi mới cắt |
| `<Link prefetch={false}>` trên nav chính | Để mặc định (prefetch) cho điều hướng chính |
| Thêm skeleton nhưng dùng hex/màu cứng | Chỉ `bg-secondary`/`bg-card` + `animate-pulse` |
| Áp 5 fix rồi build 1 lần, khen "nhanh hơn" | 1 fix → 1 lần đo. Không đo = không biết cái nào ăn thua |

## Red Flags — DỪNG nếu bạn đang

- Sửa hiệu năng mà **chưa đo** trang nào chậm / bước nào chặn.
- Thêm phụ thuộc/cache phức tạp trước khi có `loading.tsx` cơ bản.
- Cắt cột `select` mà chưa kiểm component còn dùng cột đó.
- Đổi kiến trúc lớn (đổi data layer, thêm state manager) cho một vấn đề perceived-latency mà skeleton giải quyết được.
- Đưa `user_id` vào query hay bỏ điều kiện RLS "cho nhanh" — hiệu năng KHÔNG bao giờ đánh đổi bằng cách ly dữ liệu.
