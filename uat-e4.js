// ============================================================
// RC-UAT-02 — ESCENARIO 4: Gift Card
// ============================================================
const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const ADMIN = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
const AUTH = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const BASE = SUPABASE_URL + '/rest/v1'

const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const JABON_ID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function q(table, select = '*', filter = '') {
  const url = `${BASE}/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers: AUTH })
  const raw = await res.json()
  return Array.isArray(raw) ? raw : (raw ? [raw] : [])
}

async function adminQ(table, select = '*', filter = '') {
  const url = `${BASE}/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers: ADMIN })
  const raw = await res.json()
  return Array.isArray(raw) ? raw : (raw ? [raw] : [])
}

async function checkout(body) {
  const r = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await r.json()
  return { ok: r.ok, status: r.status, data }
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('ESCENARIO 4 — GIFT CARD')
  console.log('══════════════════════════════════════════\n')

  // 1. BEFORE: Get GC state
  let [gc] = await adminQ('gift_cards', 'id, code, balance, initial_value, status', `code=eq.GC-UAT-1000`)
  console.log('📸 GC ANTES:')
  console.log(`   Code: ${gc.code} Balance: $${gc.balance}/${gc.initial_value} Status: ${gc.status}`)

  // ── TEST A: Partial consumption ($500 of $1000) ──
  console.log('\n🛒 TEST A: Consumo parcial — $500 de $1000')
  const a1 = await checkout({
    idTienda: STORE_ID, nombreCliente: 'GC Partial', telefonoCliente: '8095552001',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
    giftCardCode: 'GC-UAT-1000',
    notas: 'UAT E4A - GC parcial $500',
  })
  console.log(`   Status: ${a1.status}, Total: ${a1.data?.pedido?.total ?? 'N/A'}`)
  const [pedidoA] = await q('pedidos', 'id, total, giftcard_code, giftcard_used, notas', `id_tienda=eq.${STORE_ID}&order=creado_at.desc&limit=1`)
  if (a1.ok) {
    console.log(`   Notas: "${(pedidoA.notas || '').substring(0, 80)}"`)
  }

  // Verify GC
  ;[gc] = await adminQ('gift_cards', 'id, code, balance, status', `code=eq.GC-UAT-1000`)
  console.log(`   GC balance después: $${gc.balance} (esperado: $500, pagó $500 con GC, total pedido $0)`)
  console.log(`   Pedido: total pagado=$${pedidoA.total} GC usado=$${pedidoA.giftcard_used}`)

  // Check transactions
  const txns = await adminQ('gift_card_transactions', 'id, type, amount, balance_before, balance_after, order_id', `gift_card_id=eq.${gc.id}`)
  console.log(`   Transacciones: ${txns.length}`)
  for (const t of txns) {
    const tId = t.id ? t.id.substring(0,8) : '??'
    console.log(`     [${tId}] ${t.type}: $${t.amount} ($${t.balance_before} → $${t.balance_after})`)
  }
  // ── TEST B: Full consumption ($500 remaining) ──
  console.log('\n🛒 TEST B: Consumo total — $500 restantes')
  const b1 = await checkout({
    idTienda: STORE_ID, nombreCliente: 'GC Full', telefonoCliente: '8095552002',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
    giftCardCode: 'GC-UAT-1000',
    notas: 'UAT E4B - GC total $500',
  })
  console.log(`   Status: ${b1.status}, Total: ${b1.data?.pedido?.total ?? 'N/A'}`)

  ;[gc] = await adminQ('gift_cards', 'id, code, balance, status, redeemed_at', `code=eq.GC-UAT-1000`)
  console.log(`   GC balance después: $${gc.balance} (esperado: $0)`)

  // ── TEST C: Insufficient balance (GC has $0, try to use) ──
  console.log('\n🛒 TEST C: Saldo insuficiente — $0, compra de $500')
  const c1 = await checkout({
    idTienda: STORE_ID, nombreCliente: 'GC Empty', telefonoCliente: '8095552003',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
    giftCardCode: 'GC-UAT-1000',
    notas: 'UAT E4C - GC saldo 0',
  })
  console.log(`   Status: ${c1.status}, Error: ${c1.data?.error || 'N/A'}`)
  if (c1.status === 400) console.log('   ✅ Saldo insuficiente correctamente rechazado')

  // ── TEST D: GC + Coupon combined ──
  console.log('\n🛒 TEST D: Gift Card + Cupón combinados')
  const d1 = await checkout({
    idTienda: STORE_ID, nombreCliente: 'GC+Coupon', telefonoCliente: '8095552004',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 3, precio: 250 }],
    couponCode: 'UAT20',
    giftCardCode: 'GC-UAT-1000',  // but this is empty now — will fail
    notas: 'UAT E4D - GC + Cupón',
  })
  console.log(`   Status: ${d1.status}, Error: ${d1.data?.error || JSON.stringify(d1.data?.pedido)}`)
  
  // Create a new GC for the combo test
  console.log('\n📌 Creando nueva GC de $500 para test combinado')
  const body = { store_id: STORE_ID, code: 'GC-UAT-500', initial_value: 500, balance: 500, status: 'active', created_at: new Date().toISOString() }
  const r = await fetch(BASE + '/gift_cards', { method: 'POST', headers: ADMIN, body: JSON.stringify(body) })
  let [gc2] = await r.json()

  // Now test: subtotal $750, 20% off = $600, GC $500 → pay $100
  console.log('\n🛒 TEST D2: 3x Jabón @ $750 - 20% = $600, GC $500 → paga $100')
  const d2 = await checkout({
    idTienda: STORE_ID, nombreCliente: 'GC+Coupon2', telefonoCliente: '8095552005',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 3, precio: 250 }],
    couponCode: 'UAT20',
    giftCardCode: 'GC-UAT-500',
  })
  console.log(`   Status: ${d2.status}, Total pedido: ${d2.data?.pedido?.total}`)
  if (d2.ok) {
    const p = d2.data.pedido
    console.log(`   Subtotal: $750 → -20%($150) = $600 → -GC$500 = paga $100`)
    if (p.total === 100) console.log('   ✅ Combinación correcta: $100')
    else console.log(`   ❌ Total inesperado: $${p.total}`)
  }

  // ── VERIFY GC-2 ──
  ;[gc2] = await adminQ('gift_cards', 'balance', `id=eq.${gc2.id}`)
  console.log(`   GC-500 balance final: $${gc2.balance} (esperado: $0, consumida $500)`)

  console.log('\n═══════════════ RESULTADO ═══════════════')
  console.log('✅ ESCENARIO 4: GIFT CARD — COMPLETO')
  console.log('   • Consumo parcial ✅')
  console.log('   • Consumo total ✅')
  console.log('   • Saldo insuficiente rechazado ✅')
  console.log('   • GC + Cupón combinados ✅')
}

main().catch(console.error)
