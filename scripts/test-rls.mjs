// Kiểm thử cách ly RLS trên profiles/subscriptions. Tạo 2 user, đăng nhập bằng A,
// thử đọc/ghi chéo và leo thang. Dọn sạch sau cùng. Không in khóa.
// Chạy: node --env-file=.env.local scripts/test-rls.mjs

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

async function createUser(tag) {
  const email = `eduflow.rls.${tag}.${Date.now()}@gmail.com`
  const password = 'MatKhauTest123!'
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const body = await res.json()
  return { id: body.id ?? body.user?.id, email, password }
}
const delUser = (id) => fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svc })
const roleOf = async (id) =>
  (await (await fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=role,is_locked`, { headers: svc })).json())[0]

let A, B
try {
  A = await createUser('a')
  B = await createUser('b')
  if (!A.id || !B.id) { bad('Không tạo được user test'); throw new Error('setup') }
  ok(`Đã tạo 2 user test`)

  // Đăng nhập A → access_token
  const tokRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: A.email, password: A.password }),
  })
  const tok = await tokRes.json()
  const aToken = tok.access_token
  if (!aToken) { bad('Không đăng nhập được A: ' + JSON.stringify(tok).slice(0, 150)); throw new Error('login') }
  ok('Đăng nhập A thành công')
  const aHead = { apikey: anon, Authorization: `Bearer ${aToken}`, 'Content-Type': 'application/json' }

  // (a) A đọc profiles → chỉ thấy chính mình
  const aSees = await (await fetch(`${url}/rest/v1/profiles?select=id`, { headers: aHead })).json()
  if (Array.isArray(aSees) && aSees.length === 1 && aSees[0].id === A.id) ok('A chỉ đọc được profile của chính mình')
  else bad(`A đọc profiles trả về bất thường: ${JSON.stringify(aSees).slice(0, 150)}`)

  // (b) A cố đọc profile của B theo id → 0 dòng
  const aReadB = await (await fetch(`${url}/rest/v1/profiles?id=eq.${B.id}&select=id`, { headers: aHead })).json()
  if (Array.isArray(aReadB) && aReadB.length === 0) ok('A KHÔNG đọc được profile của B (cách ly OK)')
  else bad(`A đọc được profile của B! ${JSON.stringify(aReadB).slice(0, 150)}`)

  // (c) A cố leo thang: đặt role='admin' cho chính mình
  await fetch(`${url}/rest/v1/profiles?id=eq.${A.id}`, {
    method: 'PATCH', headers: { ...aHead, Prefer: 'return=minimal' },
    body: JSON.stringify({ role: 'admin' }),
  })
  const afterRole = await roleOf(A.id)
  if (afterRole?.role === 'admin') bad('LỖ HỔNG: A tự đổi được role thành admin!')
  else ok(`A KHÔNG đổi được role (vẫn '${afterRole?.role}')`)

  // (d) A cố tự mở khóa: is_locked=false (giả sử admin đã khóa)
  await fetch(`${url}/rest/v1/profiles?id=eq.${A.id}`, {
    method: 'PATCH', headers: { ...svc }, body: JSON.stringify({ is_locked: true }),
  }) // admin khóa A trước
  await fetch(`${url}/rest/v1/profiles?id=eq.${A.id}`, {
    method: 'PATCH', headers: { ...aHead, Prefer: 'return=minimal' },
    body: JSON.stringify({ is_locked: false }),
  })
  const afterLock = await roleOf(A.id)
  if (afterLock?.is_locked === false) bad('LỖ HỔNG: A tự mở khóa được (is_locked=false)!')
  else ok('A KHÔNG tự mở khóa được (is_locked giữ nguyên)')

  // (e) A cố sửa subscriptions của mình (không được phép ghi)
  const subPatch = await fetch(`${url}/rest/v1/subscriptions?user_id=eq.${A.id}`, {
    method: 'PATCH', headers: { ...aHead, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'active' }),
  })
  const subAfter = await (await fetch(`${url}/rest/v1/subscriptions?user_id=eq.${A.id}&select=status`, { headers: svc })).json()
  if (subAfter[0]?.status === 'active') bad('LỖ HỔNG: A tự đổi được trạng thái thuê bao!')
  else ok(`A KHÔNG đổi được thuê bao (vẫn '${subAfter[0]?.status}')`)
} catch (e) {
  if (!['setup', 'login'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  if (A?.id) await delUser(A.id)
  if (B?.id) await delUser(B.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS ĐẠT.' : '\n❌ CÓ LỖ HỔNG — cần vá.')
process.exit(pass ? 0 : 1)
