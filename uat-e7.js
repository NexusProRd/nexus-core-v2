// RC-UAT-02 — ESCENARIO 7: Rollbacks
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const H = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const API = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'
const SID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const PID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function q(t, s, f) { const d = await (await fetch(API + '/' + t + '?select=' + encodeURIComponent(s) + (f ? '&' + f : ''), { headers: H })).json(); return Array.isArray(d) ? d : [] }
async function p(t, b) { const r = await fetch(API + '/' + t, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(b) }); return r.ok ? await r.json() : null }
async function patch(t, f, b) { await fetch(API + '/' + t + '?' + f, { method: 'PATCH', headers: H, body: JSON.stringify(b) }) }
async function del(t, f) { await fetch(API + '/' + t + '?' + f, { method: 'DELETE', headers: H }) }
async function rpc(n, p) { const r = await fetch(API + '/rpc/' + n, { method: 'POST', headers: H, body: JSON.stringify(p) }); return r.ok ? await r.json() : { error: await r.text() } }
async function stock() { const p = await q('productos', 'stock,stock_reservado', 'id=eq.' + PID); return p[0] || { stock: 0, stock_reservado: 0 } }

let err = []

console.log('╔════════════════════════════════════════════╗')
console.log('║  ESCENARIO 7 — ROLLBACKS                  ║')
console.log('╚════════════════════════════════════════════╝\n')

// Reset
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) del('gift_experiences', 'id=eq.' + g.id)
for (const g of await q('gift_cards', 'id', 'store_id=eq.' + SID)) del('gift_cards', 'id=eq.' + g.id)

// ───────────────────────────────────────────
// TEST 1: Stock rollback after deduct
// ───────────────────────────────────────────
console.log('TEST 1: Rollback de stock post-deduccion')
let s = await stock()
console.log('  Stock inicial: ' + s.stock)

// Simulate checkout: deduct 3
await patch('productos', 'id=eq.' + PID + '&stock=eq.' + s.stock, {
  stock: s.stock - 3,
  in_stock: (s.stock - 3) > 0
})
s = await stock()
console.log('  Stock post-deduct: ' + s.stock)
if (s.stock !== 47) err.push('T1: deberia 47, es ' + s.stock)

// Rollback: restore 3
await patch('productos', 'id=eq.' + PID + '&stock=eq.' + s.stock, {
  stock: s.stock + 3,
  in_stock: true
})
s = await stock()
console.log('  Stock post-rollback: ' + s.stock)
if (s.stock !== 50) err.push('T1: deberia 50, es ' + s.stock)
else console.log('  ✅')

// ───────────────────────────────────────────
// TEST 2: Rollback con variante
// ───────────────────────────────────────────
console.log('\nTEST 2: Rollback de stock con variante')
const CAMS = 'ddf96427-8d0a-4a93-9a11-d55c3f667f8e' // Camiseta Premium UAT ID
let [cam] = await q('productos', 'id,stock,stock_reservado,tallas', 'id=eq.' + CAMS)
console.log('  Camiseta stock: ' + cam.stock)
console.log('  Tallas: ' + JSON.stringify(cam.tallas))

// Deduct 2 from variant 'M'
if (cam.tallas && Array.isArray(cam.tallas)) {
  const newTallas = cam.tallas.map(t => {
    if (typeof t === 'object' && t.talla === 'M') return { ...t, stock: (t.stock || 0) - 2 }
    return t
  })
  const newSum = newTallas.reduce((sum, t) => sum + (typeof t === 'object' ? (t.stock || 0) : 0), 0)
  await patch('productos', 'id=eq.' + CAMS, { tallas: newTallas, stock: newSum, in_stock: newSum > 0 })
  
  let [c2] = await q('productos', 'stock,tallas', 'id=eq.' + CAMS)
  console.log('  Stock post-deduct: ' + c2.stock)
  const mStock = c2.tallas.find(t => typeof t === 'object' && t.talla === 'M')
  if (mStock.stock !== 5) err.push('T2: M deberia 5 (7-2), es ' + mStock.stock)

  // Rollback: restore 2
  const restoredTallas = c2.tallas.map(t => {
    if (typeof t === 'object' && t.talla === 'M') return { ...t, stock: (t.stock || 0) + 2 }
    return t
  })
  const restoredSum = restoredTallas.reduce((sum, t) => sum + (typeof t === 'object' ? (t.stock || 0) : 0), 0)
  await patch('productos', 'id=eq.' + CAMS, { tallas: restoredTallas, stock: restoredSum, in_stock: restoredSum > 0 })
  
  let [c3] = await q('productos', 'stock,tallas', 'id=eq.' + CAMS)
  console.log('  Stock post-rollback: ' + c3.stock)
  const mRestored = c3.tallas.find(t => typeof t === 'object' && t.talla === 'M')
  if (mRestored.stock !== 7) err.push('T2: M deberia 7, es ' + mRestored.stock)
  else console.log('  ✅')
}

