// Kiểm thử cách ly RLS cho payables (+ đường chi transactions.payable_id).
// Chạy (SAU khi áp 0012): node --env-file=.env.local scripts/test-rls-payables.mjs

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
  const email = `eduflow.pay.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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

let A, B, C
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token đăng nhập'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // A tạo payable → transaction expense gắn payable
  const payRes = await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ creditor_name: 'Chủ nhà', title: 'Thuê phòng', total_amount: 500000 }),
  })
  const pay = await payRes.json()
  if (payRes.ok && pay[0]?.id) ok('A tạo khoản phải trả thành công')
  else { bad(`A tạo payable lỗi: ${JSON.stringify(pay).slice(0, 150)}`); throw new Error('create') }

  const txRes = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ type: 'expense', amount: 200000, payable_id: pay[0].id }),
  })
  const tx = await txRes.json()
  txRes.ok && tx[0]?.id ? ok('A ghi giao dịch chi (trả nợ) thành công') : bad(`A ghi chi lỗi: ${JSON.stringify(tx).slice(0, 150)}`)

  // A đọc payable của mình
  const aPay = await (await fetch(`${url}/rest/v1/payables?select=id`, { headers: head(aT) })).json()
  aPay.length === 1 ? ok('A đọc được payable của mình') : bad(`A thấy ${aPay.length} payable (mong 1)`)

  // B không đọc payable của A
  const bPay = await (await fetch(`${url}/rest/v1/payables?select=id`, { headers: head(bT) })).json()
  Array.isArray(bPay) && bPay.length === 0 ? ok('B KHÔNG đọc được payable của A') : bad('B thấy payable của A!')

  // B giả mạo user_id = A khi insert payable → bị chặn
  const forge = await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: head(bT),
    body: JSON.stringify({ user_id: A.id, creditor_name: 'gian lan', total_amount: 1 }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn được payable với user_id = A!') : ok(`B KHÔNG giả mạo user_id được (HTTP ${forge.status})`)

  // B không sửa/xóa payable của A
  const bUpd = await fetch(`${url}/rest/v1/payables?id=eq.${pay[0].id}`, {
    method: 'PATCH', headers: rep(bT), body: JSON.stringify({ title: 'hacked' }),
  })
  const bUpdBody = await bUpd.json()
  Array.isArray(bUpdBody) && bUpdBody.length === 0 ? ok('B KHÔNG sửa được payable của A') : bad('B sửa được payable của A!')

  // ADMIN không đọc payable của USER
  const cPay = await (await fetch(`${url}/rest/v1/payables?select=id`, { headers: head(cT) })).json()
  Array.isArray(cPay) && cPay.length === 0 ? ok('ADMIN KHÔNG đọc được payable của USER') : bad('ADMIN đọc được payable!')
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS PAYABLES ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
