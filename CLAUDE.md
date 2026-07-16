# CLAUDE.md — Ngữ cảnh dự án cho AI (đọc đầu tiên mỗi phiên)

> **Mục đích của tệp này:** Mỗi khi Claude (hoặc bất kỳ AI trợ lý nào) bắt đầu một phiên làm việc trên dự án này, hãy đọc tệp này TRƯỚC để hiểu ngay: dự án là gì, đang ở đâu, quy ước ra sao, và những ràng buộc **bắt buộc không được vi phạm**. Cập nhật tệp này khi có thay đổi lớn về phạm vi, kiến trúc hoặc quy ước.

---

## 1. Dự án là gì?

**EduFlow** _(tên tạm)_ — một sản phẩm **SaaS đa người thuê (multi-tenant)** giúp **giáo viên cá nhân** (gia sư, giáo viên luyện thi, giáo viên tự do) quản lý toàn bộ công việc: hồ sơ học sinh, bài học & tài liệu, lịch dạy & buổi học, và **tài chính** (công nợ phải thu/phải trả, thu/chi, dòng tiền, báo cáo).

- **Khách hàng = USER** (giáo viên). Mỗi USER có **không gian làm việc riêng, dữ liệu cách ly tuyệt đối**.
- **ADMIN** = chủ hệ thống, quản lý vòng đời tài khoản khách (khóa/mở/kích hoạt, trạng thái gói) qua khu vực `/admin` riêng biệt.
- **Học sinh KHÔNG đăng nhập** ở phiên bản đầu tiên (chỉ là đối tượng dữ liệu).

Bối cảnh: **Việt Nam**. Giao diện **tiếng Việt**, tiền tệ **VND**, múi giờ **Asia/Ho_Chi_Minh**.

---

## 2. Trạng thái hiện tại

| Mục | Trạng thái |
|---|---|
| Giai đoạn | **Giai đoạn 9 đã code xong** (Khu vực ADMIN — DB+server+UI+test); **migration `0016` + test RLS admin CHƯA áp/chạy trên Supabase thật**; kế tiếp **Giai đoạn 10 — Kiểm thử bảo mật & Phát hành** |
| Đã có | GĐ0–8 (đã áp DB): Next.js App Router + TS + Tailwind + shadcn/ui; Supabase (3 client + RLS + Storage); Auth/hồ sơ; CRUD học sinh/bài học/tài liệu/lịch buổi/điểm danh; Tài chính (phải thu + phải trả + sổ thu/chi + hạn thanh toán); Báo cáo + Dashboard; Cài đặt + Thông báo; migrations `0001`→`0015` đã áp. **GĐ9 (code, build+lint+test PASS):** khu `app/admin` riêng, `assertAdmin`/`writeAudit`, quản lý tài khoản/thuê bao/gói + audit + thống kê; migration `0016` |
| Chưa có | Áp `0016` + chạy `test-rls-admin.mjs` trên Supabase; GĐ10 hoàn thiện & phát hành |
| Việc kế tiếp | Đóng GĐ9: áp `0016`, `set-admin.mjs`, chạy `test-rls-admin.mjs` (xem `docs/IMPLEMENTATION_STATUS.md §9`) |

---

## 3. Tài liệu nguồn (đọc khi cần chi tiết)

| Tệp | Nội dung |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | Yêu cầu sản phẩm: người dùng, chức năng, luồng nghiệp vụ, phạm vi MVP, giả định |
| [`docs/PERMISSIONS.md`](./docs/PERMISSIONS.md) | Bảng phân quyền ADMIN vs USER + cơ chế kỹ thuật (RLS, JWT, máy chủ) |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Schema CSDL, quan hệ, khóa ngoại, RLS policy, Storage |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Kiến trúc kỹ thuật: thư mục, route, tầng, Supabase client, middleware |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Lộ trình theo giai đoạn + tiêu chí hoàn thành |
| [`docs/plans/`](./docs/plans/) | Kế hoạch triển khai chi tiết từng giai đoạn (TDD) |
| [`docs/IMPLEMENTATION_STATUS.md`](./docs/IMPLEMENTATION_STATUS.md) | Trạng thái triển khai thực tế + checklist việc còn lại |
| [`README.md`](./README.md) | Giới thiệu ngắn gọn + liên kết |

