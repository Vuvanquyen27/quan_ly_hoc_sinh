// Test tích hợp: đăng ký user thật → xác nhận trigger 0002 tạo profiles/user_settings/subscriptions,
// rồi XÓA user test (dọn sạch). Không in khóa.
// Chạy: node --env-file=.env.local scripts/test-signup.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

for (const [k, v] of [['URL', url], ['anon', anon], ['service_role', service]]) {
  if (!v || v.includes('REPLACE-ME')) {
    console.error(`❌ Thiếu ${k} trong .env.local`)
    process.exit(1)
  }
}

const svcHeaders = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
const email = `eduflow.test.${Date.now()}@gmail.com`
const password = 'MatKhauTest123!'
let userId = null
let pass = true
const fail = (m) => { pass = false; console.log('❌ ' + m) }

try {
  // 1) Tạo user qua Admin API (email_confirm=true, không gửi email) → cũng kích hoạt trigger
  const signRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: svcHeaders,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: 'Người Test' } }),
  })
  const signBody = await signRes.json()
  userId = signBody?.user?.id ?? signBody?.id ?? null
  if (!signRes.ok || !userId) {
    fail(`Tạo user thất bại (HTTP ${signRes.status}): ${JSON.stringify(signBody).slice(0, 200)}`)
    throw new Error('signup-failed')
  }
  console.log(`✅ Tạo user OK — ${userId} (${email})`)

  // 2) Kiểm tra trigger đã tạo dữ liệu (query bằng service_role, bỏ qua RLS)
  const get = async (t, q) => (await fetch(`${url}/rest/v1/${t}?${q}`, { headers: svcHeaders })).json()

  const profiles = await get('profiles', `id=eq.${userId}&select=id,email`)
  profiles.length === 1 ? console.log('✅ profiles: đã tạo') : fail(`profiles: mong đợi 1, có ${profiles.length}`)

  const settings = await get('user_settings', `user_id=eq.${userId}&select=currency,timezone,locale`)
  if (settings.length === 1 && settings[0].currency === 'VND' && settings[0].timezone === 'Asia/Ho_Chi_Minh') {
    console.log('✅ user_settings: đã tạo (VND, Asia/Ho_Chi_Minh)')
  } else fail(`user_settings sai: ${JSON.stringify(settings)}`)

  const subs = await get('subscriptions', `user_id=eq.${userId}&select=status,trial_ends_at`)
  if (subs.length === 1 && subs[0].status === 'trialing' && subs[0].trial_ends_at) {
    const days = Math.round((new Date(subs[0].trial_ends_at) - Date.now()) / 86400000)
    console.log(`✅ subscriptions: trialing, còn ~${days} ngày dùng thử`)
    if (days < 13 || days > 15) fail(`trial_ends_at không ~14 ngày (được ${days})`)
  } else fail(`subscriptions sai: ${JSON.stringify(subs)}`)
} catch (e) {
  if (e.message !== 'signup-failed') fail('Lỗi: ' + e.message)
} finally {
  // 3) Dọn sạch: xóa user test (cascade xóa profiles/subscriptions)
  if (userId) {
    const del = await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: svcHeaders })
    console.log(del.ok ? '🧹 Đã xóa user test (dọn sạch).' : `⚠️ Không xóa được user test (HTTP ${del.status}) — xóa tay nếu cần.`)
  }
}

console.log(pass ? '\n✅ TRIGGER HOẠT ĐỘNG ĐÚNG.' : '\n❌ Có lỗi — xem trên.')
process.exit(pass ? 0 : 1)
