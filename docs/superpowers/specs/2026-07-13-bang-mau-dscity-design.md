# Thiết kế: Áp dụng bảng màu DSCITY (ảnh 7) cho toàn web

> Ngày: 2026-07-13 · Trạng thái: chờ duyệt · Nguồn màu: `7.jpg` (Design System DSCITY)

## 1. Mục tiêu

Chuyển **toàn bộ màu** của web EduFlow sang bảng màu trong `7.jpg`, đồng thời:
- Dọn nợ kỹ thuật: bỏ màu hardcode, chuyển sang **token (biến CSS)** để sau này đổi theme ở một chỗ.
- Đổi font sang **Be Vietnam Pro** (đúng design system nguồn).
- Thêm **nút chuyển sáng/tối** hoạt động thật (light/dark), với dark mode đồng bộ tông navy.
- **Responsive/mobile thật đẹp**: vào web bằng điện thoại không "sượng" — điều hướng được, không cuộn ngang ngoài ý muốn, nút đủ lớn để chạm (xem §10).

Không nằm trong phạm vi (YAGNI): thêm trang/tính năng nghiệp vụ mới, thêm màu ngoài 5 màu nguồn, đa theme tùy chỉnh. Việc đổi bố cục chỉ ở mức **cần thiết cho responsive** (điều hướng mobile, bảng→card), không tái cấu trúc trang.

## 2. Bảng màu nguồn & vai trò

| Màu | Mã | Vai trò |
|---|---|---|
| Navy | `#0D1B3D` | **primary** — nút xác thực/điều hướng, header, tiêu đề, chữ chính, focus ring |
| Green | `#0A683E` | **success** — nút tạo/lưu dữ liệu (Thêm/Lưu), CTA chuyển đổi, số liệu tài chính, badge "đang học" |
| Yellow | `#FFC107` | **warning/accent** — chip, badge nhắc, banner "chỉ đọc", biểu tượng nhấn |
| Xám nhạt | `#F3F6FA` | **background** — nền trang |
| Trắng | `#FFFFFF` | **card/surface** — thẻ, form, header |

**Màu dẫn xuất** (để đủ hệ token, giữ đúng tông lạnh):
- Border/input: `#DCE3EC` · Muted bg: `#EEF2F7` · Secondary bg: `#E8EDF4`
- Muted text: `#5A6B82` · Destructive (đỏ lỗi): `#DC2626`

### Nguyên tắc phân vai Navy vs Green (đã chốt)
- **Navy (primary)**: Đăng nhập / Đăng ký / Đặt lại mật khẩu, nút điều hướng phụ, buổi học trên lịch.
- **Green (success)**: Thêm học sinh / Lưu thay đổi, CTA "Bắt đầu dùng thử" (landing), số tiền, trạng thái "đang học".
- **Yellow (warning)**: chip nhãn, banner hết hạn/chỉ đọc, ô "thu học phí" trên lịch minh hoạ.

## 3. Kiến trúc token (nguồn chân lý: `app/globals.css`)

Toàn bộ màu định nghĩa bằng biến CSS theo chuẩn shadcn. Đổi biến ⇒ cả web đổi theo. Dùng **giá trị HEX** để khớp chính xác ảnh 7 (thay cho oklch xám hiện tại).

### 3.1 `:root` (light)
```
--background:#F3F6FA  --foreground:#0D1B3D
--card:#FFFFFF        --card-foreground:#0D1B3D
--popover:#FFFFFF     --popover-foreground:#0D1B3D
--primary:#0D1B3D     --primary-foreground:#FFFFFF
--secondary:#E8EDF4   --secondary-foreground:#0D1B3D
--muted:#EEF2F7       --muted-foreground:#5A6B82
--accent:#E8EDF4      --accent-foreground:#0D1B3D
--success:#0A683E     --success-foreground:#FFFFFF   (token mới)
--warning:#FFC107     --warning-foreground:#0D1B3D   (token mới)
--destructive:#DC2626 --destructive-foreground:#FFFFFF
--border:#DCE3EC      --input:#DCE3EC   --ring:#0D1B3D
--chart-1:#0D1B3D --chart-2:#0A683E --chart-3:#FFC107 --chart-4:#3B5378 --chart-5:#4FA07A
--sidebar:#FFFFFF --sidebar-foreground:#0D1B3D --sidebar-primary:#0D1B3D
--sidebar-primary-foreground:#FFFFFF --sidebar-accent:#E8EDF4
--sidebar-accent-foreground:#0D1B3D --sidebar-border:#DCE3EC --sidebar-ring:#0D1B3D
--radius:0.625rem (giữ nguyên)
```

