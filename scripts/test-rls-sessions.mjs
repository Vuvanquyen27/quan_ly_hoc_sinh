// Kiểm thử cách ly RLS cho bảng sessions. Tạo A, B, C(admin). Dọn sạch sau cùng.
// Chạy (SAU khi áp 0008): node --env-file=.env.local scripts/test-rls-sessions.mjs

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
  const email = `eduflow.ss.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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
  ok('Đã tạo A, B, C(admin) và đăng nhập')

  // A tạo 1 học sinh (vì sessions.student_id NOT NULL)
  const stRes = await fetch(`${url}/rest/v1/students`, {
    method: 'POST', headers: { ...head(aT), Prefer: 'return=representation' },
    body: JSON.stringify({ full_name: 'HS của A' }),
  })
  const st = await stRes.json()
  if (!(stRes.ok && st[0]?.id)) { bad(`A tạo học sinh lỗi: ${JSON.stringify(st).slice(0, 150)}`); throw new Error('create') }

  // A tạo 1 buổi
  const createRes = await fetch(`${url}/rest/v1/sessions`, {
    method: 'POST', headers: { ...head(aT), Prefer: 'return=representation' },
    body: JSON.stringify({
      student_id: st[0].id,
      start_time: '2026-07-14T02:00:00Z',
      end_time: '2026-07-14T03:30:00Z',
    }),
  })
  const created = await createRes.json()
  if (createRes.ok && created[0]?.id) ok('A tạo buổi học thành công')
  else { bad(`A tạo buổi lỗi: ${JSON.stringify(created).slice(0, 150)}`); throw new Error('create') }

  const aList = await (await fetch(`${url}/rest/v1/sessions?select=id`, { headers: head(aT) })).json()
  aList.length === 1 ? ok('A đọc được buổi của mình') : bad(`A thấy ${aList.length} (mong 1)`)

  const bList = await (await fetch(`${url}/rest/v1/sessions?select=id`, { headers: head(bT) })).json()
  Array.isArray(bList) && bList.length === 0 ? ok('B KHÔNG đọc được buổi của A') : bad('B thấy dữ liệu của A!')

  // B giả mạo user_id = A khi insert → bị chặn
  const forge = await fetch(`${url}/rest/v1/sessions`, {
    method: 'POST', headers: head(bT),
    body: JSON.stringify({
      student_id: st[0].id, user_id: A.id,
      start_time: '2026-07-14T02:00:00Z', end_time: '2026-07-14T03:00:00Z',
    }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn được bản ghi với user_id = A!') : ok(`B KHÔNG giả mạo user_id được (HTTP ${forge.status})`)

  const cList = await (await fetch(`${url}/rest/v1/sessions?select=id`, { headers: head(cT) })).json()
  Array.isArray(cList) && cList.length === 0 ? ok('ADMIN KHÔNG đọc được sessions của USER') : bad('ADMIN đọc được sessions!')
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS SESSIONS ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
