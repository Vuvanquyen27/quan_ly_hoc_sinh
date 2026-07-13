# EduFlow — Không gian làm việc cho giáo viên cá nhân

> Sản phẩm **SaaS** giúp giáo viên cá nhân (gia sư, giáo viên luyện thi, giáo viên tự do) quản lý học sinh, bài học, lịch dạy và **tài chính** trong một nơi duy nhất — dữ liệu mỗi giáo viên được **cách ly tuyệt đối**.

**Trạng thái:** 🟡 Đang triển khai **Giai đoạn 0 — Nền móng dự án**. Đã có scaffold Next.js; đang hoàn tất cấu hình nền, Supabase client, test và checklist bảo mật.
**Tên "EduFlow" là tên tạm**, có thể thay đổi trước khi phát hành.

---

## Sản phẩm giải quyết gì?

Giáo viên cá nhân đang quản lý công việc bằng sổ tay, Excel, Zalo, lịch điện thoại — rời rạc và dễ thất thoát học phí. EduFlow gom mọi việc vào một sản phẩm tiếng Việt, tối ưu cho điện thoại:

- 👤 **Học sinh & giảng dạy** — hồ sơ học sinh, bài học/nội dung, tài liệu & liên kết.
- 📅 **Lịch & buổi học** — lịch ngày/tuần/tháng, trạng thái buổi, điểm danh, ghi chú.
- 💰 **Tài chính** — công nợ phải thu (học phí), khoản phải trả, thu/chi, hạn & lịch sử thanh toán.
- 📊 **Báo cáo & tổng quan** — doanh thu, chi phí, công nợ, dòng tiền; bảng điều khiển.

Chi tiết đầy đủ trong [`docs/PRD.md`](./docs/PRD.md).

---

## Đối tượng người dùng

| Vai trò | Mô tả |
|---|---|
| **USER** | Giáo viên — khách hàng trả tiền. Mỗi USER có không gian & dữ liệu riêng, cách ly tuyệt đối. |
| **ADMIN** | Chủ hệ thống — quản lý tài khoản khách, trạng thái/gói, thống kê. Khu vực quản trị riêng. |
| **Học sinh** | Đối tượng dữ liệu — **không đăng nhập** ở phiên bản đầu tiên. |

---

## Công nghệ

- **Next.js (App Router)** · **TypeScript**
- **Tailwind CSS** · **shadcn/ui**
- **Supabase**: Authentication · PostgreSQL · Storage · **Row Level Security**
- Triển khai trên **Vercel**
- Giao diện **tiếng Việt** · Tiền tệ **VND** · Múi giờ **Asia/Ho_Chi_Minh** · **Responsive**

---

## Bảo mật (nguyên tắc cốt lõi)

- Mọi bảng dữ liệu khách có `user_id`; **RLS bật** với policy `auth.uid() = user_id`.
- USER chỉ đọc/ghi dữ liệu **của chính mình** — không truy cập dữ liệu USER khác.
- Phân quyền ở **máy chủ + cơ sở dữ liệu**, **không** dựa vào ẩn nút giao diện.
- Thao tác ADMIN **xác minh phía máy chủ** (vai trò trong JWT `app_metadata`).
- **Không** đưa khóa bí mật Supabase (`service_role`) vào mã trình duyệt.

Chi tiết: [`docs/PERMISSIONS.md`](./docs/PERMISSIONS.md).

---

## 📚 Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | Yêu cầu sản phẩm: người dùng, chức năng, luồng nghiệp vụ, phạm vi MVP, giả định |
| [`docs/PERMISSIONS.md`](./docs/PERMISSIONS.md) | Phân quyền ADMIN vs USER + cơ chế kỹ thuật (RLS, JWT, máy chủ) |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Schema, quan hệ, khóa ngoại, RLS, Storage |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Kiến trúc kỹ thuật: cấu trúc thư mục, route, tầng, Supabase client, middleware |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Lộ trình theo giai đoạn + tiêu chí hoàn thành |
| [`docs/plans/`](./docs/plans/) | Kế hoạch triển khai chi tiết từng giai đoạn (TDD) |
| [`docs/IMPLEMENTATION_STATUS.md`](./docs/IMPLEMENTATION_STATUS.md) | Trạng thái triển khai thực tế + checklist việc còn phải chuẩn bị/xây dựng |
| [`CLAUDE.md`](./CLAUDE.md) | Ngữ cảnh cho AI trợ lý — đọc đầu mỗi phiên làm việc |

---

## Cấu trúc thư mục

```
.
├─ README.md            ← bạn đang ở đây
├─ CLAUDE.md            ← ngữ cảnh cho AI (tự nạp mỗi phiên)
├─ .env.example        ← mẫu biến môi trường
├─ package.json         ← lệnh Next.js hiện có
├─ app/                 ← scaffold Next.js App Router
├─ public/              ← asset tĩnh mặc định
└─ docs/
   ├─ PRD.md
   ├─ PERMISSIONS.md
   ├─ DATABASE.md
   ├─ ARCHITECTURE.md
   ├─ ROADMAP.md
   ├─ IMPLEMENTATION_STATUS.md
   └─ plans/            ← kế hoạch chi tiết từng giai đoạn (GIAI_DOAN_0…10)
```

_(Các thư mục `lib/`, `components/`, `server/`, `supabase/migrations/` sẽ được thêm tiếp trong Giai đoạn 0–1.)_

---

## Bắt đầu triển khai

Dự án hiện đã bắt đầu Giai đoạn 0. Khi tiếp tục triển khai:

1. Xem [`docs/IMPLEMENTATION_STATUS.md`](./docs/IMPLEMENTATION_STATUS.md) để biết việc đã xong/chưa xong trong **Giai đoạn 0 — Nền móng dự án**.
2. Làm tiếp theo [`docs/plans/GIAI_DOAN_0.md`](./docs/plans/GIAI_DOAN_0.md), sau đó mới sang Giai đoạn 1.
3. Tuân thủ tuyệt đối các ràng buộc bảo mật trong [`CLAUDE.md`](./CLAUDE.md) và [`docs/PERMISSIONS.md`](./docs/PERMISSIONS.md).

Lệnh hiện có: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm test`. Lệnh migration sẽ được bổ sung khi cài Supabase CLI.

---

## Phạm vi MVP (tóm tắt)

✅ Trong MVP: xác thực + trial · học sinh · bài học/tài liệu · lịch & buổi học + điểm danh · công nợ phải thu/phải trả · thu/chi · báo cáo cơ bản · khu vực ADMIN · bảo mật RLS.

⏭️ Phiên bản sau: thanh toán tự động, nhắc lịch/học phí qua Email/Zalo, xuất Excel, cổng phụ huynh, lớp nhóm, ứng dụng di động.

Chi tiết: [`docs/PRD.md §8`](./docs/PRD.md).