### 3.2 `.dark` (đồng bộ tông navy)
```
--background:#0B142B  --foreground:#E7ECF3
--card:#111C38        --card-foreground:#E7ECF3
--popover:#111C38     --popover-foreground:#E7ECF3
--primary:#7DA0DC     --primary-foreground:#0B142B   (navy sáng để nổi trên nền tối)
--secondary:#1B2748   --secondary-foreground:#E7ECF3
--muted:#1B2748       --muted-foreground:#9FB0C8
--accent:#1B2748      --accent-foreground:#E7ECF3
--success:#37A874     --success-foreground:#04130C
--warning:#FFC94D     --warning-foreground:#0B142B
--destructive:#F26B6B --destructive-foreground:#0B142B
--border:#FFFFFF1A    --input:#FFFFFF26  --ring:#5E7FBF
--chart-1:#7DA0DC --chart-2:#37A874 --chart-3:#FFC94D --chart-4:#4F6DA8 --chart-5:#4FA07A
--sidebar:#111C38 ... (đồng bộ như trên, foreground sáng)
```

### 3.3 `@theme inline`
Thêm ánh xạ để dùng được `bg-success`, `bg-warning`, v.v.:
```
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

## 4. Bảng ánh xạ màu hardcode cũ → token mới

Áp dụng cho **mọi** file còn dùng hex "kem/nâu/xanh rêu":

| Hex cũ (ý nghĩa) | Thay bằng |
|---|---|
| `#f7f3ea` (nền kem) | `bg-background` |
| `#fffaf0` (trắng ngà) | `bg-card` |
| `#315c48` nút submit auth / link | nút → `<Button>` mặc định (navy); link → `text-primary` |
| `#315c48` nút Thêm/Lưu học sinh | `<Button variant="success">` (green) |
| `#244637` (hover) | bỏ — dùng hover mặc định của Button |
| `#18211d` / `#1f2933` (heading) | `text-foreground` |
| `#3a4a41` (label) | `text-foreground` |
| `#526057` `#6b746d` `#7a6d58` `#6f4f1f` (text phụ) | `text-muted-foreground` |
| `#d8cbb4` `#eadfc8` `#f0e7d7` `#c4b89f` (viền/nền nâu) | `border-border`; nền phụ → `bg-muted` |
| `#315c48` block buổi học (lịch) | `bg-primary text-primary-foreground` |
| `#d88b34` block thu học phí (lịch) | `bg-warning text-warning-foreground` |
| `#eadfc8` chip nhãn | `bg-secondary text-secondary-foreground` |
| `bg-amber-100 text-amber-900` (banner chỉ đọc) | `bg-warning/15 text-foreground` (viền `border-warning/40`) |
| `bg-red-50 text-red-700` (lỗi) | `bg-destructive/10 text-destructive` |

## 5. Font: Be Vietnam Pro

- `app/layout.tsx`: thay `Geist`/`Geist_Mono` bằng `Be_Vietnam_Pro` (next/font/google, subsets `["latin","vietnamese"]`, weights cần dùng), gán vào `--font-sans`. Giữ `--font-geist-mono` cho mono hoặc thay bằng một mono có sẵn — mono chỉ dùng ở nhãn "EDUFLOW"/nhãn lịch nên có thể giữ Geist Mono.
- `globals.css` đã map `--font-sans` → `--font-heading` nên heading tự theo.

## 6. Nút chuyển sáng/tối (theme toggle)

Yêu cầu người dùng: "bật sáng tối được là được". Triển khai **tối giản, không thêm thư viện**:

