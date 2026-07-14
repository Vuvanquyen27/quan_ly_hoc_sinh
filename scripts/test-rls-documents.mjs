// Kiểm thử cách ly RLS + Storage cho bảng documents. Tạo A, B, C(admin). Dọn sạch sau cùng.
// Chạy (SAU khi áp 0006 + 0007): node --env-file=.env.local scripts/test-rls-documents.mjs

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
  const email = `eduflow.doc.${admin ? 'adm' : 'usr'}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`
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

  // ---- Phần RLS bảng documents ----
  const createRes = await fetch(`${url}/rest/v1/documents`, {
    method: 'POST', headers: { ...head(aT), Prefer: 'return=representation' },
    body: JSON.stringify({ title: 'Tài liệu của A', type: 'link', url: 'https://a.example' }),
  })
  const created = await createRes.json()
  if (createRes.ok && created[0]?.id) ok('A tạo tài liệu (link) thành công')
  else { bad(`A tạo tài liệu lỗi: ${JSON.stringify(created).slice(0, 150)}`); throw new Error('create') }

  const aList = await (await fetch(`${url}/rest/v1/documents?select=id`, { headers: head(aT) })).json()
  aList.length === 1 ? ok('A đọc được tài liệu của mình') : bad(`A thấy ${aList.length} (mong 1)`)

  const bList = await (await fetch(`${url}/rest/v1/documents?select=id`, { headers: head(bT) })).json()
  Array.isArray(bList) && bList.length === 0 ? ok('B KHÔNG đọc được tài liệu của A') : bad(`B thấy dữ liệu của A!`)

  const forge = await fetch(`${url}/rest/v1/documents`, {
    method: 'POST', headers: head(bT),
    body: JSON.stringify({ title: 'giả mạo', type: 'link', url: 'https://x', user_id: A.id }),
  })
  forge.ok ? bad('LỖ HỔNG: B chèn được bản ghi với user_id = A!') : ok(`B KHÔNG giả mạo user_id được (HTTP ${forge.status})`)

  const cList = await (await fetch(`${url}/rest/v1/documents?select=id`, { headers: head(cT) })).json()
  Array.isArray(cList) && cList.length === 0 ? ok('ADMIN KHÔNG đọc được documents của USER') : bad('ADMIN đọc được documents!')

  // ---- Phần Storage: cách ly theo tiền tố user_id ----
  const aPath = `${A.id}/doc-test/a.txt`
  const upA = await fetch(`${url}/storage/v1/object/documents/${aPath}`, {
    method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${aT}`, 'Content-Type': 'text/plain' },
    body: 'noi dung cua A',
  })
  upA.ok ? ok('A upload tệp vào tiền tố của mình thành công') : bad(`A upload lỗi (HTTP ${upA.status})`)

  // B upload vào tiền tố của A → bị chặn
  const upBintoA = await fetch(`${url}/storage/v1/object/documents/${A.id}/hack/b.txt`, {
    method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${bT}`, 'Content-Type': 'text/plain' },
    body: 'B chen vao A',
  })
  upBintoA.ok ? bad('LỖ HỔNG: B upload được vào tiền tố của A!') : ok(`B KHÔNG upload vào tiền tố của A (HTTP ${upBintoA.status})`)

  // B đọc tệp trong tiền tố của A → bị chặn
  const readBofA = await fetch(`${url}/storage/v1/object/documents/${aPath}`, {
    headers: { apikey: anon, Authorization: `Bearer ${bT}` },
  })
  readBofA.ok ? bad('LỖ HỔNG: B đọc được tệp của A!') : ok(`B KHÔNG đọc được tệp của A (HTTP ${readBofA.status})`)

  // A đọc tệp của mình → OK
  const readAofA = await fetch(`${url}/storage/v1/object/documents/${aPath}`, {
    headers: { apikey: anon, Authorization: `Bearer ${aT}` },
  })
  readAofA.ok ? ok('A đọc được tệp của chính mình') : bad(`A KHÔNG đọc được tệp của mình (HTTP ${readAofA.status})`)

  // Dọn object của A bằng service_role (xóa qua REST admin)
  await fetch(`${url}/storage/v1/object/documents/${aPath}`, { method: 'DELETE', headers: svc })
} catch (e) {
  if (!['setup', 'create'].includes(e.message)) bad('Lỗi: ' + e.message)
} finally {
  for (const u of [A, B, C]) if (u?.id) await del(u.id)
  console.log('🧹 Đã xóa user test.')
}

console.log(pass ? '\n✅ CÁCH LY RLS + STORAGE DOCUMENTS ĐẠT.' : '\n❌ CÓ LỖ HỔNG.')
process.exit(pass ? 0 : 1)
