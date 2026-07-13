# Giai đoạn 0 — Nền móng dự án · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để thực thi plan theo từng task. Các bước dùng checkbox (`- [ ]`) để theo dõi.

**Goal:** Có bộ khung Next.js chạy được cục bộ và trên Vercel, kết nối được Supabase, có tiện ích định dạng tiếng Việt — chưa có tính năng nghiệp vụ.

**Architecture:** Next.js App Router + TypeScript + Tailwind + shadcn/ui. Ba Supabase client tách biệt (browser/server/admin) theo `@supabase/ssr`. Logic nhạy cảm ở server; `service_role` chỉ ở server.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, `@supabase/ssr`, `@supabase/supabase-js`, Vitest (unit test), Vercel.

## Global Constraints (từ spec — áp dụng mọi task)
- Giao diện **tiếng Việt** (`<html lang="vi">`), định dạng `vi-VN`.
- Tiền **VND số nguyên (đồng)**; hiển thị `1.500.000 ₫`.
- Thời gian lưu `timestamptz` (UTC), hiển thị `Asia/Ho_Chi_Minh`; ngày `dd/MM/yyyy`.
- **Không** đặt `SUPABASE_SERVICE_ROLE_KEY` vào mã client; không tiền tố `NEXT_PUBLIC_`.
- TDD + commit thường xuyên.

**Môi trường:** Windows + PowerShell. Dùng `npm`.

---

### Task 1: Khởi tạo dự án Next.js

**Files:**
- Create: toàn bộ khung `create-next-app` (`package.json`, `app/`, `tsconfig.json`, `tailwind.config.ts`, ...)

**Lưu ý:** Thư mục đã có `README.md`, `docs/`, `CLAUDE.md`, `.env.example`. `create-next-app` có thể báo trùng `README.md`/`.gitignore`. Cách xử lý: chạy trong thư mục con tạm rồi chuyển ra, **hoặc** tạm đổi tên `README.md` → `README.project.md`, chạy scaffold, rồi khôi phục (giữ README của ta).

- [ ] **Step 1: Tạm bảo vệ README của dự án**

Run (PowerShell): `Rename-Item README.md README.project.md`

- [ ] **Step 2: Khởi tạo Next.js (không tương tác)**

Run:
```
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```
Expected: sinh `package.json`, `app/`, `tailwind.config.ts`, `next.config.*`. Nếu hỏi ghi đè `.gitignore` → cho phép merge.

- [ ] **Step 3: Khôi phục README dự án**

Run: `Remove-Item README.md -Force; Rename-Item README.project.md README.md`
(Giữ README.md nội dung dự án của ta, bỏ README mặc định của Next.)

- [ ] **Step 4: Chạy thử dev**

Run: `npm run dev` → mở `http://localhost:3000`.
Expected: trang mặc định Next.js hiển thị, không lỗi biên dịch. Dừng server (Ctrl+C).

- [ ] **Step 5: Commit**

```
git init
git add -A
git commit -m "chore: khởi tạo khung Next.js App Router + Tailwind"
```

---

### Task 2: Tiện ích định dạng tiếng Việt (TDD)

**Files:**
- Create: `lib/format.ts`
- Test: `lib/format.test.ts`
- Modify: `package.json` (script test), `vitest.config.ts`

**Interfaces (Produces):**
- `formatVND(amount: number): string` → "1.500.000 ₫"
- `formatDate(d: Date | string): string` → "13/07/2026"
- `formatDateTime(d: Date | string): string` → "13/07/2026 19:30"

- [ ] **Step 1: Cài Vitest**

Run: `npm i -D vitest`

- [ ] **Step 2: Cấu hình test** — Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node' } })
```
Modify `package.json` scripts: thêm `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Viết test thất bại** — Create `lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatVND, formatDate } from './format'

describe('formatVND', () => {
  it('định dạng số nguyên đồng VND', () => {
    expect(formatVND(1500000)).toBe('1.500.000 ₫')
  })
  it('0 đồng', () => {
    expect(formatVND(0)).toBe('0 ₫')
  })
})

describe('formatDate', () => {
  it('định dạng dd/MM/yyyy', () => {
    expect(formatDate('2026-07-13T12:00:00Z')).toBe('13/07/2026')
  })
})
```