**Quy tắc:** Khi một quyết định trong tài liệu mâu thuẫn với code, ưu tiên làm rõ với người dùng — không tự ý lệch khỏi tài liệu mà không ghi nhận.

---

## 4. Công nghệ (đã chốt)

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase**: Authentication · PostgreSQL · Storage · **Row Level Security (RLS)**
- Triển khai trên **Vercel**
- i18n: giao diện **tiếng Việt**; định dạng `vi-VN`

**Lưu ý nền tảng (cập nhật 2026):**
- Vercel dùng **Fluid Compute** (Node.js đầy đủ, không khuyến khích Edge Functions cũ). Route Handlers/Server Actions chạy server-side là nơi đặt logic nhạy cảm.
- Không còn "Vercel Postgres/KV" như trước — ở đây ta dùng **Supabase** làm CSDL/Auth/Storage (không phụ thuộc storage của Vercel).
- Cấu hình dự án có thể dùng `vercel.ts` (thay `vercel.json`) nếu cần logic động.

---

## 5. RÀNG BUỘC BẢO MẬT — BẮT BUỘC (không được vi phạm)

> Đây là phần quan trọng nhất của dự án. Vi phạm = lỗi nghiêm trọng.

1. **Mọi bảng chứa dữ liệu khách hàng PHẢI có cột `user_id uuid NOT NULL`** tham chiếu `auth.users(id)`.
2. **Bật Row Level Security (RLS) trên TẤT CẢ bảng dữ liệu khách.** Policy mặc định: `auth.uid() = user_id`.
3. **USER chỉ đọc/ghi dữ liệu của chính mình.** Không bao giờ truy cập được dữ liệu USER khác (cách ly tuyệt đối).
4. **KHÔNG dựa vào việc ẩn nút/route trên giao diện để phân quyền.** Ẩn UI chỉ là trải nghiệm; kiểm soát thật nằm ở **RLS + máy chủ**.
5. **Mọi thao tác ADMIN phải được xác minh phía máy chủ** (kiểm tra vai trò `admin` trong JWT/`app_metadata` ở Route Handler/Server Action). Không tin dữ liệu từ client.
6. **KHÔNG BAO GIỜ đưa khóa bí mật Supabase (`SUPABASE_SERVICE_ROLE_KEY`) vào mã chạy trên trình duyệt.** Chỉ dùng ở máy chủ. Client chỉ được dùng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. **Vai trò (`user`/`admin`) lưu trong `app_metadata`** (chỉ `service_role` sửa được), KHÔNG lưu ở nơi USER tự sửa được. Điều này giúp RLS đọc vai trò từ JWT mà không gây đệ quy truy vấn.
8. Ưu tiên **xóa mềm/archived** cho dữ liệu tài chính; hạn chế xóa cứng.

Chi tiết & ma trận quyền: xem [`docs/PERMISSIONS.md`](./docs/PERMISSIONS.md).

---

## 6. Quy ước & phong cách

**Dữ liệu & định dạng**
- Tiền: lưu **số nguyên (đồng VND)**, không phần thập phân. Hiển thị dạng `1.500.000 ₫` (`vi-VN`).
- Thời gian: lưu `timestamptz` (UTC), hiển thị theo `Asia/Ho_Chi_Minh`. Ngày `dd/MM/yyyy`, giờ 24h.
- Khóa chính: `uuid` (mặc định `gen_random_uuid()`).
- Đặt tên bảng/cột: `snake_case`, số nhiều cho bảng (`students`, `sessions`).

**Mã nguồn (khi bắt đầu code)**
- TypeScript strict. Component UI ưu tiên **shadcn/ui**; style bằng **Tailwind**.
- Tách tầng rõ ràng: UI ⟶ hàm truy cập dữ liệu (server) ⟶ RLS. Logic nhạy cảm ở server.
- Chuỗi hiển thị tách khỏi logic để dễ đa ngôn ngữ sau (dù MVP chỉ tiếng Việt).
- **Responsive-first**, ưu tiên điện thoại.
- Migrations CSDL đặt trong repo (SQL versioned), không sửa schema thủ công trên dashboard mà không ghi lại.

