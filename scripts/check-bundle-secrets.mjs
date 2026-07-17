// Quét bundle client (.next/static) tìm rò rỉ bí mật server-side.
// Bí mật (service_role, chuỗi kết nối DB) KHÔNG BAO GIỜ được lọt vào mã chạy trên trình duyệt.
// Chạy SAU khi build:
//   node --env-file=.env.local scripts/check-bundle-secrets.mjs   (quét khớp cả GIÁ TRỊ thật)
//   node scripts/check-bundle-secrets.mjs                          (chỉ quét theo tên biến)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const STATIC_DIR = '.next/static'

if (!existsSync(STATIC_DIR)) {
  console.error(`❌ Không thấy ${STATIC_DIR}. Chạy "npm run build" trước.`)
  process.exit(1)
}

// Kim cần dò: (a) GIÁ TRỊ thật của biến bí mật (chính xác tuyệt đối) + (b) TÊN biến (lưới phụ).
const needles = []
const addValue = (name, v) => {
  if (v && v.length >= 20) needles.push({ label: `giá trị ${name}`, text: v })
}
addValue('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)
addValue('SUPABASE_DB_URL', process.env.SUPABASE_DB_URL)
needles.push({ label: 'tên biến SUPABASE_SERVICE_ROLE_KEY', text: 'SUPABASE_SERVICE_ROLE_KEY' })
needles.push({ label: 'tên biến SUPABASE_DB_URL', text: 'SUPABASE_DB_URL' })

function* jsFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) yield* jsFiles(p)
    else if (name.endsWith('.js')) yield p
  }
}

let leaks = 0
let scanned = 0
for (const file of jsFiles(STATIC_DIR)) {
  const content = readFileSync(file, 'utf8')
  scanned++
  for (const n of needles) {
    if (content.includes(n.text)) {
      console.log(`❌ RÒ RỈ: ${n.label} xuất hiện trong ${file}`)
      leaks++
    }
  }
}

console.log(`\nĐã quét ${scanned} tệp .js trong ${STATIC_DIR}.`)
const hasValueCheck = needles.some((n) => n.label.startsWith('giá trị'))
if (!hasValueCheck) {
  console.log('⚠️  Không có biến bí mật trong môi trường để khớp GIÁ TRỊ (chỉ quét theo tên biến).')
}
if (leaks > 0) {
  console.log(`\n❌ PHÁT HIỆN ${leaks} rò rỉ bí mật trong bundle client.`)
  process.exit(1)
}
console.log('✅ Không phát hiện bí mật server-side trong bundle client.')
process.exit(0)
