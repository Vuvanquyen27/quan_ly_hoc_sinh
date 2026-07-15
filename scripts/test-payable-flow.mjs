// Kiểm thử nghiệp vụ phải trả: trigger amount_paid/status khi trả dần.
// Chạy (SAU khi áp 0012): node --env-file=.env.local scripts/test-payable-flow.mjs

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
  const email = `eduflow.payflow.usr.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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
const getPay = async (t, id) =>
  (await (await fetch(`${url}/rest/v1/payables?id=eq.${id}&select=amount_paid,status`, { headers: head(t) })).json())[0]

let A
try {
  A = await mkUser()
  if (!A.id) { bad('Không tạo được user'); throw new Error('setup') }
  const aT = await token(A)
  if (!aT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A và đăng nhập')

  // Tạo payable tổng 600.000
  const pay = (await (await fetch(`${url}/rest/v1/payables`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ creditor_name: 'Chủ nhà', title: 'Thuê phòng 07', total_amount: 600000 }),
  })).json())[0]
  if (!pay?.id) { bad(`Tạo payable lỗi: ${JSON.stringify(pay).slice(0, 150)}`); throw new Error('create') }
  pay.status === 'unpaid' ? ok("Payable khởi tạo 'unpaid'") : bad(`Sai status đầu: ${pay.status}`)

  // Trả một phần 200.000 → partial
  await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ type: 'expense', amount: 200000, payable_id: pay.id }),
  })
  let p = await getPay(aT, pay.id)
  p?.amount_paid === 200000 && p?.status === 'partial' ? ok('Trả 200.000 → amount_paid 200.000, partial') : bad(`Sai sau trả 1 phần: ${JSON.stringify(p)}`)

  // Trả nốt 400.000 → paid
  const tx2 = (await (await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ type: 'expense', amount: 400000, payable_id: pay.id }),
  })).json())[0]
  p = await getPay(aT, pay.id)
  p?.amount_paid === 600000 && p?.status === 'paid' ? ok('Trả đủ → amount_paid 600.000, paid') : bad(`Sai sau trả đủ: ${JSON.stringify(p)}`)

  // Xóa giao dịch thứ 2 → về partial
  await fetch(`${url}/rest/v1/transactions?id=eq.${tx2.id}`, { method: 'DELETE', headers: head(aT) })
  p = await getPay(aT, pay.id)
  p?.amount_paid === 200000 && p?.status === 'partial' ? ok('Xóa giao dịch → amount_paid 200.000, partial') : bad(`Sai sau xóa: ${JSON.stringify(p)}`)

  // CHECK ràng buộc: income không được gắn payable_id
  const badTx = await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ type: 'income', amount: 1000, payable_id: pay.id }),
  })
  !badTx.ok ? ok('CHECK chặn income gắn payable_id') : bad('LỖ HỔNG: income gắn được payable_id!')
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  if (A?.id) await del(A.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ NGHIỆP VỤ PHẢI TRẢ ĐẠT.' : '\n❌ CÓ LỖI NGHIỆP VỤ.')
process.exit(pass ? 0 : 1)