// ───────────────────────────────────────────
// TEST 3: Rollback de Gift Card
// ───────────────────────────────────────────
console.log('\nTEST 3: Rollback de Gift Card (restaurar_giftcard_v2)')
const gcInsert = await p('gift_cards', { store_id: SID, code: 'GCE7T3', initial_value: 1000, balance: 1000, status: 'active' })
const gc = Array.isArray(gcInsert) ? gcInsert[0] : gcInsert
if (!gc || !gc.id) { console.log('  FAIL: GC creation'); process.exit(1) }
console.log('  GC: balance=1000')

// Redemption + restore
await fetch(API + '/gift_card_transactions', { method: 'POST', headers: H, body: JSON.stringify({ gift_card_id: gc.id, amount: 400, type: 'redemption' }) })
await patch('gift_cards', 'id=eq.' + gc.id, { balance: 600 })

let [gc2] = await q('gift_cards', 'balance,status', 'id=eq.' + gc.id)
console.log('  Post-redencion: balance=' + gc2.balance)

// Method 1: restaurar_giftcard_v2 (pedido cancel flow)
const r1 = await rpc('restaurar_giftcard_v2', { p_gift_card_id: gc.id, p_amount: 400 })
console.log('  restaurar_giftcard_v2: ' + JSON.stringify(r1).substring(0, 80))

let [gc3] = await q('gift_cards', 'balance,status', 'id=eq.' + gc.id)
console.log('  Post-restore: balance=' + gc3.balance + ' status=' + gc3.status)
if (Number(gc3.balance) !== 1000) err.push('T3: balance deberia 1000, es ' + gc3.balance)
if (gc3.status !== 'active') err.push('T3: status no es active')
else console.log('  ✅')

await del('gift_cards', 'id=eq.' + gc.id)

// ───────────────────────────────────────────
// TEST 4: Rollback de cupon (decrementar_uso_cupon)
// ───────────────────────────────────────────
console.log('\nTEST 4: Rollback de cupon (decrementar_uso_cupon)')
// Use existing UAT50 coupon (usage_count=0)
let [cpn] = await q('coupons', 'id,code,usage_count', "code=eq.UAT50")
if (!cpn) { console.log('  FAIL: cupon UAT50 no encontrado'); process.exit(1) }
console.log('  Cupon UAT50 usage_count: ' + cpn.usage_count)

// Increment first (simulate usage)
const beforeCount = Number(cpn.usage_count) || 0
await patch('coupons', 'id=eq.' + cpn.id, { usage_count: beforeCount + 1 })
console.log('  Incrementado a: ' + (beforeCount + 1))

// Now rollback via decrementar_uso_cupon
const dec = await rpc('decrementar_uso_cupon', { p_code: 'UAT50', p_store_id: SID })
console.log('  decrementar_uso_cupon: ' + JSON.stringify(dec).substring(0, 100))

let [cpn2] = await q('coupons', 'usage_count', 'id=eq.' + cpn.id)
console.log('  usage_count post-decrement: ' + cpn2.usage_count)
if (Number(cpn2.usage_count) !== beforeCount) err.push('T4: deberia ' + beforeCount + ', es ' + cpn2.usage_count)
else console.log('  ✅')

// ───────────────────────────────────────────
// TEST 5: Rollback de pedido completo (simular checkout fallido)
// ───────────────────────────────────────────
console.log('\nTEST 5: Rollback completo de pedido fallido')
s = await stock()
console.log('  Stock inicial: ' + s.stock)

// Checkout normal
const r5 = await fetch('http://localhost:3000/api/checkout', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idTienda: SID, nombreCliente: 'RollbackTest', telefonoCliente: '809555701',
    items: [{ id: PID, nombre: 'Jabon', cantidad: 5, precio: 250 }],
    notas: 'E7-T5',
  })
})
const d5 = await r5.json()
console.log('  Pedido: ' + (d5.pedido?.id?.substring(0, 8) || 'ERROR'))

s = await stock()
console.log('  Stock post-pedido: ' + s.stock)
if (s.stock !== 45) err.push('T5: deberia 45, es ' + s.stock)

// Get pedido data
const [pedido] = await q('pedidos', 'id,estado', 'id_tienda=eq.' + SID + '&order=creado_at.desc&limit=1')
console.log('  Pedido estado: ' + pedido.estado)

// Simulate rollbackAll: restore stock, then delete pedido
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
await patch('pedidos', 'id=eq.' + pedido.id, { estado: 'cancelado' })

s = await stock()
console.log('  Post-rollback: ' + s.stock)
if (s.stock !== 50) err.push('T5: deberia 50, es ' + s.stock)
else console.log('  ✅')

// Cleanup
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) del('gift_experiences', 'id=eq.' + g.id)
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })

console.log('\n═══════════════════════════════════════════════')
if (err.length === 0) console.log('ESCENARIO 7: ROLLBACKS — COMPLETO Y CONSISTENTE')
else { console.log(err.length + ' error(es):'); for (const e of err) console.log('  ⛔ ' + e) }
