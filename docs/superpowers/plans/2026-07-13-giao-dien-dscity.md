# Giao diện theo DSCITY (ảnh 7) — Kế hoạch thực thi

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (đã chọn thực thi inline). Các bước dùng checkbox (`- [ ]`) để theo dõi. Đây là thay đổi **UI** — "test cycle" mỗi task = `npm run build` + `npm run lint` + `grep` màu cũ + kiểm tra thị giác (claude-in-chrome), KHÔNG có unit test cho màu.

**Goal:** Đổi toàn bộ màu web sang bảng màu ảnh 7 (navy/green/yellow/xám), đổi font Be Vietnam Pro, thêm nút sáng/tối hoạt động thật, và làm responsive mobile thật đẹp (bottom nav + card list).

**Architecture:** Token-first — mọi màu quy về biến CSS trong `app/globals.css` (chuẩn shadcn). Component `ui/*` đã dùng token nên tự đổi theo. Các trang/form đang hardcode hex được refactor về class token. Thêm 2 component mới: `theme-toggle` (sáng/tối) và `app-nav` (nav desktop + bottom nav mobile).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (config trong CSS), shadcn (base-ui), lucide-react, next/font/google.

## Global Constraints

- Bảng màu nguồn (HEX, khớp ảnh 7): navy `#0D1B3D` · green `#0A683E` · yellow `#FFC107` · nền `#F3F6FA` · trắng `#FFFFFF`.
- Phân vai: **navy = primary** (xác thực/điều hướng/header/tiêu đề); **green = success** (tạo/lưu dữ liệu, CTA chuyển đổi, tiền); **yellow = warning** (chip/badge/banner nhắc).
- Tiền VND, ngày `dd/MM/yyyy`, giao diện tiếng Việt (không đổi nội dung, chỉ đổi màu/layout).
- Responsive-first, ưu tiên điện thoại: không cuộn ngang ở 360px, nút chính ≥44px, input ≥16px (chống iOS zoom), điều hướng mobile qua bottom nav.
- Không thêm thư viện mới (dùng lucide-react đã có). Không đụng logic server/RLS/validators.
- **Commit:** không tự commit; gom lại và chỉ commit khi người dùng đồng ý (đang ở branch `main`).
- Kiểm chứng "không còn hex cũ": `#f7f3ea|#fffaf0|#315c48|#244637|#18211d|#1f2933|#3a4a41|#d8cbb4|#eadfc8|#f0e7d7|#c4b89f|#d88b34|#6f4f1f|#526057|#6b746d|#7a6d58|#faf6ed` trong `app/` + `components/`.

---

## File Structure

**Mới:**
- `components/theme-toggle.tsx` — nút sáng/tối (client).
- `components/app-nav.tsx` — `DesktopNav` + `BottomNav` (client, `usePathname`).

**Sửa:** `app/globals.css`, `app/layout.tsx`, `components/ui/button.tsx`, `components/ui/input.tsx`, `app/(app)/layout.tsx`, `app/(auth)/layout.tsx`, `app/page.tsx`, 3 trang auth, `app/(app)/tong-quan/page.tsx`, 4 trang `hoc-sinh/*`, 3 form auth, `components/students/student-form.tsx`.

---

## Task 1: Token màu nền tảng (globals.css)

**Files:** Modify `app/globals.css`

**Interfaces:**
- Produces: token `--primary/--secondary/--accent/--muted/--background/--foreground/--card/--border/--input/--ring/--destructive`, và token mới `--success`, `--success-foreground`, `--warning`, `--warning-foreground` (dùng qua `bg-success`, `bg-warning`...).

- [ ] **Bước 1:** Thêm ánh xạ token mới vào `@theme inline` (sau dòng `--color-card: var(--card);`):

```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
```

- [ ] **Bước 2:** Thay toàn bộ khối `:root { … }` bằng:

