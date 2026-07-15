// Kiểm thử cách ly RLS cho 4 view báo cáo (security_invoker).
// Chạy (SAU khi áp 0013): node --env-file=.env.local scripts/test-rls-report-views.mjs

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

async function mkUser(admin = false) {
  const email = `eduflow.rep.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
  const password = 'MatKhauTest123!'
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata: admin ? { role: 'admin' } : {} }),
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
const rows = async (t, view) =>
  (await (await fetch(`${url}/rest/v1/${view}?select=user_id`, { headers: head(t) })).json())

const VIEWS = ['v_cashflow_monthly', 'v_receivables_outstanding', 'v_payables_outstanding', 'v_upcoming_sessions']

let A, B, C
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // A tạo dữ liệu chạm cả 4 view
  const st = (await (await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ full_name: 'HS báo cáo', default_fee: 300000 }),
  })).json())[0]
  if (!st?.id) { bad(`Tạo học sinh lỗi: ${JSON.stringify(st).slice(0, 150)}`); throw new Error('create') }

  await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ type: 'income', amount: 500000, student_id: st.id }),
  })
  await fetch(`${url}/rest/v1/invoices`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ student_id: st.id, title: 'HP', subtotal: 500000, total_amount: 500000 }),
  })
  await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ creditor_name: 'Chủ nhà', total_amount: 200000 }),
  })
  const start = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const end = new Date(Date.now() + 25 * 3600 * 1000).toISOString()
  await fetch(`${url}/rest/v1/sessions`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ student_id: st.id, status: 'scheduled', start_time: start, end_time: end }),
  })
  ok('A đã tạo dữ liệu (transaction/invoice/payable/session)')

  // A thấy dữ liệu qua cả 4 view
  for (const v of VIEWS) {
    const r = await rows(aT, v)
    Array.isArray(r) && r.length >= 1 ? ok(`A thấy ${v} (${r.length} dòng)`) : bad(`A KHÔNG thấy ${v}: ${JSON.stringify(r).slice(0, 120)}`)
  }

  // B & admin KHÔNG thấy dòng nào qua bất kỳ view nào
  for (const [label, t] of [['B', bT], ['ADMIN', cT]]) {
    for (const v of VIEWS) {
      const r = await rows(t, v)
      Array.isArray(r) && r.length === 0 ? ok(`${label} KHÔNG thấy ${v} của A`) : bad(`RÒ RỈ: ${label} thấy ${v} của A! ${JSON.stringify(r).slice(0, 120)}`)
    }
  }
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS VIEW BÁO CÁO ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
