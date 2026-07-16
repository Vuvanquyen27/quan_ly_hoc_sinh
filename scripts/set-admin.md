# Cấp quyền ADMIN đầu tiên

Khu vực `/admin` chỉ mở cho tài khoản có `app_metadata.role = 'admin'` trong JWT.
Vai trò này **chỉ `service_role` sửa được** (không có UI công khai, USER không tự đặt được) —
đây là ràng buộc bảo mật ở `docs/PERMISSIONS.md §1` và `CLAUDE.md §5.7`.

## Cách 1 — Dùng script (khuyến nghị)

1. Đảm bảo tài khoản đã **đăng ký** trong ứng dụng (để có bản ghi `auth.users` + `profiles`).
2. Điền `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` thật trong `.env.local`.
3. Chạy:

   ```bash
   node --env-file=.env.local scripts/set-admin.mjs teacher@example.com
   ```

4. **Đăng xuất và đăng nhập lại** bằng tài khoản đó để JWT mới chứa `role=admin`.
5. Truy cập `/admin` — nếu không phải admin sẽ bị chuyển hướng về `/`.

Thu hồi quyền (đưa về `user`):

```bash
node --env-file=.env.local scripts/set-admin.mjs teacher@example.com --revoke
```

## Cách 2 — Supabase Dashboard (thủ công)

Authentication → Users → chọn user → **User Metadata** → mục **App Metadata** (KHÔNG phải
User Metadata thường) → thêm:

```json
{ "role": "admin" }
```

Lưu lại, rồi cho user đăng nhập lại.

## Vì sao dùng `app_metadata` chứ không phải bảng?

- `app_metadata` được Supabase Auth ký vào **JWT** → RLS (`is_admin()`) và middleware đọc trực
  tiếp từ token, **không cần truy vấn bảng** (tránh đệ quy RLS).
- USER **không** sửa được `app_metadata` (khác `user_metadata`). Đặt vai trò ở đây là an toàn.
- `profiles.role` chỉ là **bản sao đọc-thôi** để hiển thị; nguồn chân lý là `app_metadata.role`.

## Kiểm tra nhanh JWT sau khi đăng nhập lại

Trong DevTools → Application → Cookies, hoặc decode `access_token` tại jwt.io, phần payload phải có:

```json
"app_metadata": { "role": "admin", ... }
```
