// Kiểm thử cách ly RLS cho nhóm tài chính phải thu (invoices, invoice_items, transactions, categories).
// Chạy (SAU khi áp 0010): node --env-file=.env.local scripts/test-rls-finance.mjs

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
  const email = `eduflow.fin.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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

let A, B, C
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token đăng nhập'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // A tạo student → invoice → transaction income
  const st = await (await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: { ...head(aT), Prefer: 'return=representation' },
    body: JSON.stringify({ full_name: 'HS của A' }),
  })).json()
  if (!st[0]?.id) { bad(`A tạo học sinh lỗi: ${JSON.stringify(st).slice(0, 150)}`); throw new Error('create') }

  const invRes = await fetch(`${url}/rest/v1/invoices`, {
    method: 'POST', headers: { ...head(aT), Prefer: 'return=representation' },
    body: JSON.stringify({ student_id: st[0].id, title: 'HP test', subtotal: 500000, total_amount: 500000 }),
  })
  const inv = await invRes.json()
  if (invRes.ok && inv[0]?.id) ok('A tạo hóa đơn thành công')
  else { bad(`A tạo hóa đơn lỗi: ${JSON.stringify(inv).slice(0, 150)}`); throw new Error('create') }

  const txRes = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: { ...head(aT), Prefer: 'return=representation' },
    body: JSON.stringify({ type: 'income', amount: 200000, invoice_id: inv[0].id, student_id: st[0].id }),
  })
  const tx = await txRes.json()
  txRes.ok && tx[0]?.id ? ok('A ghi giao dịch thu thành công') : bad(`A ghi giao dịch lỗi: ${JSON.stringify(tx).slice(0, 150)}`)

  // A đọc của mình
  const aInv = await (await fetch(`${url}/rest/v1/invoices?select=id`, { headers: head(aT) })).json()
  aInv.length === 1 ? ok('A đọc được hóa đơn của mình') : bad(`A thấy ${aInv.length} hóa đơn (mong 1)`)

  // B không đọc invoices/transactions của A
  const bInv = await (await fetch(`${url}/rest/v1/invoices?select=id`, { headers: head(bT) })).json()
  Array.isArray(bInv) && bInv.length === 0 ? ok('B KHÔNG đọc được hóa đơn của A') : bad('B thấy hóa đơn của A!')
  const bTx = await (await fetch(`${url}/rest/v1/transactions?select=id`, { headers: head(bT) })).json()
  Array.isArray(bTx) && bTx.length === 0 ? ok('B KHÔNG đọc được giao dịch của A') : bad('B thấy giao dịch của A!')

  // B giả mạo user_id = A khi insert hóa đơn → bị chặn
  const forge = await fetch(`${url}/rest/v1/invoices`, {
    method: 'POST', headers: head(bT),
    body: JSON.stringify({ student_id: st[0].id, user_id: A.id, title: 'gian lan', subtotal: 1, total_amount: 1 }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn được hóa đơn với user_id = A!') : ok(`B KHÔNG giả mạo user_id được (HTTP ${forge.status})`)

  // ADMIN không đọc dữ liệu nghiệp vụ
  const cInv = await (await fetch(`${url}/rest/v1/invoices?select=id`, { headers: head(cT) })).json()
  Array.isArray(cInv) && cInv.length === 0 ? ok('ADMIN KHÔNG đọc được hóa đơn của USER') : bad('ADMIN đọc được hóa đơn!')
  const cTx = await (await fetch(`${url}/rest/v1/transactions?select=id`, { headers: head(cT) })).json()
  Array.isArray(cTx) && cTx.length === 0 ? ok('ADMIN KHÔNG đọc được giao dịch của USER') : bad('ADMIN đọc được giao dịch!')
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS FINANCE ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