```css
:root {
  --background: #F3F6FA;
  --foreground: #0D1B3D;
  --card: #FFFFFF;
  --card-foreground: #0D1B3D;
  --popover: #FFFFFF;
  --popover-foreground: #0D1B3D;
  --primary: #0D1B3D;
  --primary-foreground: #FFFFFF;
  --secondary: #E8EDF4;
  --secondary-foreground: #0D1B3D;
  --muted: #EEF2F7;
  --muted-foreground: #5A6B82;
  --accent: #E8EDF4;
  --accent-foreground: #0D1B3D;
  --success: #0A683E;
  --success-foreground: #FFFFFF;
  --warning: #FFC107;
  --warning-foreground: #0D1B3D;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --border: #DCE3EC;
  --input: #DCE3EC;
  --ring: #0D1B3D;
  --chart-1: #0D1B3D;
  --chart-2: #0A683E;
  --chart-3: #FFC107;
  --chart-4: #3B5378;
  --chart-5: #4FA07A;
  --radius: 0.625rem;
  --sidebar: #FFFFFF;
  --sidebar-foreground: #0D1B3D;
  --sidebar-primary: #0D1B3D;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #E8EDF4;
  --sidebar-accent-foreground: #0D1B3D;
  --sidebar-border: #DCE3EC;
  --sidebar-ring: #0D1B3D;
}
```

- [ ] **Bước 3:** Thay toàn bộ khối `.dark { … }` bằng:

```css
.dark {
  --background: #0B142B;
  --foreground: #E7ECF3;
  --card: #111C38;
  --card-foreground: #E7ECF3;
  --popover: #111C38;
  --popover-foreground: #E7ECF3;
  --primary: #7DA0DC;
  --primary-foreground: #0B142B;
  --secondary: #1B2748;
  --secondary-foreground: #E7ECF3;
  --muted: #1B2748;
  --muted-foreground: #9FB0C8;
  --accent: #1B2748;
  --accent-foreground: #E7ECF3;
  --success: #37A874;
  --success-foreground: #04130C;
  --warning: #FFC94D;
  --warning-foreground: #0B142B;
  --destructive: #F26B6B;
  --destructive-foreground: #0B142B;
  --border: #FFFFFF1A;
  --input: #FFFFFF26;
  --ring: #5E7FBF;
  --chart-1: #7DA0DC;
  --chart-2: #37A874;
  --chart-3: #FFC94D;
  --chart-4: #4F6DA8;
  --chart-5: #4FA07A;
  --sidebar: #111C38;
  --sidebar-foreground: #E7ECF3;
  --sidebar-primary: #7DA0DC;
  --sidebar-primary-foreground: #0B142B;
  --sidebar-accent: #1B2748;
  --sidebar-accent-foreground: #E7ECF3;
  --sidebar-border: #FFFFFF1A;
  --sidebar-ring: #5E7FBF;
}
```

- [ ] **Bước 4 (Kiểm chứng):** `npm run build` → PASS. Chạy `npm run dev`, mở `/dang-nhap`: nền xám nhạt, chữ navy, nút "Đăng nhập" navy (component Button đã dùng `--primary`).

---

## Task 2: Font Be Vietnam Pro + chống FOUC (layout.tsx)

**Files:** Modify `app/layout.tsx`

**Interfaces:**
- Produces: `--font-sans` = Be Vietnam Pro; class `dark` set trước paint theo `localStorage.theme` / `prefers-color-scheme`; `<html suppressHydrationWarning>`.

- [ ] **Bước 1:** Thay nội dung `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduFlow — Quản lý cho giáo viên cá nhân",
  description: "Quản lý học sinh, lịch dạy và tài chính cho giáo viên cá nhân",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnamPro.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Bước 2 (Kiểm chứng):** `npm run build` → PASS. Mở web: chữ hiển thị Be Vietnam Pro. Reload nhiều lần khi đã bật dark → không nhấp nháy trắng.

---

## Task 3: Button variants + Input touch (ui/button.tsx, ui/input.tsx)

**Files:** Modify `components/ui/button.tsx`, `components/ui/input.tsx`

**Interfaces:**
- Produces: `<Button variant="success">` (green), `<Button variant="warning">` (yellow). Input cỡ chữ 16px trên mobile.

- [ ] **Bước 1:** Trong `components/ui/button.tsx`, thêm vào object `variant` (sau `link`):

```tsx
        success:
          "bg-success text-success-foreground hover:bg-[color-mix(in_oklch,var(--success),black_8%)]",
        warning:
          "bg-warning text-warning-foreground hover:bg-[color-mix(in_oklch,var(--warning),black_8%)]",
