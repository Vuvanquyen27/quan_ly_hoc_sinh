// Kiểm tra kết nối Supabase mà KHÔNG in khóa ra màn hình.
// Chạy: node --env-file=.env.local scripts/check-supabase.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

const mask = (v) => (v ? `${v.slice(0, 6)}…(${v.length} ký tự)` : '(trống)')

if (!url || url.includes('REPLACE-ME')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL chưa được điền giá trị thật trong .env.local')
  process.exit(1)
}
if (!anon || anon.includes('REPLACE-ME')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY chưa được điền trong .env.local')
  process.exit(1)
}

console.log('URL           :', url)
console.log('anon key      :', mask(anon))
console.log(
  'service_role  :',
  service && !service.includes('REPLACE-ME') ? 'đã đặt (ẩn)' : '❌ CHƯA đặt',
)

try {
  // /auth/v1/settings trả 200 khi URL đúng và apikey hợp lệ — kiểm tra reachability + key.
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } })
  if (res.ok) {
    console.log(`✅ Kết nối Supabase OK — HTTP ${res.status}`)
  } else {
    console.error(`⚠️ Kết nối được nhưng HTTP ${res.status} — kiểm tra lại URL/anon key`)
    process.exit(1)
  }
} catch (e) {
  console.error('❌ Không kết nối được Supabase:', e.message)
  process.exit(1)
}
