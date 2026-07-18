// Dọn tài khoản TEST còn sót do script test tạo (cleanup lỗi vì FK invoices.student_id RESTRICT).
// GoTrue admin API không xóa được (RESTRICT chặn cascade) → xóa trực tiếp qua SUPABASE_DB_URL,
// theo thứ tự con→cha trong 1 transaction (rollback nếu lỗi).
// AN TOÀN: chỉ tài khoản có email LIKE 'eduflow.%'. KHÔNG đụng tài khoản thật.
//
// Chạy:
//   node --env-file=.env.local scripts/cleanup-test-users.mjs         # liệt kê (DRY RUN)
//   node --env-file=.env.local scripts/cleanup-test-users.mjs --yes   # thực xóa
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl || dbUrl.includes('REPLACE') || dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Thiếu SUPABASE_DB_URL hợp lệ trong .env.local')
  process.exit(1)
}

const apply = process.argv.includes('--yes')
// Thứ tự con→cha: invoices phải xóa trước students (invoices.student_id RESTRICT).
const childTables = [
  'transactions', 'invoice_items', 'attendance', 'invoices', 'payables',
  'sessions', 'documents', 'students', 'lessons', 'categories',
  'notifications', 'subscription_payments', 'subscriptions', 'user_settings',
]

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  const { rows } = await client.query(
    "select id, email from public.profiles where email like 'eduflow.%' order by email",
  )
  console.log(`Khớp mẫu test (eduflow.%): ${rows.length}`)
  rows.forEach((r) => console.log('  - ' + r.email))
  if (!rows.length) { console.log('Không có gì để dọn.'); await client.end(); process.exit(0) }

  if (!apply) {
    console.log('\n(DRY RUN) Không xóa gì. Thêm --yes để thực xóa.')
    await client.end()
    process.exit(0)
  }

  const ids = rows.map((r) => r.id)
  await client.query('begin')
  for (const t of childTables) {
    const res = await client.query(`delete from public.${t} where user_id = any($1::uuid[])`, [ids])
    console.log(`  xóa ${res.rowCount} dòng ${t}`)
  }
  // profiles.id → auth.users(id) ON DELETE CASCADE: xóa auth.users là dọn nốt profiles + auth.*
  const delAuth = await client.query('delete from auth.users where id = any($1::uuid[])', [ids])
  await client.query('commit')
  console.log(`\n✅ Đã xóa ${delAuth.rowCount} tài khoản test + dữ liệu liên quan.`)
} catch (e) {
  try { await client.query('rollback') } catch {}
  console.error('❌ Lỗi (đã rollback): ' + e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