**Ngôn ngữ giao tiếp:** Trả lời người dùng bằng **tiếng Việt**.

---

## 7. Lệnh thường dùng

```bash
npm run dev      # chạy Next.js local
npm run build    # build production
npm run start    # chạy bản production sau build
npm run lint     # kiểm tra ESLint
npm test         # chạy unit test bằng Vitest
npm run test:watch
```

Sẽ bổ sung lệnh Supabase migration sau khi cài Supabase CLI và tạo `supabase/migrations/`.

---

## 8. Cách AI nên làm việc trên dự án này (áp dụng skill)

Theo yêu cầu của người dùng: **áp dụng đầy đủ các skill phù hợp theo từng giai đoạn.**

| Tình huống | Skill áp dụng |
|---|---|
| Bắt đầu bất kỳ việc sáng tạo/tính năng mới | `superpowers:brainstorming` (chốt thiết kế trước) |
| Có spec, cần kế hoạch nhiều bước trước khi code | `superpowers:writing-plans` |
| Thực thi kế hoạch từng bước có checkpoint | `superpowers:executing-plans` / `subagent-driven-development` |
| Xây UI/trang/thành phần frontend | `frontend-design:frontend-design` |
| Viết/sửa/refactor code | `andrej-karpathy-skills:karpathy-guidelines` (thay đổi tối thiểu, nêu giả định) |
| Debug lỗi/hành vi lạ | `superpowers:systematic-debugging` |
| Trước khi khẳng định "đã xong/đã chạy" | `superpowers:verification-before-completion` |
| Làm việc với Next.js / shadcn / Vercel | `vercel:nextjs`, `vercel:shadcn`, `vercel:vercel-cli`, `vercel:env-vars` |
| Trước khi merge/hoàn thành nhánh | `superpowers:requesting-code-review`, `finishing-a-development-branch` |

**Nguyên tắc:** process skill (brainstorming, writing-plans) đi trước; implementation skill (frontend-design…) thực thi sau. Không bỏ qua skill trừ khi người dùng yêu cầu rõ.

**Lưu ý về Supabase:** Các skill Vercel về *storage/auth* chủ yếu cho sản phẩm Vercel/Marketplace — dự án này dùng **Supabase trực tiếp**, nên ưu tiên tài liệu/patterns Supabase (RLS, `@supabase/ssr`, Auth) hơn là mặc định theo provider của Vercel.

---

## 9. Giả định then chốt (có thể thay đổi khi người dùng phản hồi)

1. Đăng ký tự phục vụ; tài khoản mới `trialing` 14 ngày. **Thuê bao trả phí tháng/năm**, MVP **một gói** (2 chu kỳ), không gói miễn phí vĩnh viễn.
2. MVP: ADMIN **xác nhận thanh toán & kích hoạt/gia hạn thủ công**; cổng thanh toán tự động → phiên bản sau.
3. MVP tối ưu **dạy 1 kèm 1**; lớp nhóm để sau (CSDL đã chừa đường mở rộng: bảng điểm danh tách riêng).
4. Thông báo MVP là **in-app**; email/Zalo/push để sau.
5. Hết hạn (`expired`) → USER vào chế độ **chỉ đọc**, không mất dữ liệu.
6. ADMIN chỉ quản lý tài khoản & thuê bao (`subscriptions`, `subscription_payments`, `admin_audit_logs`); **không** đọc/sửa dữ liệu nghiệp vụ USER.
7. Học phí: hóa đơn **tự động tổng hợp từ buổi đã hoàn thành** trong kỳ (chỉnh tay được); vẫn cho tạo thủ công.

_Chi tiết đầy đủ: `docs/PRD.md` §4._

---

## 10. Việc KHÔNG làm (ranh giới)

- Không tự ý viết mã ứng dụng khi người dùng chưa yêu cầu chuyển sang giai đoạn code.
- Không thêm tính năng ngoài phạm vi MVP (§8.2 PRD) nếu chưa thống nhất.
- Không commit khóa bí mật, `.env`, hay dữ liệu thật của khách.
- Không tạo tính năng ADMIN xem dữ liệu nghiệp vụ của USER trong luồng thường (impersonation là tính năng riêng có kiểm soát, để sau).
