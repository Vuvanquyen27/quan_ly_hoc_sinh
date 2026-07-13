// Seed 2 gói Pro vào bảng plans qua service_role (upsert theo code). Không in khóa.
// Chạy: node --env-file=.env.local scripts/seed-plans.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || url.includes('REPLACE-ME') || !service || service.includes('REPLACE-ME')) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  process.exit(1)
}

const headers = {
  apikey: service,
  Authorization: `Bearer ${service}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
}

const plans = [
  { code: 'pro_monthly', name: 'Gói Pro (tháng)', description: 'Đầy đủ tính năng, thanh toán theo tháng', price: 99000, billing_cycle: 'monthly', sort_order: 1 },
  { code: 'pro_yearly', name: 'Gói Pro (năm)', description: 'Đầy đủ tính năng, thanh toán theo năm (tiết kiệm hơn)', price: 990000, billing_cycle: 'yearly', sort_order: 2 },
]

const res = await fetch(`${url}/rest/v1/plans?on_conflict=code`, {
  method: 'POST',
  headers,
  body: JSON.stringify(plans),
})

if (res.ok) {
  const rows = await res.json()
  console.log(`✅ Đã seed ${rows.length} gói:`)
  rows.forEach((r) => console.log(`   - ${r.code}: ${r.name} (${r.price} VND / ${r.billing_cycle})`))
} else {
  console.error(`❌ Seed lỗi HTTP ${res.status}:`, await res.text())
  process.exit(1)
}
