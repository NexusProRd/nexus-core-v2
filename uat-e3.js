// ============================================================
// RC-UAT-02 — ESCENARIO 3: Compra con cupón
// ============================================================
const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const headers_auth = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }

const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const JABON_ID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function q(table, select = '*', filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers: headers_auth })
  const raw = await res.json()
  return Array.isArray(raw) ? raw : (raw ? [raw] : [])
}

async function createCoupon(code, type, value, minAmount = 0, limit = 10) {
  const url = `${SUPABASE_URL}/rest/v1/coupons`
  const body = {
    store_id: STORE_ID,
    code,
    discount_type: type,
    value,
    is_active: true,
    usage_limit: limit,
    usage_count: 0,
    min_purchase_amount: minAmount,
    created_at: new Date().toISOString(),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers_auth, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  console.log(`   Cupón creado: ${res.status} code=${code} type=${type} value=${value}`)
  return Array.isArray(data) ? data[0] : data
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('ESCENARIO 3 — COMPRA CON CUPÓN')
  console.log('══════════════════════════════════════════\n')

  // Coupons already created directly via Supabase admin API
  console.log('📌 CUPONES DE PRUEBA (pre-creados)')
  const cupones = await q('coupons', 'code, usage_count, usage_limit', 'store_id=eq.' + STORE_ID)
  for (const c of cupones) console.log(`   ${c.code}: usos=${c.usage_count}/${c.usage_limit}`)

  // 2. BEFORE state
  const [prodAntes] = await q('productos', 'id, stock, stock_reservado', `id=eq.${JABON_ID}`)
  const pedidosAntes = await q('pedidos', 'id, total, notas', `id_tienda=eq.${STORE_ID}`)
  console.log(`\n📸 ANTES: stock=${prodAntes.stock} reservado=${prodAntes.stock_reservado ?? 0} pedidos=${pedidosAntes.length}`)

  // 3. PURCHASE with percentage coupon: 4x Jabón @ $250 = $1000 - 20% = $800
  console.log('\n🛒 Compra 1: 4x Jabón Artesanal @ $250 con cupón UAT20 (20%)')
  const r1 = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTienda: STORE_ID,
      nombreCliente: 'Lucía Gómez',
      telefonoCliente: '8095551111',
      items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 4, precio: 250 }],
      couponCode: 'UAT20',
      notas: 'UAT E3 - Cupón 20%',
    }),
  })
  const res1 = await r1.json()
  console.log(`   Status: ${r1.status}`)
  console.log(`   Respuesta: ${JSON.stringify(res1)}`)
  
  if (r1.ok) {
    // 4. AFTER state
    const [prodDesp] = await q('productos', 'id, stock', `id=eq.${JABON_ID}`)
    const pedidosDesp = await q('pedidos', 'id, total, notas, giftcard_code, giftcard_used', `id_tienda=eq.${STORE_ID}&order=creado_at.desc`)
    const pedido = pedidosDesp[0]
    
    // Check coupon usage
    const [cupon] = await q('coupons', '*', `code=eq.UAT20`)
    
    console.log(`\n📊 DESPUÉS:`)
    console.log(`   Stock: ${prodAntes.stock} → ${prodDesp.stock} (-4)`)
    console.log(`   Pedido: total=${pedido.total}`)
    console.log(`   Notas: "${pedido.notas}"`)
    console.log(`   Cupón usos: ${cupon.usage_count}`)

    const errores = []
    const subtotal = 1000 // 4 x 250
    const descuentoPct = subtotal * 0.2 // 200
    const totalEsperado = subtotal - descuentoPct // 800
    
    if (prodDesp.stock !== prodAntes.stock - 4) errores.push(`Stock incorrecto: ${prodDesp.stock}, esperado ${prodAntes.stock - 4}`)
    if (pedido.total !== totalEsperado) errores.push(`Total incorrecto: ${pedido.total}, esperado ${totalEsperado} (1000 - 20%)`)
    if (cupon.usage_count !== 1) errores.push(`Uso de cupón: ${cupon.usage_count}, esperado 1`)
    
    console.log('\n═══════════════ RESULTADO CUPÓN % ═══════════════')
    if (errores.length === 0) {
      console.log('✅ Compra con cupón porcentual: correcto')
    } else {
      for (const e of errores) console.log(`   ❌ ${e}`)
    }

    // 5. PURCHASE with fixed coupon: 2x Jabón @ $250 = $500 - $50 = $450
    console.log('\n🛒 Compra 2: 2x Jabón Artesanal @ $250 con cupón UAT50 ($50 off)')
    const r2 = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idTienda: STORE_ID,
        nombreCliente: 'Roberto Díaz',
        items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 2, precio: 250 }],
        couponCode: 'UAT50',
        notas: 'UAT E3 - Cupón fijo $50',
      }),
    })
    const res2 = await r2.json()
    console.log(`   Status: ${r2.status}, Total: ${res2.pedido?.total}`)

    if (r2.ok) {
      const [cupon2] = await q('coupons', '*', `code=eq.UAT50`)
      console.log(`   Cupón UAT50 usos: ${cupon2.usage_count} (esperado: 1)`)
      if (cupon2.usage_count !== 1) errores.push(`Uso cupón fijo: ${cupon2.usage_count}`)
      if (res2.pedido?.total !== 450) errores.push(`Total cupón fijo: ${res2.pedido?.total}, esperado 450`)
    }

    // 6. Test min_purchase_amount: coupon requires min $200
    console.log('\n🛒 Compra 3: 1x Envío Exprés @ $350 con UAT50 (debe funcionar, >$200 min)')
    const ENVIO_ID = 'f5f8911b-b1dd-4af1-8e45-4164762d5876'
    const r3 = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idTienda: STORE_ID,
        nombreCliente: 'Test Min',
        items: [{ id: ENVIO_ID, nombre: 'Envío Exprés', cantidad: 1, precio: 350 }],
        couponCode: 'UAT50',
      }),
    })
    const res3 = await r3.json()
    if (r3.ok) {
      console.log(`   ✅ Aceptado: total=${res3.pedido?.total} (>$200 min)`)
    } else {
      console.log(`   Rechazado: ${res3.error}`)
    }

    // 7. Check coupon usage limit (UAT20 limit=5, we used 1, try to overshoot)
    console.log('\n🛒 Compra 4: Usar UAT20 5 veces más (debe rechazar tras llegar a límite)')
    for (let i = 0; i < 5; i++) {
      const r4 = await fetch('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idTienda: STORE_ID,
          nombreCliente: `Test ${i}`,
          items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 1, precio: 250 }],
          couponCode: 'UAT20',
        }),
      })
      const res4 = await r4.json()
      if (i < 4) {
        if (!r4.ok) console.log(`   Uso ${i+2}: ❌ Rechazado inesperadamente: ${res4.error}`)
      } else {
        // 5th extra use (total = 5 usage_count limit)
        console.log(`   Intento #6: ${r4.status} — ${r4.ok ? 'Aceptado (❌ debió rechazar)' : `Rechazado ✅: ${res4.error}`}`)
        if (r4.ok) errores.push('UAT20: Se excedió el límite de 5 usos')
      }
    }

    console.log('\n═══════════════ RESULTADO FINAL ═══════════════')
    if (errores.length === 0) {
      console.log('✅ ESCENARIO 3: COMPRA CON CUPÓN — COMPLETO Y CONSISTENTE')
    } else {
      console.log(`❌ ESCENARIO 3: ${errores.length} error(es):`)
      for (const e of errores) console.log(`   ❌ ${e}`)
    }
  } else {
    console.log(`❌ ESCENARIO 3: Falló creación de compra base: ${res1.error}`)
  }
}

main().catch(console.error)