```

- [ ] **Bước 2:** Đọc `components/ui/input.tsx`, tìm chuỗi cỡ chữ `text-sm` (hoặc `md:text-sm`) trong className mặc định và đảm bảo mobile là 16px: đặt `text-base md:text-sm`. (Nếu đã có `text-base md:text-sm` thì giữ nguyên.)

- [ ] **Bước 3 (Kiểm chứng):** `npm run build` + `npm run lint` → PASS.

---

## Task 4: ThemeToggle (components/theme-toggle.tsx)

**Files:** Create `components/theme-toggle.tsx`

**Interfaces:**
- Produces: `export function ThemeToggle()` — nút icon Mặt trời/Mặt trăng, toggle class `dark` + ghi `localStorage.theme`.

- [ ] **Bước 1:** Tạo file:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Chuyển chế độ sáng/tối"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
    >
      {mounted ? (
        dark ? <Sun className="size-4" /> : <Moon className="size-4" />
      ) : (
        <span className="size-4" />
      )}
    </button>
  )
}
```

- [ ] **Bước 2 (Kiểm chứng):** `npm run build` → PASS (chưa gắn ở đâu, chỉ đảm bảo biên dịch).

---

## Task 5: App nav — desktop + bottom nav mobile (components/app-nav.tsx)

**Files:** Create `components/app-nav.tsx`

**Interfaces:**
- Produces: `export function DesktopNav()` (ẩn <md), `export function BottomNav()` (ẩn ≥md, cố định đáy).

- [ ] **Bước 1:** Tạo file:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/tong-quan', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/hoc-sinh', label: 'Học sinh', icon: Users },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(href + '/')
}