- [ ] **Step 4: Chạy test — kỳ vọng FAIL**

Run: `npm test`
Expected: FAIL ("Cannot find module './format'" hoặc hàm chưa định nghĩa).

- [ ] **Step 5: Hiện thực tối thiểu** — Create `lib/format.ts`:
```ts
const TZ = 'Asia/Ho_Chi_Minh'

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ,
  }).format(date)
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  }).format(date)
}
```

- [ ] **Step 6: Chạy test — kỳ vọng PASS**

Run: `npm test`
Expected: PASS. (Nếu ký hiệu tiền/khoảng trắng khác môi trường, điều chỉnh assertion cho khớp `Intl` thực tế — ghi rõ trong commit.)

- [ ] **Step 7: Commit**
```
git add lib/format.ts lib/format.test.ts vitest.config.ts package.json
git commit -m "feat: tiện ích định dạng VND/ngày (vi-VN, Asia/Ho_Chi_Minh) + test"
```

---

### Task 3: shadcn/ui + layout gốc tiếng Việt

**Files:**
- Modify: `app/layout.tsx` (lang="vi", metadata)
- Create: cấu hình shadcn (`components.json`, `components/ui/*`)
- Modify: `app/globals.css`, `app/page.tsx` (trang chủ tối giản)

- [ ] **Step 1: Khởi tạo shadcn/ui**

Run: `npx shadcn@latest init` (chọn theme mặc định; base color tùy ý).
Expected: sinh `components.json`, cập nhật `globals.css`, alias `@/components`.

- [ ] **Step 2: Thêm vài component nền**

Run: `npx shadcn@latest add button card input`
Expected: tạo `components/ui/button.tsx`, `card.tsx`, `input.tsx`.

- [ ] **Step 3: Đặt ngôn ngữ & metadata** — Modify `app/layout.tsx`:
```tsx
export const metadata = {
  title: 'EduFlow — Quản lý cho giáo viên cá nhân',
  description: 'Quản lý học sinh, lịch dạy và tài chính cho giáo viên cá nhân',
}
// <html lang="vi"> ở phần return
```

- [ ] **Step 4: Trang chủ tối giản** — Modify `app/page.tsx`: hiển thị tên sản phẩm + nút "Đăng nhập"/"Đăng ký" (Link tạm, chưa cần route).

- [ ] **Step 5: Kiểm tra build**

Run: `npm run build`
Expected: build thành công, không lỗi type.

- [ ] **Step 6: Commit**
```
git add -A
git commit -m "feat: shadcn/ui + layout gốc tiếng Việt (lang=vi)"
```

---

### Task 4: Ba Supabase client + biến môi trường

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`
- Create: `.env.local` (từ `.env.example`, KHÔNG commit)

**Interfaces (Produces):**
- `createBrowserSupabase()` → client anon (Client Component)
- `createServerSupabase()` → client anon đọc cookie (Server Component/Action)
- `createAdminSupabase()` → client service_role (CHỈ server)

- [ ] **Step 1: Cài phụ thuộc**

Run: `npm i @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Điền `.env.local`**

Copy `.env.example` → `.env.local`, điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` từ Supabase (Project Settings → API). Xác nhận `.env.local` nằm trong `.gitignore`.

- [ ] **Step 3: Browser client** — Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 4: Server client** — Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options) } catch {}
        }),
      },
    },
  )
}
```

- [ ] **Step 5: Admin client (chỉ server)** — Create `lib/supabase/admin.ts`:
```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // BÍ MẬT — chỉ server
    { auth: { persistSession: false } },
  )
}
```
`import 'server-only'` khiến build **thất bại** nếu lỡ import ở client — hàng rào an toàn.

- [ ] **Step 6: Kiểm tra type/build**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 7: Commit**
```
git add lib/supabase .env.example
git commit -m "feat: ba Supabase client (browser/server/admin) + server-only guard"
```

---

### Task 5: Kết nối thử Supabase từ server

**Files:**
- Create (tạm): `app/health/page.tsx` (Server Component gọi Supabase)

