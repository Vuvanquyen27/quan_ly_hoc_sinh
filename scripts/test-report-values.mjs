// Đối chiếu số liệu view báo cáo: đúng phép gom THÁNG theo giờ VN + tổng thu/chi/công nợ.
// Chạy (SAU khi áp 0013): node --env-file=.env.local scripts/test-report-values.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
for (const [k, v] of [['URL', url], ['anon', anon], ['service_role', service]]) {
  if (!v || v.includes('REPLACE-ME')) { console.error(`❌ Thiếu ${k}`); process.exit(1) }
}

const svc = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
let pass = true
const ok = (m) => console.log('✅ ' + m)
const bad = (m) => { pass = false; console.log('❌ ' + m) }

async function mkUser() {
  const email = `eduflow.repval.usr.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
  const password = 'MatKhauTest123!'
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc, body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const b = await r.json()
  return { id: b.id ?? b.user?.id, email, password }
}
const del = (id) => fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svc })
async function token(u) {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password }),
  })
  return (await r.json()).access_token
}
const head = (t) => ({ apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' })
const rep = (t) => ({ ...head(t), Prefer: 'return=representation' })

let A
try {
  A = await mkUser()
  if (!A.id) { bad('Không tạo được user'); throw new Error('setup') }
  const aT = await token(A)
  if (!aT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A và đăng nhập')

  const st = (await (await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ full_name: 'HS đối chiếu' }),
  })).json())[0]
  if (!st?.id) { bad(`Tạo học sinh lỗi: ${JSON.stringify(st).slice(0, 150)}`); throw new Error('create') }

  // 3 giao dịch tự do — chú ý mốc thử múi giờ:
  //  - income 300k @ 2026-07-15T05:00Z  → VN 2026-07-15 (July)
  //  - income 200k @ 2026-06-30T18:00Z  → VN 2026-07-01 01:00 (July!)  ← kiểm tz
  //  - expense 100k @ 2026-07-10T05:00Z → VN 2026-07-10 (July)
  const txs = [
    { type: 'income', amount: 300000, occurred_at: '2026-07-15T05:00:00Z' },
    { type: 'income', amount: 200000, occurred_at: '2026-06-30T18:00:00Z' },
    { type: 'expense', amount: 100000, occurred_at: '2026-07-10T05:00:00Z' },
  ]
  for (const t of txs) {
    await fetch(`${url}/rest/v1/transactions`, { method: 'POST', headers: head(aT), body: JSON.stringify(t) })
  }
  // Hóa đơn 500k chưa thu → phải thu 500k
  await fetch(`${url}/rest/v1/invoices`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ student_id: st.id, title: 'HP đối chiếu', subtotal: 500000, total_amount: 500000 }),
  })
  ok('Đã tạo 3 giao dịch + 1 hóa đơn')

  // v_cashflow_monthly: tháng 07/2026 (giờ VN)
  const cf = await (await fetch(`${url}/rest/v1/v_cashflow_monthly?select=month,total_income,total_expense,net_cashflow`, { headers: head(aT) })).json()
  const july = (cf ?? []).find((r) => String(r.month).slice(0, 7) === '2026-07')
  if (!july) { bad(`Không thấy dòng tháng 2026-07: ${JSON.stringify(cf).slice(0, 200)}`); throw new Error('assert') }
  july.total_income === 500000 ? ok('Thu tháng 07 = 500.000 (gồm cả GD 30/06 18:00Z → VN tháng 7)') : bad(`Thu tháng 07 = ${july.total_income} (mong 500000)`)
  july.total_expense === 100000 ? ok('Chi tháng 07 = 100.000') : bad(`Chi tháng 07 = ${july.total_expense} (mong 100000)`)
  july.net_cashflow === 400000 ? ok('Ròng tháng 07 = 400.000') : bad(`Ròng tháng 07 = ${july.net_cashflow} (mong 400000)`)

  // Không rò rỉ sang tháng 6 (tổng thu mọi tháng vẫn = 500k)
  const totalIncome = (cf ?? []).reduce((s, r) => s + (r.total_income ?? 0), 0)
  totalIncome === 500000 ? ok('Tổng thu mọi tháng = 500.000 (không lệch sang tháng 6)') : bad(`Tổng thu mọi tháng = ${totalIncome} (mong 500000)`)

  // v_receivables_outstanding: 500k
  const rec = await (await fetch(`${url}/rest/v1/v_receivables_outstanding?select=outstanding`, { headers: head(aT) })).json()
  const recTotal = (rec ?? []).reduce((s, r) => s + (r.outstanding ?? 0), 0)
  recTotal === 500000 ? ok('Phải thu = 500.000') : bad(`Phải thu = ${recTotal} (mong 500000)`)
} catch (e) {
  if (!['setup', 'create', 'assert'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  if (A?.id) await del(A.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ ĐỐI CHIẾU SỐ LIỆU BÁO CÁO ĐẠT.' : '\n❌ SỐ LIỆU SAI.')
process.exit(pass ? 0 : 1)
