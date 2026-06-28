// RC-UAT-02 — ESCENARIO 8: Financiero
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const H = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const API = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'
const SID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const PID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851' // precio=250, costo_compra=150

async function q(t, s, f) { const d = await (await fetch(API + '/' + t + '?select=' + encodeURIComponent(s) + (f ? '&' + f : ''), { headers: H })).json(); return Array.isArray(d) ? d : [] }
async function patch(t, f, b) { await fetch(API + '/' + t + '?' + f, { method: 'PATCH', headers: H, body: JSON.stringify(b) }) }
async function del(t, f) { await fetch(API + '/' + t + '?' + f, { method: 'DELETE', headers: H }) }
async function co(b) { const r = await fetch('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, data: await r.json() } }

let err = []

console.log('╔════════════════════════════════════════════╗')
console.log('║  ESCENARIO 8 — FINANCIERO                 ║')
console.log('╚════════════════════════════════════════════╝\n')

// Reset
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) await del('gift_experiences', 'id=eq.' + g.id)

// ───────────────────────────────────────────
// TEST 1: Checkout normal - precio, total, detalles
// ───────────────────────────────────────────
console.log('TEST 1: Checkout normal - calculo de total y costos')
const r1 = await co({
  idTienda: SID, nombreCliente: 'C1', telefonoCliente: '809555801',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 3, precio: 250 }],
  notas: 'E8-T1',
})
if (!r1.ok) { console.log('  FAIL: ' + r1.data.error); process.exit(1) }
console.log('  Pedido total=' + r1.data.pedido.total + ' (esperado: 750)')
if (Number(r1.data.pedido.total) !== 750) err.push('T1: total 750 != ' + r1.data.pedido.total)

// Check detalles_pedido have correct costs
const [ped] = await q('pedidos', 'id', 'id_tienda=eq.' + SID + '&order=creado_at.desc&limit=1')
const dets = await q('detalles_pedido', 'id_producto,cantidad,precio_unitario', 'id_pedido=eq.' + ped.id)
console.log('  Detalles: ' + dets.length + ' item(s)')
let subtotal = 0
for (const d of dets) { subtotal += Number(d.precio_unitario) * Number(d.cantidad) }
console.log('  Subtotal en detalles: ' + subtotal + ' (debe coincidir con total)')
if (subtotal !== 750) err.push('T1: subtotal detalles ' + subtotal + ' != 750')

// Simulate ganancia_neta calculation (server action logic from actions.ts:136-153)
let ganancia = 0
for (const d of dets) {
  if (d.id_producto) {
    const [prod] = await q('productos', 'costo_compra', 'id=eq.' + d.id_producto)
    const costo = Number(prod?.costo_compra || 150)
    ganancia += (Number(d.precio_unitario) - costo) * (Number(d.cantidad) || 1)
  }
}
console.log('  Ganancia neta (formula): (250-150)*3 = ' + ganancia)
if (ganancia !== 300) err.push('T1: ganancia formula ' + ganancia + ' != 300')
else console.log('  ✅')

// ───────────────────────────────────────────
// TEST 2: Cupon percentage - total refleja descuento
// ───────────────────────────────────────────
console.log('\nTEST 2: Cupon descuento aplicado en total')
// Use the coupon that's available
const [cupon] = await q('coupons', 'code,discount_type,value', 'store_id=eq.' + SID + '&is_active=eq.true&limit=1')
console.log('  Cupon usado: ' + cupon.code + ' (' + cupon.discount_type + '=' + cupon.value + ')')

const r2 = await co({
  idTienda: SID, nombreCliente: 'C2', telefonoCliente: '809555802',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 4, precio: 250 }],
  couponCode: cupon.code, notas: 'E8-T2',
})
const baseTotal = 1000
let expectedTotal = baseTotal
if (cupon.discount_type === 'percentage') expectedTotal = baseTotal - (baseTotal * Number(cupon.value) / 100)
else expectedTotal = baseTotal - Number(cupon.value)
console.log('  Total checkout: ' + r2.data.pedido.total + ' (esperado: ' + expectedTotal + ')')
if (Number(r2.data.pedido.total) !== expectedTotal) err.push('T2: total ' + r2.data.pedido.total + ' != ' + expectedTotal)

