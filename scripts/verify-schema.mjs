// Xác minh các bảng Giai đoạn 1 đã được tạo trong Supabase (không in khóa).
// Chạy: node --env-file=.env.local scripts/verify-schema.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || url.includes('REPLACE-ME')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL chưa đúng trong .env.local')
  process.exit(1)
}

// Ưu tiên service_role (bỏ qua RLS để thấy tồn tại bảng + đếm dòng thật).
const key = service && !service.includes('REPLACE-ME') ? service : anon
const headers = { apikey: key, Authorization: `Bearer ${key}` }

const tables = ['plans', 'profiles', 'user_settings', 'subscriptions']
let allOk = true

for (const t of tables) {
  try {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=5`, { headers })
    if (res.ok) {
      const rows = await res.json()
      console.log(`✅ ${t.padEnd(14)}: tồn tại (mẫu ${rows.length} dòng)`)
    } else {
      allOk = false
      const body = await res.text()
      const short = body.length > 120 ? body.slice(0, 120) + '…' : body
      console.log(`❌ ${t.padEnd(14)}: HTTP ${res.status} — ${short}`)
    }
  } catch (e) {
    allOk = false
    console.log(`❌ ${t.padEnd(14)}: lỗi ${e.message}`)
  }
}

console.log(allOk ? '\n✅ Tất cả bảng đã sẵn sàng.' : '\n⚠️ Có bảng chưa tạo — kiểm tra lại việc chạy migration.')
process.exit(allOk ? 0 : 1)
