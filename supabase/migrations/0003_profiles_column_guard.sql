-- ============================================================
-- 0003 — Vá lỗ hổng: chặn USER tự sửa cột nhạy cảm của profiles
-- Vấn đề: policy profiles_update cho sửa hàng của mình → user đổi được
--         role/is_locked (leo thang / tự mở khóa).
-- Giải pháp: thu hồi UPDATE mức bảng, chỉ cấp UPDATE các cột an toàn.
--           role/is_locked/email/id chỉ service_role/ADMIN đổi được.
-- ============================================================

revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