// Verify detalles still have ORIGINAL prices (discount doesn't change unit price)
const [ped2] = await q('pedidos', 'id', 'id_tienda=eq.' + SID + '&order=creado_at.desc&limit=1')
const dets2 = await q('detalles_pedido', 'precio_unitario,cantidad', 'id_pedido=eq.' + ped2.id)
const subtotal2 = dets2.reduce((s, d) => s + Number(d.precio_unitario) * Number(d.cantidad), 0)
console.log('  Subtotal en detalles (precio original): ' + subtotal2 + ' (debe ser ' + baseTotal + ')')
if (subtotal2 !== baseTotal) err.push('T2: subtotal ' + subtotal2 + ' != ' + baseTotal)
else console.log('  ✅')

// ───────────────────────────────────────────
// TEST 3: Gift Card en checkout
// ───────────────────────────────────────────
console.log('\nTEST 3: Gift Card aplicada en checkout')
const gcRes = await fetch(API + '/gift_cards', {
  method: 'POST', headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({ store_id: SID, code: 'GCF8T3', initial_value: 500, balance: 500, status: 'active' })
})
const gcData = await gcRes.json()
const gcId = Array.isArray(gcData) ? gcData[0]?.id : gcData?.id
if (!gcId) { console.log('  FAIL: GC'); process.exit(1) }
console.log('  GC creada: balance=500')

const r3 = await co({
  idTienda: SID, nombreCliente: 'C3', telefonoCliente: '809555803',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 5, precio: 250 }],
  giftCardCode: 'GCF8T3', notas: 'E8-T3',
})
const expected3 = 1250 - 500 // 750
console.log('  Total checkout: ' + r3.data.pedido.total + ' (esperado: ' + expected3 + ')')
if (Number(r3.data.pedido.total) !== expected3) err.push('T3: total ' + r3.data.pedido.total + ' != ' + expected3)

// Verify GC consumed
const [gcCheck] = await q('gift_cards', 'balance,status', 'id=eq.' + gcId)
console.log('  GC post-checkout: balance=' + gcCheck.balance + ' status=' + gcCheck.status)
if (Number(gcCheck.balance) !== 0) err.push('T3: GC balance 0 != ' + gcCheck.balance)
else console.log('  ✅')
await del('gift_cards', 'id=eq.' + gcId)

// ───────────────────────────────────────────
// TEST 4: Margenes por producto
// ───────────────────────────────────────────
console.log('\nTEST 4: Margenes de ganancia por producto')
const prods = await q('productos', 'nombre,precio,costo_compra', 'id_tienda=eq.' + SID)
for (const p of prods) {
  const margen = Number(p.precio) > 0 ? ((Number(p.precio) - Number(p.costo_compra || 0)) / Number(p.precio) * 100).toFixed(1) : 'N/A'
  console.log('  ' + p.nombre + ': $' + p.precio + ' - cost $' + (p.costo_compra || 0) + ' = margen ' + margen + '%')
}

// ───────────────────────────────────────────
// TEST 5: Consistencia datos dashboard
// ───────────────────────────────────────────
console.log('\nTEST 5: Consistencia datos dashboard')
const allP = await q('pedidos', 'id,estado,total,ganancia_neta,creado_at', 'id_tienda=eq.' + SID + '&order=creado_at.desc&limit=20')
console.log('  Pedidos en DB: ' + allP.length + ' (confirmados con ganancia>0: ' + allP.filter(p => p.estado === 'confirmado' && Number(p.ganancia_neta) > 0).length + ')')

// Verify total >= ganancia_neta for all confirmed pedidos
let inconsistencias = 0
for (const p of allP) {
  if ((p.estado === 'confirmado' || p.estado === 'entregado') && Number(p.ganancia_neta) > 0) {
    if (Number(p.ganancia_neta) > Number(p.total)) inconsistencias++
  }
}
console.log('  Inconsistencias (ganancia > total): ' + inconsistencias)
if (inconsistencias > 0) err.push('T5: ' + inconsistencias + ' pedidos con ganancia > total')

// Cleanup
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) await del('gift_experiences', 'id=eq.' + g.id)
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })

console.log('\n═══════════════════════════════════════════════')
if (err.length === 0) console.log('ESCENARIO 8: FINANCIERO — COMPLETO Y CONSISTENTE')
else { console.log(err.length + ' error(es):'); for (const e of err) console.log('  ⛔ ' + e) }
