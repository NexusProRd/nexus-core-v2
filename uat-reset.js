const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const ADMIN = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const BASE = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'

async function main() {
  // Delete old transactions and GCs
  await fetch(BASE + '/gift_card_transactions?gift_card_id=not.is.null', { method: 'DELETE', headers: ADMIN })
  await fetch(BASE + '/gift_cards?store_id=eq.ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb', { method: 'DELETE', headers: ADMIN })

  // Create fresh GC: $1000
  const body = { store_id: 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb', code: 'GC-UAT-1000', initial_value: 1000, balance: 1000, status: 'active', created_at: new Date().toISOString() }
  const r = await fetch(BASE + '/gift_cards', { method: 'POST', headers: { ...ADMIN, 'Prefer': 'return=representation' }, body: JSON.stringify(body) })
  const d = await r.json()
  const gcId = Array.isArray(d) ? d[0]?.id : null
  console.log('GC-UAT-1000:', r.status, gcId)

  // Create a second GC: $500 for combo test
  const body2 = { store_id: 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb', code: 'GC-UAT-500', initial_value: 500, balance: 500, status: 'active', created_at: new Date().toISOString() }
  const r2 = await fetch(BASE + '/gift_cards', { method: 'POST', headers: { ...ADMIN, 'Prefer': 'return=representation' }, body: JSON.stringify(body2) })
  const d2 = await r2.json()
  console.log('GC-UAT-500:', r2.status)

  // Check current stock
  const headers = { 'apikey': 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P', 'Authorization': 'Bearer sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P' }
  const r3 = await fetch(BASE + '/productos?id_tienda=eq.ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb&select=nombre,stock,in_stock', { headers })
  const prods = await r3.json()
  for (const p of prods) console.log(`   ${p.nombre}: stock=${p.stock} in_stock=${p.in_stock}`)
}

main().catch(console.error)
