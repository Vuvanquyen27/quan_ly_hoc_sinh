// Kiểm thử cách ly RLS notifications + Storage avatars (ghi theo tiền tố).
// Chạy (SAU khi áp 0014+0015): node --env-file=.env.local scripts/test-rls-notifications.mjs

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
  const email = `eduflow.noti.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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
const putAvatar = (t, path) => fetch(`${url}/storage/v1/object/avatars/${path}`, {
  method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'text/plain' }, body: 'avatar-bytes',
})
const rmAvatar = (path) => fetch(`${url}/storage/v1/object/avatars/${path}`, { method: 'DELETE', headers: svc })

let A, B, C
const created = []
try {
  ;[A, B, C] = [await mkUser(), await mkUser(), await mkUser(true)]
  if (!A.id || !B.id || !C.id) { bad('Không tạo được user'); throw new Error('setup') }
  const [aT, bT, cT] = [await token(A), await token(B), await token(C)]
  if (!aT || !bT || !cT) { bad('Không lấy được token'); throw new Error('setup') }
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // --- notifications ---
  const n = await (await fetch(`${url}/rest/v1/notifications`, {
    method: 'POST', headers: rep(aT), body: JSON.stringify({ type: 'system', title: 'Xin chào' }),
  })).json()
  n[0]?.id ? ok('A tạo thông báo thành công') : bad(`A tạo thông báo lỗi: ${JSON.stringify(n).slice(0, 150)}`)

  const aN = await (await fetch(`${url}/rest/v1/notifications?select=id`, { headers: head(aT) })).json()
  aN.length === 1 ? ok('A đọc được thông báo của mình') : bad(`A thấy ${aN.length} (mong 1)`)

  const bN = await (await fetch(`${url}/rest/v1/notifications?select=id`, { headers: head(bT) })).json()
  Array.isArray(bN) && bN.length === 0 ? ok('B KHÔNG đọc được thông báo của A') : bad('B thấy thông báo của A!')

  const forge = await fetch(`${url}/rest/v1/notifications`, {
    method: 'POST', headers: head(bT), body: JSON.stringify({ user_id: A.id, type: 'system', title: 'gian lan' }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn thông báo user_id=A!') : ok(`B KHÔNG giả mạo user_id (HTTP ${forge.status})`)

  const bUpd = await fetch(`${url}/rest/v1/notifications?id=eq.${n[0].id}`, {
    method: 'PATCH', headers: rep(bT), body: JSON.stringify({ is_read: true }),
  })
  const bUpdBody = await bUpd.json()
  Array.isArray(bUpdBody) && bUpdBody.length === 0 ? ok('B KHÔNG cập nhật được thông báo của A') : bad('B sửa được thông báo của A!')

  const cN = await (await fetch(`${url}/rest/v1/notifications?select=id`, { headers: head(cT) })).json()
  Array.isArray(cN) && cN.length === 0 ? ok('ADMIN KHÔNG đọc được thông báo của USER') : bad('ADMIN đọc được thông báo!')

  // --- avatars storage ---
  const aOwn = `${A.id}/avatar.txt`
  created.push(aOwn)
  const aUp = await putAvatar(aT, aOwn)
  aUp.ok ? ok('A upload avatar vào tiền tố của mình') : bad(`A upload avatar lỗi (HTTP ${aUp.status})`)

  const bHack = await putAvatar(bT, `${A.id}/hack.txt`)
  if (bHack.ok) { created.push(`${A.id}/hack.txt`); bad('LỖ HỔNG: B upload được vào tiền tố avatars/A!') }
  else ok(`B KHÔNG upload được vào tiền tố của A (HTTP ${bHack.status})`)

  const bOwn = `${B.id}/avatar.txt`
  const bUp = await putAvatar(bT, bOwn)
  if (bUp.ok) { created.push(bOwn); ok('B upload avatar vào tiền tố của mình') }
  else bad(`B upload avatar của mình lỗi (HTTP ${bUp.status})`)
} catch (e) {
  if (!['setup'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const p of created) await rmAvatar(p)
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user + object test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS NOTIFICATIONS + AVATARS ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