- **Chống nhấp nháy (FOUC)**: chèn `<script>` nội tuyến trong `app/layout.tsx` (trong `<head>`), chạy trước paint: đọc `localStorage.theme` (hoặc `prefers-color-scheme`), thêm/bỏ class `dark` trên `<html>`. Thêm `suppressHydrationWarning` cho `<html>`.
- **Component mới** `components/theme-toggle.tsx` (client): nút icon Mặt trời/Mặt trăng (`lucide-react` `Sun`/`Moon`), khi bấm: toggle class `dark` trên `documentElement` + ghi `localStorage.theme`.
- **Vị trí đặt**: header khu `(app)` (cạnh email/Đăng xuất), layout `(auth)`, và nav landing.

## 7. Danh sách file thay đổi

**Token/nền tảng**
1. `app/globals.css` — viết lại `:root` + `.dark`, thêm token success/warning vào `@theme inline`.
2. `app/layout.tsx` — font Be Vietnam Pro + script chống FOUC + `suppressHydrationWarning`.
3. `components/ui/button.tsx` — thêm `variant: "success"` (và `"warning"` nếu cần).
4. `components/theme-toggle.tsx` — **mới** (nút sáng/tối).
5. `components/app-nav.tsx` — **mới**: nav desktop (trong header) + **bottom nav mobile** (client, `usePathname` để tô mục đang mở).

**Trang (bỏ hex → token + responsive)**
6. `app/page.tsx` — landing: token hoá; scale chữ hero; calendar mockup gọn trên mobile.
7. `app/(auth)/layout.tsx` — token; thêm ThemeToggle.
8. `app/(app)/layout.tsx` — token; banner→warning; gắn `app-nav` (desktop + mobile), ThemeToggle; chừa `pb` cho bottom nav.
9. `app/(auth)/dang-nhap|dang-ky|quen-mat-khau/page.tsx` — token.
10. `app/(app)/tong-quan/page.tsx` — token; StatCard xếp 1 cột trên mobile (đã `sm:grid-cols-3`).
11. `app/(app)/hoc-sinh/page.tsx` — token; **bảng → card trên mobile**; ô tìm kiếm & nút "Thêm" full-width mobile.
12. `app/(app)/hoc-sinh/[id]/page.tsx` — token; `Row` cho phép `flex-col sm:flex-row` + `break-words`.
13. `app/(app)/hoc-sinh/moi/page.tsx`, `[id]/sua/page.tsx` — token.

**Component form (bỏ hex → token + touch)**
14. `components/auth/sign-in-form.tsx`, `sign-up-form.tsx`, `reset-form.tsx` — token; nút navy mặc định; error → `destructive`.
15. `components/students/student-form.tsx` — token; nút **success**; nút submit full-width mobile.
16. `components/ui/input.tsx` — (nếu cần) `text-base sm:text-sm` chống iOS auto-zoom khi focus.

## 8. Kiểm chứng (Definition of Done)

- `grep` không còn hex "kem/nâu/xanh rêu" cũ (`#f7f3ea|#fffaf0|#315c48|#244637|#18211d|#1f2933|#3a4a41|#d8cbb4|#eadfc8|#f0e7d7|#c4b89f|#d88b34|#6f4f1f|#526057|#6b746d|#7a6d58`) trong `app/` và `components/`.
- `npm run build` và `npm run lint` sạch.
- Xem thực tế: landing, đăng nhập, tổng quan, danh sách/chi tiết/form học sinh — đúng tông navy/green/yellow/nền xám nhạt.
- Nút chuyển sáng/tối hoạt động; không nhấp nháy khi tải lại; lựa chọn được nhớ.
- Tương phản đạt WCAG AA cho chữ (đã kiểm: navy/white ~15:1, green/white ~6.5:1, yellow/navy ~10:1, muted/nền ~4.6:1).
- **Responsive** (kiểm ở 360/390/768/1024/1280px): không cuộn ngang ngoài ý muốn; khu `(app)` điều hướng được trên mobile qua **bottom nav**; danh sách học sinh hiển thị **dạng card** trên mobile; nút chính & vùng chạm ≥44px; input ≥16px (không bị iOS auto-zoom); bottom nav không che nội dung.

## 9. Rủi ro & cách xử lý

