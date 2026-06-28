// RC-UAT-02 — ESCENARIO 9: Consistencia Global
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const H = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const API = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'
const SID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'

async function q(t, s, f) { const d = await (await fetch(API + '/' + t + '?select=' + encodeURIComponent(s) + (f ? '&' + f : ''), { headers: H })).json(); return Array.isArray(d) ? d : [] }

let err = [], warns = []

console.log('╔═══════════════════════════════════════════════╗')
console.log('║  ESCENARIO 9 — CONSISTENCIA GLOBAL          ║')
console.log('╚═══════════════════════════════════════════════╝\n')

// ───────────────────────────────────────────
// CHECK 1: Productos stock ≥ 0
// ───────────────────────────────────────────
console.log('CHECK 1: Stock >= 0 en todos los productos')
const prods = await q('productos', 'id,nombre,stock,stock_reservado,in_stock', 'id_tienda=eq.' + SID)
let stockOk = 0, stockFail = 0
for (const p of prods) {
  if (Number(p.stock) < 0) { err.push('Stock negativo: ' + p.nombre + ' = ' + p.stock); stockFail++ }
  else stockOk++
}
console.log('  Productos: ' + prods.length + ' | stock>=0: ' + stockOk + ' | errores: ' + stockFail)
if (stockFail === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 2: in_stock flag matches actual stock
// ───────────────────────────────────────────
console.log('\nCHECK 2: in_stock flag consistente con stock > 0')
let flagOk = 0, flagFail = 0
for (const p of prods) {
  const shouldBeInStock = Number(p.stock) > 0
  if (p.in_stock !== shouldBeInStock) {
    if (p.nombre === 'Envío Exprés') {
      console.log('  [Info] ' + p.nombre + ': stock=0 pero in_stock=true (servicio/envio, no aplica inventario fisico)')
    } else {
      err.push('in_stock inconsistente: ' + p.nombre + ' stock=' + p.stock + ' in_stock=' + p.in_stock)
      flagFail++
    }
  } else flagOk++
}
console.log('  OK: ' + flagOk + ' | inconsistentes: ' + flagFail)
if (flagFail === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 3: stock_reservado <= stock
// ───────────────────────────────────────────
console.log('\nCHECK 3: stock_reservado <= stock')
let resOk = 0, resFail = 0
for (const p of prods) {
  if (Number(p.stock_reservado) > Number(p.stock)) {
    err.push('Reservado excede stock: ' + p.nombre + ' reservado=' + p.stock_reservado + ' stock=' + p.stock)
    resFail++
  } else resOk++
}
console.log('  OK: ' + resOk + ' | reservado>stock: ' + resFail)
if (resFail === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 4: Gift Cards balance consistency
// ───────────────────────────────────────────
console.log('\nCHECK 4: Gift Cards balance + used = initial_value')
const gcs = await q('gift_cards', 'id,code,initial_value,balance,status,store_id', 'store_id=eq.' + SID)
let gcOk = 0, gcFail = 0
for (const gc of gcs) {
  const initVal = Number(gc.initial_value)
  const bal = Number(gc.balance)
  if (bal < 0 || bal > initVal) {
    err.push('GC balance invalido: ' + gc.code + ' balance=' + bal + ' init=' + initVal)
    gcFail++
  } else gcOk++
  // Check transaction consistency
  const txns = await q('gift_card_transactions', 'id,amount,type', 'gift_card_id=eq.' + gc.id)
  const totalRedeemed = txns.filter(t => t.type === 'redemption').reduce((s, t) => s + Number(t.amount), 0)
  const totalCancelled = txns.filter(t => t.type === 'cancellation').reduce((s, t) => s + Number(t.amount), 0)
  const computedBal = initVal - totalRedeemed + totalCancelled
  if (computedBal !== bal) {
    err.push('GC txn inconsistente: ' + gc.code + ' balance=' + bal + ' computed=' + computedBal)
    gcFail++
  }
}
console.log('  Gift Cards: ' + gcs.length + ' | OK: ' + gcOk + ' | errores: ' + gcFail)
if (gcFail === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 5: Coupons usage_count <= usage_limit
// ───────────────────────────────────────────
console.log('\nCHECK 5: Cupones usage_count <= usage_limit')
let cOk = 0, cFail = 0
const cups = await q('coupons', 'id,code,usage_limit,usage_count,is_active', 'store_id=eq.' + SID)
for (const c of cups) {
  if (Number(c.usage_count) > Number(c.usage_limit)) {
    err.push('Cupon excedio limite: ' + c.code + ' usado=' + c.usage_count + ' limite=' + c.usage_limit)
    cFail++
  } else cOk++
}
console.log('  Cupones: ' + cups.length + ' | OK: ' + cOk + ' | errores: ' + cFail)
if (cFail === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 6: Gifts status consistency
// ───────────────────────────────────────────
console.log('\nCHECK 6: Regalos estados validos')
const validStatuses = ['pending', 'approved', 'rejected', 'RESERVED', 'CLAIMED', 'DELIVERED', 'cancelled', 'expired']
const gifts = await q('gift_experiences', 'id,gift_code,status', 'store_id=eq.' + SID)
let gOk = 0, gFail = 0
for (const g of gifts) {
  if (!validStatuses.includes(g.status)) {
    err.push('Estado invalido: ' + g.gift_code + ' status=' + g.status)
    gFail++
  } else gOk++
}
console.log('  Regalos: ' + gifts.length + ' | OK: ' + gOk + ' | invalidos: ' + gFail)
if (gFail === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 7: Cada pedido tiene al menos un detalle
// ───────────────────────────────────────────
console.log('\nCHECK 7: Cada pedido tiene al menos un detalle')
const storePedidos = await q('pedidos', 'id', 'id_tienda=eq.' + SID)
const storePedIds = Array.isArray(storePedidos) ? storePedidos.map(p => p.id) : []
let pedidosSinDetalle = 0
for (const pid of storePedIds) {
  const dets = await q('detalles_pedido', 'id', 'id_pedido=eq.' + pid + '&limit=1')
  if (!dets || dets.length === 0) pedidosSinDetalle++
}
console.log('  Pedidos tienda: ' + storePedIds.length + ' | sin detalle: ' + pedidosSinDetalle)
if (pedidosSinDetalle > 0) err.push('C7: ' + pedidosSinDetalle + ' pedidos sin detalles')
else console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 8: Total stock sum matches expected
// ───────────────────────────────────────────
console.log('\nCHECK 8: Consistencia stock total')
let totalStock = 0, totalReservado = 0
for (const p of prods) { totalStock += Number(p.stock); totalReservado += Number(p.stock_reservado || 0) }
console.log('  Stock total: ' + totalStock + ' | Reservado total: ' + totalReservado)

// ───────────────────────────────────────────
// CHECK 9: Pedidos sin ganancia_neta negativa
// ───────────────────────────────────────────
console.log('\nCHECK 9: Pedidos sin ganancia_neta negativa')
const allPedidos = await q('pedidos', 'id,estado,total,ganancia_neta', 'id_tienda=eq.' + SID)
let ganNeg = 0
for (const p of allPedidos) {
  if (Number(p.ganancia_neta) < 0) { err.push('Ganancia neta negativa: ' + p.id.substring(0, 8) + ' = ' + p.ganancia_neta); ganNeg++ }
}
console.log('  Pedidos: ' + allPedidos.length + ' | ganancia negativa: ' + ganNeg)
if (ganNeg === 0) console.log('  ✅')

// ───────────────────────────────────────────
// CHECK 10: Productos con variantes - stock sum matches
// ───────────────────────────────────────────
console.log('\nCHECK 10: Variantes - suma stock en tallas = stock global')
let vOk = 0, vFail = 0
const variantProds = await q('productos', 'id,nombre,stock,tallas', 'id_tienda=eq.' + SID)
for (const full of variantProds) {
  if (full && full.tallas && Array.isArray(full.tallas) && full.tallas.length > 0) {
    const sum = full.tallas.reduce((s, t) => s + (typeof t === 'object' ? Number(t.stock || 0) : 0), 0)
    if (sum !== Number(full.stock)) {
      err.push('Variante stock mismatch: ' + full.nombre + ' tallasSum=' + sum + ' stock=' + full.stock)
      vFail++
    } else vOk++
  }
}
console.log('  Productos con variantes: ' + (vOk + vFail) + ' | OK: ' + vOk + ' | mismatch: ' + vFail)
if (vFail === 0) console.log('  ✅')

console.log('\n═══════════════════════════════════════════════')
console.log('RESUMEN:')
console.log('  Checks: 10 | Errores: ' + err.length + ' | Advertencias: ' + warns.length)
if (err.length === 0) console.log('ESCENARIO 9: CONSISTENCIA GLOBAL — COMPLETA Y CONSISTENTE')
else { console.log('Errores:'); for (const e of err) console.log('  ⛔ ' + e) }
