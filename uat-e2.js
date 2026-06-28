// ============================================================
// RC-UAT-02 — ESCENARIO 2: Compra con variantes
// ============================================================
const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const headers = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }

const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const VARIANT_PRODUCT_ID = 'ddf96427-8d0a-4a93-9a11-d55c3f667f8e'  // Camiseta Premium UAT

async function q(table, select = '*', filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers })
  const raw = await res.json()
  const data = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  return data
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('ESCENARIO 2 — COMPRA CON VARIANTES')
  console.log('══════════════════════════════════════════\n')

  // BEFORE: capture variant product state
  const [prod] = await q('productos', 'id, nombre, stock, stock_reservado, in_stock, tallas', `id=eq.${VARIANT_PRODUCT_ID}`)
  console.log('📸 STATE ANTES:')
  console.log(`   "${prod.nombre}" stock=${prod.stock} reservado=${prod.stock_reservado ?? 0}`)
  console.log(`   Tallas: ${JSON.stringify(prod.tallas)}`)

  const tallasAntes = JSON.parse(JSON.stringify(prod.tallas))
  const tallaM = tallasAntes.find(t => t.talla === 'M')
  const tallaL = tallasAntes.find(t => t.talla === 'L')
  console.log(`   Talla M: stock=${tallaM.stock} precio=${tallaM.precio ?? 'hereda($800)'} costo=${tallaM.costo}`)
  console.log(`   Talla L: stock={tallaL.stock} precio=${tallaL.precio} costo=${tallaL.costo}`)

  // ── PURCHASE 1: 2x Talla M @ $800 (hereda precio base) ──
  console.log('\n🛒 Compra 1: 2x Camiseta Premium (Talla M)')
  const r1 = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTienda: STORE_ID,
      nombreCliente: 'Ana Martínez',
      telefonoCliente: '8095555678',
      items: [{ id: VARIANT_PRODUCT_ID, nombre: 'Camiseta Premium UAT', cantidad: 2, precio: 800, variante_seleccionada: 'M' }],
      notas: 'UAT E2 - Variante M',
    }),
  })
  const res1 = await r1.json()
  console.log(`   Status: ${r1.status}, Order: ${res1.pedido?.id?.substring(0,8) ?? res1.error}`)
  
  // AFTER purchase 1
  const [p1] = await q('productos', 'id, nombre, stock, stock_reservado, in_stock, tallas', `id=eq.${VARIANT_PRODUCT_ID}`)
  const tallasP1 = JSON.parse(JSON.stringify(p1.tallas))
  const tallaMp1 = tallasP1.find(t => t.talla === 'M')
  const tallaLp1 = tallasP1.find(t => t.talla === 'L')
  const tallaSp1 = tallasP1.find(t => t.talla === 'S')

  console.log(`\n📊 Después compra 1: stock total=${p1.stock}`)
  console.log(`   S: ${tallaSp1.stock} (esperado: 8) M: ${tallaMp1.stock} (esperado: 5 = 7-2) L: ${tallaLp1.stock} (esperado: 5)`)

  const errores = []
  if (tallaMp1.stock !== 5) errores.push(`Compra 1: Talla M stock=${tallaMp1.stock}, esperado 5`)
  if (tallaSp1.stock !== 8) errores.push(`Compra 1: Talla S cambió incorrectamente a ${tallaSp1.stock}`)
  if (tallaLp1.stock !== 5) errores.push(`Compra 1: Talla L cambió incorrectamente a ${tallaLp1.stock}`)
  if (p1.stock !== 18) errores.push(`Compra 1: Stock total ${p1.stock}, esperado 18 (=20-2)`)
  
  if (errores.length === 0) console.log('   ✅ Compra 1 correcta: solo descontó Talla M')

  // ── PURCHASE 2: 1x Talla L @ $900 (precio específico de variante) ──
  console.log('\n🛒 Compra 2: 1x Camiseta Premium (Talla L) @ $900 (precio variante)')
  const r2 = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTienda: STORE_ID,
      nombreCliente: 'Pedro Sánchez',
      telefonoCliente: '8095559012',
      items: [{ id: VARIANT_PRODUCT_ID, nombre: 'Camiseta Premium UAT', cantidad: 1, precio: 900, variante_seleccionada: 'L' }],
      notas: 'UAT E2 - Variante L precio premium',
    }),
  })
  const res2 = await r2.json()
  console.log(`   Status: ${r2.status}, Order: ${res2.pedido?.id?.substring(0,8) ?? res2.error}, Total: ${res2.pedido?.total}`)

  // AFTER purchase 2
  const [p2] = await q('productos', 'id, nombre, stock, stock_reservado, in_stock, tallas', `id=eq.${VARIANT_PRODUCT_ID}`)
  const tallasP2 = JSON.parse(JSON.stringify(p2.tallas))
  const tallaLp2 = tallasP2.find(t => t.talla === 'L')

  console.log(`\n📊 Después compra 2: stock total=${p2.stock}`)
  console.log(`   L: ${tallaLp2.stock} (esperado: 4 = 5-1)`)

  if (tallaLp2.stock !== 4) errores.push(`Compra 2: Talla L stock=${tallaLp2.stock}, esperado 4`)
  if (res2.pedido?.total !== 900) errores.push(`Compra 2: Total=${res2.pedido?.total}, esperado 900 (precio variante L)`)

  // ── PURCHASE 3: Attempt oversell of variant ──
  console.log('\n🛒 Compra 3: 10x Talla M (intento de sobreventa, solo quedan 5)')
  const r3 = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTienda: STORE_ID,
      nombreCliente: 'Test Oversell',
      items: [{ id: VARIANT_PRODUCT_ID, nombre: 'Camiseta Premium UAT', cantidad: 10, precio: 800, variante_seleccionada: 'M' }],
    }),
  })
  const res3 = await r3.json()
  console.log(`   Status: ${r3.status}, Error: ${res3.error || 'ninguno'}`)
  if (r3.status === 409) {
    console.log('   ✅ Sobreventa correctamente rechazada')
  } else {
    errores.push(`Compra 3: Debió rechazar sobreventa (409), obtuvo ${r3.status}`)
  }

  // VERIFY stock_reservado never changed
  if (p2.stock_reservado !== 0) errores.push(`Stock reservado cambió: ${p2.stock_reservado}`)
  if (p2.in_stock !== true) errores.push(`in_stock cambió a false`)

  console.log('\n═══════════════ RESULTADO ═══════════════')
  if (errores.length === 0) {
    console.log('✅ ESCENARIO 2: COMPRA CON VARIANTES — COMPLETO Y CONSISTENTE')
  } else {
    console.log(`❌ ESCENARIO 2: ${errores.length} error(es):`)
    for (const e of errores) console.log(`   ❌ ${e}`)
  }
}

main().catch(console.error)
