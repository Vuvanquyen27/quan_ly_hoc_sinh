// Áp một file .sql lên Supabase qua SUPABASE_DB_URL (đọc từ .env.local). Không in mật khẩu.
// Chạy: node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0003_profiles_column_guard.sql

import { readFileSync } from 'node:fs'
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
const file = process.argv[2]

if (!dbUrl || dbUrl.includes('REPLACE') || dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Thiếu SUPABASE_DB_URL hợp lệ trong .env.local (Supabase → Settings → Database → Connection string → URI, thay [YOUR-PASSWORD]).')
  process.exit(1)
}
if (!file) {
  console.error('❌ Cần đường dẫn file .sql. Ví dụ: node --env-file=.env.local scripts/run-migration.mjs supabase/migrations/0003_profiles_column_guard.sql')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')
  console.log(`✅ Đã áp thành công: ${file}`)
} catch (e) {
  try { await client.query('rollback') } catch {}
  console.error(`❌ Lỗi khi áp ${file}: ${e.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
