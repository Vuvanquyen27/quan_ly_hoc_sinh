// Cấp (hoặc thu hồi) quyền ADMIN cho một tài khoản bằng service_role.
// Đặt app_metadata.role='admin' (nguồn chân lý cho JWT/RLS) VÀ đồng bộ profiles.role.
// KHÔNG bao giờ làm việc này qua UI công khai — chỉ chạy ở máy chủ/máy dev tin cậy.
//
// Chạy:
//   node --env-file=.env.local scripts/set-admin.mjs <email>            # cấp quyền admin
//   node --env-file=.env.local scripts/set-admin.mjs <email> --revoke   # thu hồi (về 'user')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2]
const revoke = process.argv.includes('--revoke')
const role = revoke ? 'user' : 'admin'

if (!url || url.includes('REPLACE-ME') || !service || service.includes('REPLACE-ME')) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  process.exit(1)
}
if (!email) {
  console.error('❌ Cần email. Ví dụ: node --env-file=.env.local scripts/set-admin.mjs teacher@example.com')
  process.exit(1)
}

const svc = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }

// Tìm user id qua bảng profiles (email đã đồng bộ từ auth bằng trigger handle_new_user).
const profRes = await fetch(
  `${url}/rest/v1/profiles?select=id,email&email=eq.${encodeURIComponent(email)}`,
  { headers: svc },
)
const profs = await profRes.json()
if (!Array.isArray(profs) || profs.length === 0) {
  console.error(`❌ Không tìm thấy tài khoản với email ${email}. (Người dùng đã đăng ký chưa?)`)
  process.exit(1)
}
const userId = profs[0].id

// Đặt app_metadata.role — đây là nơi RLS/middleware đọc vai trò (không sửa được từ client).
const authRes = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
  method: 'PUT',
  headers: svc,
  body: JSON.stringify({ app_metadata: { role } }),
})
if (!authRes.ok) {
  console.error(`❌ Đặt app_metadata.role lỗi HTTP ${authRes.status}:`, await authRes.text())
  process.exit(1)
}

// Đồng bộ bản sao đọc-thôi profiles.role (chỉ để hiển thị).
await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
  method: 'PATCH',
  headers: { ...svc, Prefer: 'return=minimal' },
  body: JSON.stringify({ role }),
})

console.log(`✅ Đã đặt role='${role}' cho ${email} (${userId}).`)
console.log('ℹ️  Người dùng cần ĐĂNG XUẤT & ĐĂNG NHẬP LẠI để JWT mới chứa vai trò.')