- [ ] **Step 1: Trang health** — Create `app/health/page.tsx`:
```tsx
import { createServerSupabase } from '@/lib/supabase/server'

export default async function Health() {
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.getUser()
  return <pre>Supabase: {error ? 'LỖI: ' + error.message : 'kết nối OK'}</pre>
}
```
(Chưa đăng nhập → `getUser` trả user null nhưng **không** lỗi kết nối; mục tiêu là xác nhận reachability + cấu hình env.)

- [ ] **Step 2: Chạy & kiểm tra**

Run: `npm run dev` → mở `/health`.
Expected: hiển thị "Supabase: kết nối OK" (hoặc user null, không lỗi mạng/env).

- [ ] **Step 3: Xóa trang tạm & commit**

Xóa `app/health/` sau khi xác nhận (hoặc giữ sau login guard). 
```
git add -A
git commit -m "chore: xác minh kết nối Supabase từ server"
```

---

### Task 6: Middleware khung (refresh session)

**Files:**
- Create: `middleware.ts`
- Create: `lib/supabase/middleware.ts` (helper updateSession)

- [ ] **Step 1: Helper updateSession** — Create `lib/supabase/middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  await supabase.auth.getUser()  // làm mới phiên
  return response
}
```

- [ ] **Step 2: middleware.ts** — Create `middleware.ts`:
```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
// Ghi chú: chặn route theo vai trò (/admin) và gating sẽ thêm ở Giai đoạn 1 & 9.
```

- [ ] **Step 3: Build & chạy**

Run: `npm run build && npm run dev`
Expected: build ok; app chạy, không lỗi middleware.

- [ ] **Step 4: Commit**
```
git add middleware.ts lib/supabase/middleware.ts
git commit -m "feat: middleware khung refresh session (@supabase/ssr)"
```

---

### Task 7: Deploy Vercel preview + kiểm tra rò rỉ khóa

**Files:** — (không tạo mã; cấu hình triển khai)

- [ ] **Step 1: Đưa mã lên Git remote** (GitHub) và import vào Vercel, hoặc `vercel` CLI.

- [ ] **Step 2: Cấu hình biến môi trường trên Vercel**

Đặt `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` cho Preview/Production (`vercel env add` hoặc dashboard).

- [ ] **Step 3: Deploy preview**

Run: `vercel` (hoặc auto-deploy khi push).
Expected: có URL preview mở được, trang chủ hiển thị tiếng Việt.

- [ ] **Step 4: Kiểm tra KHÔNG rò rỉ service_role**

Sau `npm run build`, tìm trong thư mục `.next/` bảo đảm **không** có chuỗi khóa service_role trong bundle client.
Run (PowerShell): `Select-String -Path .next\static\**\*.js -Pattern "service_role" -SimpleMatch`
Expected: **không có** kết quả nào. (Nếu có → dừng, sửa ngay: không import `admin.ts` ở client.)

- [ ] **Step 5: Cập nhật CLAUDE.md §7**

Điền lệnh thực tế: `npm run dev`, `npm run build`, `npm test`, `vercel`. Commit:
```
git add CLAUDE.md
git commit -m "docs: cập nhật lệnh thường dùng sau khi khởi tạo dự án"
```

---

## Tiêu chí hoàn thành Giai đoạn 0 (đối chiếu ROADMAP §GĐ0)
- [ ] `npm run dev` chạy, trang chủ tiếng Việt.
- [ ] `npm run build` thành công; Vercel preview mở được.
- [ ] Kết nối Supabase từ server OK.
- [ ] Bundle client **không** chứa `service_role`.
- [ ] `formatVND`/`formatDate` có test pass.
- [ ] `CLAUDE.md §7` cập nhật lệnh thực tế.

## Self-review (đã kiểm)
- Không placeholder: mọi bước có lệnh/code cụ thể.
- Nhất quán tên: `createBrowserSupabase`/`createServerSupabase`/`createAdminSupabase` dùng đồng nhất.
- Bám Global Constraints: tiếng Việt, VND, Asia/Ho_Chi_Minh, không lộ service_role.
