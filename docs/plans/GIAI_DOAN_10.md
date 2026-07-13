# Giai đoạn 10 — Hoàn thiện & Phát hành · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.

**Goal:** Đạt chuẩn chất lượng/bảo mật để phát hành MVP: kiểm thử phân quyền toàn diện, responsive, hiệu năng, rà bảo mật, landing, deploy production.

**Architecture:** Không thêm bảng mới; củng cố & kiểm thử toàn hệ thống; đưa bộ kiểm thử phân quyền vào CI.

## Global Constraints
- **0 rò rỉ dữ liệu chéo** là tiêu chí chặn phát hành. Không khóa bí mật trong bundle client. Tiếng Việt, responsive. Commit thường xuyên.

**Phụ thuộc:** Giai đoạn 0–9.

---

### Task 1: Bộ kiểm thử phân quyền toàn diện (CI)
**Files:** `supabase/tests/**`, cấu hình CI (`.github/workflows/*` hoặc tương đương)
- [ ] **Step 1:** Gom mọi test RLS các giai đoạn + bổ sung đủ **8 ca** theo `PERMISSIONS.md §8` (đọc/ghi chéo, giả mạo `user_id`, chặn `/admin`, chống leo thang vai trò, rò rỉ `service_role`, gating gói, cách ly Storage, ADMIN không đọc nghiệp vụ).
- [ ] **Step 2:** Đưa vào CI chạy tự động mỗi PR; fail CI nếu bất kỳ ca nào rò rỉ.
- [ ] **Step 3:** **Commit** `test(ci): bộ kiểm thử phân quyền toàn diện`.

### Task 2: Rà soát responsive & trạng thái UI
- [ ] **Step 1:** Kiểm mọi trang trên điện thoại/tablet/desktop; sửa layout vỡ.
- [ ] **Step 2:** Bảo đảm mọi danh sách có trạng thái tải/rỗng/lỗi tiếng Việt. **Commit** `fix(ui): responsive + trạng thái rỗng/lỗi`.

### Task 3: Hiệu năng
- [ ] **Step 1:** Rà truy vấn N+1; xác nhận chỉ mục `(user_id, ...)` được dùng; phân trang danh sách lớn.
- [ ] **Step 2:** Đo LCP trang chính < 2.5s (dữ liệu mẫu). **Commit** `perf: tối ưu truy vấn + tải trang`.

### Task 4: Rà soát bảo mật cuối
- [ ] **Step 1:** Quét bundle client bảo đảm **không** có `service_role`/khóa bí mật: `Select-String -Path .next\static\**\*.js -Pattern "service_role" -SimpleMatch` → rỗng.
- [ ] **Step 2:** Kiểm biến môi trường (không `NEXT_PUBLIC_` cho bí mật); thêm security headers cơ bản; xem lại toàn bộ RLS đã bật đúng.
- [ ] **Step 3:** Xác nhận checklist `CLAUDE.md §5` đạt toàn bộ. **Commit** `chore(security): rà soát bảo mật trước phát hành`.

### Task 5: Landing + tài liệu người dùng
- [ ] **Step 1:** Hoàn thiện trang landing (giới thiệu, gói tháng/năm, kêu gọi đăng ký).
- [ ] **Step 2:** Tài liệu người dùng cơ bản tiếng Việt (hướng dẫn nhanh). **Commit** `feat(marketing): landing + hướng dẫn`.

### Task 6: Deploy production
- [ ] **Step 1:** Cấu hình môi trường production trên Vercel (biến, domain).
- [ ] **Step 2:** Deploy production; kiểm thử khói (smoke test) luồng chính trên domain thật.
- [ ] **Step 3:** **Commit/tag** `release: MVP 1.0`.

## DoD (đối chiếu ROADMAP §GĐ10)
- [ ] **0** rò rỉ dữ liệu chéo trong bộ kiểm thử phân quyền (release blocker).
- [ ] Mọi tính năng MVP (`PRD.md §8.1`) hoạt động end-to-end.
- [ ] Không khóa bí mật trong bundle client.
- [ ] Build production xanh; app chạy trên domain thật.
- [ ] Checklist bảo mật `CLAUDE.md §5` xác nhận toàn bộ.

## Self-review
- Tập trung củng cố + kiểm thử, không thêm phạm vi. Bộ test phân quyền là cổng chặn phát hành. Không placeholder.
