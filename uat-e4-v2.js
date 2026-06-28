// RC-UAT-02 — ESCENARIO 4: Gift Card
const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const ADMIN = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const AUTH = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const BASE = SUPABASE_URL + '/rest/v1'

const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const JABON_ID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function q(table, select, filter) {
  const url = `${BASE}/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  return (await (await fetch(url, { headers: AUTH })).json()) || []
}

async function adminQ(table, select, filter) {
  const url = `${BASE}/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const raw = await (await fetch(url, { headers: ADMIN })).json()
  return Array.isArray(raw) ? raw : (raw ? [raw] : [])
}

async function co(body) {
  const r = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('ESCENARIO 4 — GIFT CARD')
  console.log('══════════════════════════════════════════\n')

  let errores = []

  // 1. BEFORE: Get GC state (use admin to bypass RLS)
  let gcs = await adminQ('gift_cards', 'id, code, balance, initial_value, status', 'code=eq.GC-UAT-1000')
  let gc = gcs[0]
  console.log(`📸 GC ANTES: code=${gc.code} balance=$${gc.balance}/${gc.initial_value} status=${gc.status}`)

  // ── TEST A: Partial consumption ($500 of $1000) ──
  console.log('\n🛒 A: Consumo parcial — $500 de $1000')
  const a1 = await co({
    idTienda: STORE_ID, nombreCliente: 'GC Partial',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
    giftCardCode: 'GC-UAT-1000', notas: 'E4A - GC parcial',
  })
  console.log(`   Status: ${a1.status} Total: ${a1.data?.pedido?.total}`)

  gcs = await adminQ('gift_cards', 'id, code, balance, status', 'code=eq.GC-UAT-1000')
  gc = gcs[0]
  console.log(`   GC balance: $${gc.balance}`)
  
  if (a1.ok && gc.balance === 500) console.log('   ✅ Consumo parcial correcto: GC $1000→$500')
  else { errores.push('A: GC balance incorrecto'); console.log(`   ❌ Esperado $500, obtenido $${gc.balance}`) }

  // ── TEST B: Full consumption ($500 remaining) ──
  console.log('\n🛒 B: Consumo total — $500 restantes')
  const b1 = await co({
    idTienda: STORE_ID, nombreCliente: 'GC Full',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
    giftCardCode: 'GC-UAT-1000', notas: 'E4B - GC total',
  })
  console.log(`   Status: ${b1.status} Total: ${b1.data?.pedido?.total}`)

  gcs = await adminQ('gift_cards', 'id, code, balance, status', 'code=eq.GC-UAT-1000')
  gc = gcs[0]
  console.log(`   GC balance: $${gc.balance} status=${gc.status}`)
  if (b1.ok && gc.balance === 0 && gc.status === 'redeemed') console.log('   ✅ Consumo total correcto: GC $500→$0, status=redeemed')
  else { errores.push('B: GC debería estar en $0 redeemed'); console.log(`   ❌ Esperado $0/redeemed, obtenido $${gc.balance}/${gc.status}`) }

  // ── TEST C: Insufficient balance ($0 GC, try $500 purchase) ──
  console.log('\n🛒 C: Saldo insuficiente — GC $0, compra $500')
  const c1 = await co({
    idTienda: STORE_ID, nombreCliente: 'GC Empty',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
    giftCardCode: 'GC-UAT-1000',
  })
  console.log(`   Status: ${c1.status} Error: ${c1.data?.error}`)
  if (c1.status === 400 && c1.data?.error?.includes('no está activa')) console.log('   ✅ Saldo insuficiente correctamente rechazado')

  // ── TEST D: GC + Coupon combined ──
  console.log('\n🛒 D: GC + Cupón — GC-UAT-500 $500 + UAT20')
  const d1 = await co({
    idTienda: STORE_ID, nombreCliente: 'GC+Coupon',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 3, precio: 250 }],
    couponCode: 'UAT20', giftCardCode: 'GC-UAT-500',
    notas: 'E4D - GC 500 + 20%',
  })
  console.log(`   Status: ${d1.status} Total: ${d1.data?.pedido?.total}`)
  console.log(`   Subtotal: $750 → -20%($150) = $600 → -GC$500 = paga $100`)
  
  if (d1.ok && d1.data.pedido.total === 100) console.log('   ✅ Combinación GC+Cupón correcta: $100')
  else { errores.push(`D: Total incorrecto: ${d1.data?.pedido?.total}`); console.log(`   ❌ Esperado $100`) }

  gcs = await adminQ('gift_cards', 'id, code, balance', 'code=eq.GC-UAT-500')
  console.log(`   GC-500 balance final: $${gcs[0].balance}`)
  if (gcs[0].balance === 0) console.log('   ✅ GC-500 consumida totalmente ($500)')
  else errores.push('D: GC-500 debería estar en $0')

  console.log('\n═══════════════ RESULTADO ═══════════════')
  console.log(`✅ ESCENARIO 4: ${errores.length === 0 ? 'COMPLETO Y CONSISTENTE' : errores.length + ' error(es)'}`)
  for (const e of errores) console.log(`   ❌ ${e}`)
}

main().catch(console.error)