export function DesktopNav() {
  const isActive = useIsActive()
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            isActive(href)
              ? 'bg-secondary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function BottomNav() {
  const isActive = useIsActive()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Bước 2 (Kiểm chứng):** `npm run build` → PASS.

---

## Task 6: App layout — token + gắn nav/toggle (app/(app)/layout.tsx)

**Files:** Modify `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `DesktopNav`, `BottomNav` (Task 5), `ThemeToggle` (Task 4).

- [ ] **Bước 1:** Thêm import đầu file:

```tsx
import { DesktopNav, BottomNav } from '@/components/app-nav'
import { ThemeToggle } from '@/components/theme-toggle'
```

- [ ] **Bước 2:** Khối "Tài khoản đã bị khóa": đổi `bg-[#f7f3ea] text-[#1f2933]` → bỏ (nền/chữ đã theo body); giữ layout, sửa `className="flex min-h-screen items-center justify-center px-4 text-center"`.

- [ ] **Bước 3:** Khối chính — thay wrapper + header:
  - `<div className="min-h-screen bg-[#f7f3ea] text-[#1f2933]">` → `<div className="min-h-screen">`
  - `<header className="border-b border-[#d8cbb4] bg-[#fffaf0]">` → `<header className="border-b border-border bg-card">`
  - logo `text-[#315c48]` → `text-primary`
  - Thay cụm `<nav className="hidden … sm:flex"> … </nav>` (2 Link Tổng quan/Học sinh) bằng `<DesktopNav />`
  - Trong cụm phải (email + form đăng xuất), thêm `<ThemeToggle />` trước `<form action={signOutAction}>`.

- [ ] **Bước 4:** Banner chỉ đọc: `className="bg-amber-100 px-6 py-2 text-center text-sm text-amber-900"` → `className="border-b border-warning/40 bg-warning/15 px-6 py-2 text-center text-sm text-foreground"`.

- [ ] **Bước 5:** `<main className="mx-auto max-w-6xl px-6 py-8">` → `<main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-8">`. Ngay sau `</main>`, trước `</div>` đóng wrapper, thêm `<BottomNav />`.

- [ ] **Bước 6 (Kiểm chứng):** `npm run build` → PASS. Ở viewport 390px (dev tools): header không còn menu ngang, có **bottom nav** 2 mục; bấm chuyển được Tổng quan ↔ Học sinh; mục đang mở tô navy; nội dung không bị thanh dưới che. Nút sáng/tối đổi được theme.

---

## Task 7: Auth — layout + 3 trang + 3 form (token, nút navy, error destructive)

**Files:** Modify `app/(auth)/layout.tsx`, `app/(auth)/dang-nhap/page.tsx`, `app/(auth)/dang-ky/page.tsx`, `app/(auth)/quen-mat-khau/page.tsx`, `components/auth/sign-in-form.tsx`, `components/auth/sign-up-form.tsx`, `components/auth/reset-form.tsx`

- [ ] **Bước 1:** `app/(auth)/layout.tsx`:
  - `<main className="… bg-[#f7f3ea] … text-[#1f2933]">` → bỏ 2 class màu: `<main className="flex min-h-screen items-center justify-center px-4 py-10">`
  - logo `text-[#315c48]` → `text-primary`
  - card `border-[#d8cbb4] bg-white` → `border-border bg-card`
  - Thêm `import { ThemeToggle } from '@/components/theme-toggle'` và đặt `<div className="mt-6 flex justify-center"><ThemeToggle /></div>` sau card (trong `<div className="w-full max-w-md">`).

- [ ] **Bước 2:** 3 trang auth (`dang-nhap`, `dang-ky`, `quen-mat-khau`): đổi `text-[#18211d]` → `text-foreground` (mỗi file 1 chỗ ở `<h1>`).

- [ ] **Bước 3:** 3 form auth — mỗi file:
  - error: `className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"` → `className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"`
  - link `text-[#315c48] hover:underline` → `text-primary hover:underline`
  - nút submit: bỏ className hex, để mặc định navy. Cụ thể `<Button type="submit" disabled={pending} className="w-full bg-[#315c48] hover:bg-[#244637]">` → `<Button type="submit" disabled={pending} className="w-full">`. (sign-in giữ `w-full`; các nút khác tương tự, chỉ bỏ 2 class màu.)

- [ ] **Bước 4 (Kiểm chứng):** `npm run build` → PASS. Mở `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`: card trắng nền xám, nút navy, link navy, có nút sáng/tối. Ở 390px form không tràn.

---

## Task 8: Landing (app/page.tsx) — token + responsive + CTA green

**Files:** Modify `app/page.tsx`

- [ ] **Bước 1:** Token hoá theo ánh xạ (áp cho toàn file):
  - `bg-[#f7f3ea]`→`bg-background`; `text-[#1f2933]`/`text-[#18211d]`→`text-foreground`
  - viền `border-[#d8cbb4]`,`border-[#eadfc8]`,`border-[#f0e7d7]`→`border-border`
  - nền `bg-[#fffaf0]`→`bg-card`; `bg-[#f7f3ea]` (stat card)→`bg-muted`; `bg-[#eadfc8]` (chip)→`bg-secondary`
  - chữ phụ `text-[#526057]`,`text-[#6b746d]`,`text-[#7a6d58]`,`text-[#6f4f1f]`→`text-muted-foreground`
  - `text-[#315c48]` (logo/nav)→`text-primary`; nút "Đăng nhập" viền: `border-[#315c48] text-[#315c48] hover:bg-[#315c48]`→`border-primary text-primary hover:bg-primary hover:text-primary-foreground`; bỏ `focus:ring-*` hex → `focus-visible:ring-2 focus-visible:ring-ring`
  - block lịch buổi học `bg-[#315c48]`→`bg-primary`; block thu học phí `bg-[#d88b34]`→`bg-warning text-warning-foreground`
  - CTA "Bắt đầu dùng thử" `bg-[#315c48] … hover:bg-[#244637] shadow-[…]`→`bg-success text-success-foreground hover:bg-[color-mix(in_oklch,var(--success),black_8%)]` (bỏ shadow hex hoặc đổi `shadow-lg`)
  - CTA phụ "Xem không gian làm việc" viền `border-[#c4b89f] text-[#315c48] hover:border-[#315c48]`→`border-border text-primary hover:border-primary`

- [ ] **Bước 2:** Responsive:
  - hero `<h1 className="… text-5xl … sm:text-6xl lg:text-7xl">` → thêm cấp nhỏ: `text-4xl sm:text-5xl lg:text-7xl`
  - 2 nút CTA: thêm `w-full sm:w-auto` (khối `flex flex-col gap-3 sm:flex-row` đã có → chỉ thêm width cho mỗi Link)
  - calendar mockup: ô ngày `min-h-20` → `min-h-14 sm:min-h-20`; block trong ô `text-xs` → `text-[0.6rem] sm:text-xs`; wrapper lịch thêm `overflow-hidden`

- [ ] **Bước 3 (Kiểm chứng):** `npm run build` → PASS. Ở 390px: hero không tràn, 2 nút CTA full-width xếp dọc, lịch 7 cột không vỡ; CTA chính màu green, buổi học navy, ô học phí vàng.

---

## Task 9: Tổng quan + Học sinh (list→card, detail responsive) — token

**Files:** Modify `app/(app)/tong-quan/page.tsx`, `app/(app)/hoc-sinh/page.tsx`, `app/(app)/hoc-sinh/[id]/page.tsx`, `app/(app)/hoc-sinh/moi/page.tsx`, `app/(app)/hoc-sinh/[id]/sua/page.tsx`

- [ ] **Bước 1:** `tong-quan/page.tsx`: StatCard `border-[#d8cbb4]`→`border-border`, `bg-white`→`bg-card`; `text-[#18211d]`→`text-foreground` (2 chỗ).

- [ ] **Bước 2:** `hoc-sinh/[id]/page.tsx`: `border-[#f0e7d7]`→`border-border`, `text-[#18211d]`→`text-foreground`, `text-[#315c48]`→`text-primary`, `border-[#d8cbb4]`→`border-border`, `bg-white`→`bg-card`. `Row` responsive:

```tsx
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words text-foreground sm:text-right">{value}</span>
    </div>
  )
}
```

- [ ] **Bước 3:** `hoc-sinh/moi/page.tsx` + `[id]/sua/page.tsx`: `text-[#315c48]`→`text-primary`, `text-[#18211d]`→`text-foreground`, `border-[#d8cbb4]`→`border-border`.

- [ ] **Bước 4:** `hoc-sinh/page.tsx` — token + bảng→card. Đổi:
  - `text-[#18211d]`→`text-foreground`
  - nút "Thêm học sinh" (2 chỗ) `buttonVariants({ className: 'bg-[#315c48] text-white hover:bg-[#244637]' })` → `buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })`
  - `inputClass`: `bg-white`→`bg-card`; thêm width mobile khi dùng ô tìm (bước dưới)
  - empty state: `border-[#d8cbb4]`→`border-border`
  - form filter: ô tìm `className={inputClass + ' min-w-56'}` → `className={inputClass + ' w-full sm:w-auto sm:min-w-56'}`; bọc `<form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">`
  - Bảng (bọc `overflow-x-auto`): đổi `<table className="w-full …">` → thêm `hidden md:table`; wrapper đổi `border-[#d8cbb4] bg-white`→`border-border bg-card`; header `border-[#eadfc8]`→`border-border`; hàng `border-[#f0e7d7] hover:bg-[#faf6ed]`→`border-border hover:bg-muted`; tên `text-[#18211d]`→`text-foreground`; badge `bg-[#eadfc8] … text-[#6f4f1f]`→`bg-secondary text-secondary-foreground`
  - Thêm **card list mobile** ngay trước hoặc sau bảng (trong nhánh `students.length > 0`):

```tsx
<ul className="space-y-3 md:hidden">
  {students.map((s) => (
    <li key={s.id}>
      <Link
        href={`/hoc-sinh/${s.id}`}
        className="block rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-medium text-foreground">{s.full_name}</span>
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
            {STATUS_LABEL[s.status] ?? s.status}
          </span>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div><dt className="inline">Lớp: </dt><dd className="inline">{s.grade_level ?? '—'}</dd></div>
          <div><dt className="inline">Môn: </dt><dd className="inline">{s.subjects?.join(', ') || '—'}</dd></div>
          <div className="col-span-2"><dt className="inline">Học phí: </dt><dd className="inline text-foreground">{formatVND(s.default_fee)}</dd></div>
        </dl>
      </Link>
    </li>
  ))}
</ul>
```
  Đảm bảo `<div className="overflow-x-auto …">` bảng chỉ hiện ≥md (thêm `hidden md:block` cho wrapper bảng thay vì để table hidden — chọn 1 cách; ở đây đặt `hidden md:block` trên wrapper `overflow-x-auto`).

- [ ] **Bước 5 (Kiểm chứng):** `npm run build` → PASS. `/hoc-sinh` ở 390px: hiển thị **card** mỗi học sinh (không cuộn ngang), nút "Thêm học sinh" full-width; ở 1280px: hiển thị **bảng**. Badge trạng thái xám-xanh, tên navy.

---

## Task 10: Student form (student-form.tsx) — token + nút success

**Files:** Modify `components/students/student-form.tsx`

- [ ] **Bước 1:** Đổi:
  - label `text-[#3a4a41]`→`text-foreground`
  - error `bg-red-50 … text-red-700`→`bg-destructive/10 … text-destructive`
  - nút submit `<Button type="submit" disabled={pending} className="bg-[#315c48] hover:bg-[#244637]">` → `<Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">`

- [ ] **Bước 2 (Kiểm chứng):** `npm run build` → PASS. `/hoc-sinh/moi` ở 390px: nút "Thêm học sinh" green full-width; form 1 cột; nhập ô không bị iOS zoom (cỡ ≥16px).

---

## Task 11: Kiểm chứng tổng thể + dọn dẹp

**Files:** không sửa mới (chỉ kiểm tra).

- [ ] **Bước 1:** Grep chắc chắn hết hex cũ (phải ra 0):
```
rg -n "#f7f3ea|#fffaf0|#315c48|#244637|#18211d|#1f2933|#3a4a41|#d8cbb4|#eadfc8|#f0e7d7|#c4b89f|#d88b34|#6f4f1f|#526057|#6b746d|#7a6d58|#faf6ed|bg-red-50|text-red-700|bg-amber-100|text-amber-900" app components
```
- [ ] **Bước 2:** `npm run build` → PASS; `npm run lint` → sạch.
- [ ] **Bước 3 (Thị giác qua claude-in-chrome):** chụp ở 390px và 1280px các trang: `/`, `/dang-nhap`, `/tong-quan`, `/hoc-sinh`, `/hoc-sinh/moi`. Đối chiếu tông màu ảnh 7; kiểm bottom nav mobile; thử nút sáng/tối trên 1 trang.
- [ ] **Bước 4:** Báo cáo kết quả + hỏi người dùng có commit không (đề xuất tách nhánh `feat/giao-dien-dscity` nếu commit).

---

## Self-Review (đã chạy)

- **Spec coverage:** màu→T1,T7-T10; @theme success/warning→T1; font→T2; dark toggle→T2+T4; button variants→T3; input touch→T3+T10; bottom nav→T5+T6; bảng→card→T9; landing responsive→T8; detail Row→T9; DoD grep/build/visual→T11. Đủ.
- **Placeholder:** không có TODO/TBD; mọi bước có class/code cụ thể.
- **Type consistency:** `DesktopNav`/`BottomNav` (T5) khớp import T6; `ThemeToggle` (T4) khớp T6/T7; `variant="success"` (T3) khớp T9/T10.