- **`color-mix(in oklch, …)` với biến HEX**: hợp lệ (trình duyệt tự chuyển không gian màu). Không cần đổi oklch.
- **Bất nhất màu nút**: đã có nguyên tắc phân vai rõ (§2) để tránh dùng tùy tiện.
- **Bottom nav che nội dung / safe-area**: chừa `pb-24 md:pb-8` cho `main` và `pb-[env(safe-area-inset-bottom)]` cho thanh nav.
- **Bảng → card dễ lặp dữ liệu**: cùng nguồn `students`, chỉ khác cách render theo breakpoint (`hidden md:table` + `md:hidden`); giữ đơn giản, không tách trừu tượng sớm.

## 10. Responsive & Mobile polish

**Nguyên tắc:** mobile-first, ưu tiên điện thoại (CLAUDE.md §6). Mốc chính `sm`=640, `md`=768, `lg`=1024. Mục tiêu: ở 360–390px không cuộn ngang, chạm dễ, điều hướng rõ.

### 10.1 Điều hướng khu `(app)` — vấn đề chính
- **Hiện trạng lỗi:** `app/(app)/layout.tsx` để nav `hidden ... sm:flex`, mobile không có menu thay thế → không đi được trang khác.
- **Sửa:**
  - **≥ md:** giữ nav ngang trong header (Tổng quan, Học sinh).
  - **< md:** **bottom navigation** cố định (đúng ảnh 7): mỗi mục có icon (`lucide-react`) + nhãn — Tổng quan (`LayoutDashboard`), Học sinh (`Users`). Thanh `fixed inset-x-0 bottom-0`, nền `bg-card`, viền trên `border-border`, `pb-[env(safe-area-inset-bottom)]`; mục đang mở tô `text-primary`, còn lại `text-muted-foreground`.
  - `main` thêm `pb-24 md:pb-8` để bottom nav không che.
  - Chỉ hiển thị mục đã có (Tổng quan, Học sinh); chừa chỗ mở rộng (Lịch/Tài chính/Tài khoản) cho giai đoạn sau — không thêm bây giờ (YAGNI).

### 10.2 Danh sách học sinh — bảng → card trên mobile
- **< md:** danh sách **card** (mỗi học sinh 1 thẻ): dòng đầu = tên (đậm, link) + badge trạng thái; bên dưới = lớp · môn · học phí. Cả thẻ bấm được để mở chi tiết.
- **≥ md:** giữ `<table>` như hiện tại (đã token hoá).
- Kỹ thuật: `<table className="hidden w-full md:table">` + `<ul className="space-y-3 md:hidden">`.

### 10.3 Chạm & form
- Nút chính trên mobile ≥44px: nút submit/CTA `w-full sm:w-auto` và cỡ đủ cao (`size="lg"` hoặc `h-11 sm:h-9`).
- Input/select: `text-base sm:text-sm` (16px trên mobile để iOS **không** auto-zoom); cân nhắc `h-10 sm:h-9`.
- Filter danh sách: ô tìm kiếm `w-full sm:w-auto sm:min-w-56`, các control tự xuống hàng gọn.

### 10.4 Landing (`app/page.tsx`)
- Hero: `text-4xl sm:text-5xl lg:text-7xl` để không tràn ở màn nhỏ; nút CTA `w-full sm:w-auto` (đã `flex-col sm:flex-row`).
- Calendar mockup: giảm `min-h` và cỡ chữ trên mobile (`text-[0.6rem]`), `overflow-hidden` để 7 cột không vỡ; chấp nhận rút gọn nhãn.

### 10.5 Chi tiết học sinh (`[id]/page.tsx`)
- `Row`: `flex-col gap-0.5 sm:flex-row sm:justify-between`; value dài (địa chỉ/email) `break-words`, `sm:text-right`.
- Hàng nút Sửa/Lưu trữ: giữ `flex-wrap`.

### 10.6 Kiểm thử responsive
- Xem ở 360, 390, 768, 1024, 1280px (dùng claude-in-chrome đặt viewport + chụp để đối chiếu).
- Checklist: không scroll ngang ở 360px · bottom nav hiển thị & active đúng trang · card danh sách gọn gàng · form 1 cột trên mobile, 2 cột từ sm · nút chạm thoải mái.

### 10.7 Skill áp dụng khi thực thi
- `frontend-design:frontend-design` (chất lượng thị giác), lưu ý touch target & safe-area; kiểm tương phản (a11y) như §8.
