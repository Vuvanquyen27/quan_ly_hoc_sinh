// Kiểm thử cách ly RLS khu ADMIN: subscription_payments + admin_audit_logs + ranh giới nghiệp vụ.
// Chạy (SAU khi áp 0016): node --env-file=.env.local scripts/test-rls-admin.mjs

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
  const email = `eduflow.adm.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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
const min = { ...svc, Prefer: 'return=minimal' }
const subId = async (uid) =>
  (await (await fetch(`${url}/rest/v1/subscriptions?select=id&user_id=eq.${uid}`, { headers: svc })).json())[0]?.id

let A, B, C
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A, B (user) và C (admin) + đăng nhập')

  // A tạo 1 học sinh (dữ liệu nghiệp vụ) để kiểm tra admin KHÔNG đọc được.
  const stu = await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ full_name: 'HS của A' }),
  })
  stu.ok ? ok('A tạo học sinh thành công') : bad(`A tạo học sinh lỗi: ${stu.status}`)

  // service_role seed subscription_payments cho A và B (mô phỏng admin xác nhận thanh toán).
  const [aSub, bSub] = [await subId(A.id), await subId(B.id)]
  await fetch(`${url}/rest/v1/subscription_payments`, {
    method: 'POST', headers: min,
    body: JSON.stringify({ subscription_id: aSub, user_id: A.id, kind: 'activation', amount: 99000, status: 'confirmed' }),
  })
  await fetch(`${url}/rest/v1/subscription_payments`, {
    method: 'POST', headers: min,
    body: JSON.stringify({ subscription_id: bSub, user_id: B.id, kind: 'activation', amount: 99000, status: 'confirmed' }),
  })
  // service_role seed 1 dòng audit (actor = C admin, target = A).
  await fetch(`${url}/rest/v1/admin_audit_logs`, {
    method: 'POST', headers: min,
    body: JSON.stringify({ actor_id: C.id, action: 'lock_account', target_user_id: A.id }),
  })
  ok('Đã seed subscription_payments (A, B) + admin_audit_logs')

  // 1. A chỉ đọc được payment của mình.
  const aPay = await (await fetch(`${url}/rest/v1/subscription_payments?select=id`, { headers: head(aT) })).json()
  Array.isArray(aPay) && aPay.length === 1 ? ok('A đọc đúng 1 payment của mình') : bad(`A thấy ${aPay.length} payment (mong 1)`)

  // 2. B không thấy payment của A (chỉ thấy 1 của mình).
  const bPay = await (await fetch(`${url}/rest/v1/subscription_payments?select=id`, { headers: head(bT) })).json()
  Array.isArray(bPay) && bPay.length === 1 ? ok('B KHÔNG đọc được payment của A') : bad(`B thấy ${bPay.length} payment (mong 1)`)

  // 3. A KHÔNG đọc được admin_audit_logs.
  const aAudit = await (await fetch(`${url}/rest/v1/admin_audit_logs?select=id`, { headers: head(aT) })).json()
  Array.isArray(aAudit) && aAudit.length === 0 ? ok('USER KHÔNG đọc được admin_audit_logs') : bad('USER đọc được audit logs!')

  // 4. C (admin) đọc được admin_audit_logs.
  const cAudit = await (await fetch(`${url}/rest/v1/admin_audit_logs?select=id`, { headers: head(cT) })).json()
  Array.isArray(cAudit) && cAudit.length >= 1 ? ok('ADMIN đọc được admin_audit_logs') : bad('ADMIN không đọc được audit logs!')

  // 5. C (admin) đọc được subscription_payments của mọi USER.
  const cPay = await (await fetch(`${url}/rest/v1/subscription_payments?select=id`, { headers: head(cT) })).json()
  Array.isArray(cPay) && cPay.length >= 2 ? ok('ADMIN đọc được subscription_payments (quản lý)') : bad(`ADMIN thấy ${cPay.length} payment (mong ≥2)`)

  // 6. C (admin) KHÔNG đọc được students của USER (policy không có nhánh is_admin).
  const cStu = await (await fetch(`${url}/rest/v1/students?select=id`, { headers: head(cT) })).json()
  Array.isArray(cStu) && cStu.length === 0 ? ok('ADMIN KHÔNG đọc được dữ liệu nghiệp vụ (students)') : bad('ADMIN đọc được students của USER!')

  // 7. USER không ghi được admin_audit_logs.
  const forgeAudit = await fetch(`${url}/rest/v1/admin_audit_logs`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ actor_id: A.id, action: 'lock_account' }),
  })
  forgeAudit.ok ? bad('LỖ HỔNG: USER ghi được audit log!') : ok(`USER KHÔNG ghi được audit log (HTTP ${forgeAudit.status})`)

  // 8. USER không ghi được subscription_payments (kể cả cho chính mình).
  const forgePay = await fetch(`${url}/rest/v1/subscription_payments`, {
    method: 'POST', headers: head(aT),
    body: JSON.stringify({ user_id: A.id, kind: 'activation', amount: 1, status: 'pending' }),
  })
  forgePay.ok ? bad('LỖ HỔNG: USER tự tạo được subscription_payment!') : ok(`USER KHÔNG tự tạo được payment (HTTP ${forgePay.status})`)

  // 9. USER không tự kích hoạt thuê bao (update subscriptions → 0 dòng).
  const selfActivate = await fetch(`${url}/rest/v1/subscriptions?user_id=eq.${A.id}`, {
    method: 'PATCH', headers: rep(aT), body: JSON.stringify({ status: 'active' }),
  })
  const selfBody = await selfActivate.json()
  Array.isArray(selfBody) && selfBody.length === 0 ? ok('USER KHÔNG tự kích hoạt được thuê bao') : bad('USER tự đổi được trạng thái thuê bao!')
} catch (e) {
  if (!['setup'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  // Xóa audit log test TRƯỚC (actor_id ON DELETE RESTRICT chặn xóa tài khoản admin — đúng thiết kế).
  if (C?.id) await fetch(`${url}/rest/v1/admin_audit_logs?actor_id=eq.${C.id}`, { method: 'DELETE', headers: svc })
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa dữ liệu test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS ADMIN ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
