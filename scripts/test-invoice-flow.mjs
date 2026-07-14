// Kiểm thử nghiệp vụ hóa đơn: tổng hợp từ buổi (không tính trùng) + trigger amount_paid/status.
// Chạy (SAU khi áp 0010 + 0011): node --env-file=.env.local scripts/test-invoice-flow.mjs

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
  const email = `eduflow.inv.usr.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
  const password = 'MatKhauTest123!'
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({ email, password, email_confirm: true }),
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

  // Student + 2 buổi completed (fee 300000) trong tháng 07/2026 (giờ VN)
  const st = await (await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ full_name: 'HS hóa đơn', default_fee: 300000 }),
  })).json()
  if (!st[0]?.id) { bad(`Tạo học sinh lỗi: ${JSON.stringify(st).slice(0, 150)}`); throw new Error('create') }
  const sid = st[0].id

  for (const d of ['2026-07-10T02:00:00Z', '2026-07-20T02:00:00Z']) {
    const s = await (await fetch(`${url}/rest/v1/sessions`, {
      method: 'POST', headers: rep(aT),
      body: JSON.stringify({ student_id: sid, status: 'completed', fee_amount: 300000,
        start_time: d, end_time: d.replace('02:00:00', '03:00:00') }),
    })).json()
    if (!s[0]?.id) { bad(`Tạo buổi lỗi: ${JSON.stringify(s).slice(0, 150)}`); throw new Error('create') }
  }
  ok('Đã tạo 2 buổi completed (fee 300.000)')

  // RPC tổng hợp hóa đơn kỳ 07/2026
  const rpcRes = await fetch(`${url}/rest/v1/rpc/create_invoice_from_sessions`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ p_student_id: sid, p_period_month: '2026-07-01' }),
  })
  const invId = await rpcRes.json()
  if (rpcRes.ok && typeof invId === 'string') ok('RPC tạo hóa đơn từ buổi thành công')
  else { bad(`RPC lỗi: ${JSON.stringify(invId).slice(0, 200)}`); throw new Error('create') }

  const inv1 = (await (await fetch(`${url}/rest/v1/invoices?id=eq.${invId}&select=subtotal,total_amount,amount_paid,status`, { headers: head(aT) })).json())[0]
  inv1?.subtotal === 600000 && inv1?.total_amount === 600000 ? ok('Hóa đơn subtotal/total = 600.000') : bad(`Sai tổng: ${JSON.stringify(inv1)}`)
  inv1?.status === 'unpaid' ? ok("Hóa đơn trạng thái 'unpaid'") : bad(`Sai status: ${inv1?.status}`)

  const items = await (await fetch(`${url}/rest/v1/invoice_items?invoice_id=eq.${invId}&select=id`, { headers: head(aT) })).json()
  items.length === 2 ? ok('Hóa đơn có 2 dòng (2 buổi)') : bad(`Có ${items.length} dòng (mong 2)`)

  const billed = await (await fetch(`${url}/rest/v1/sessions?student_id=eq.${sid}&select=is_billed`, { headers: head(aT) })).json()
  billed.every((s) => s.is_billed === true) ? ok('Cả 2 buổi đã đánh dấu is_billed') : bad('Còn buổi chưa is_billed!')

  // RPC lần 2 cùng kỳ → phải lỗi, KHÔNG tạo trùng
  const rpc2 = await fetch(`${url}/rest/v1/rpc/create_invoice_from_sessions`, {
    method: 'POST', headers: head(aT), body: JSON.stringify({ p_student_id: sid, p_period_month: '2026-07-01' }),
  })
  !rpc2.ok ? ok('RPC lần 2 bị chặn (không còn buổi)') : bad('RPC lần 2 KHÔNG bị chặn — nguy cơ tính trùng!')
  const invCount = await (await fetch(`${url}/rest/v1/invoices?select=id`, { headers: head(aT) })).json()
  invCount.length === 1 ? ok('Vẫn chỉ 1 hóa đơn (không nhân đôi)') : bad(`Có ${invCount.length} hóa đơn (mong 1)`)

  // Thu một phần 200.000 → partial
  await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ type: 'income', amount: 200000, invoice_id: invId, student_id: sid }),
  })
  let inv = (await (await fetch(`${url}/rest/v1/invoices?id=eq.${invId}&select=amount_paid,status`, { headers: head(aT) })).json())[0]
  inv?.amount_paid === 200000 && inv?.status === 'partial' ? ok('Thu 200.000 → amount_paid 200.000, status partial') : bad(`Sai sau thu 1 phần: ${JSON.stringify(inv)}`)

  // Thu nốt 400.000 → paid
  const tx2 = (await (await fetch(`${url}/rest/v1/transactions`, {
    method: 'POST', headers: rep(aT),
    body: JSON.stringify({ type: 'income', amount: 400000, invoice_id: invId, student_id: sid }),
  })).json())[0]
  inv = (await (await fetch(`${url}/rest/v1/invoices?id=eq.${invId}&select=amount_paid,status`, { headers: head(aT) })).json())[0]
  inv?.amount_paid === 600000 && inv?.status === 'paid' ? ok('Thu đủ → amount_paid 600.000, status paid') : bad(`Sai sau thu đủ: ${JSON.stringify(inv)}`)

  // Xóa giao dịch thứ 2 → về partial
  await fetch(`${url}/rest/v1/transactions?id=eq.${tx2.id}`, { method: 'DELETE', headers: head(aT) })
  inv = (await (await fetch(`${url}/rest/v1/invoices?id=eq.${invId}&select=amount_paid,status`, { headers: head(aT) })).json())[0]
  inv?.amount_paid === 200000 && inv?.status === 'partial' ? ok('Xóa giao dịch → amount_paid 200.000, status partial') : bad(`Sai sau xóa: ${JSON.stringify(inv)}`)
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  if (A?.id) await del(A.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ NGHIỆP VỤ HÓA ĐƠN ĐẠT.' : '\n❌ CÓ LỖI NGHIỆP VỤ.')
process.exit(pass ? 0 : 1)
