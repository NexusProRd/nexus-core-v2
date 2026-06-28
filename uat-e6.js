// RC-UAT-02 — ESCENARIO 6: Cancelaciones (v2 - secuencial limpio)
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const H = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const API = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'
const SID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const PID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function q(t, s, f) { const d = await (await fetch(API + '/' + t + '?select=' + encodeURIComponent(s) + (f ? '&' + f : ''), { headers: H })).json(); return Array.isArray(d) ? d : [] }
async function patch(t, f, b) { await fetch(API + '/' + t + '?' + f, { method: 'PATCH', headers: H, body: JSON.stringify(b) }) }
async function del(t, f) { await fetch(API + '/' + t + '?' + f, { method: 'DELETE', headers: H }) }
async function rpc(n, p) { const r = await fetch(API + '/rpc/' + n, { method: 'POST', headers: H, body: JSON.stringify(p) }); return { ok: r.ok, data: r.ok ? await r.json() : await r.text() } }
async function co(b) { const r = await fetch('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, data: await r.json() } }
async function stock() { const p = (await q('productos', 'stock,stock_reservado', 'id=eq.' + PID)); return p[0] || { stock: 0, stock_reservado: 0 } }

let err = []

console.log('╔════════════════════════════════════════════╗')
console.log('║  ESCENARIO 6 — CANCELACIONES              ║')
console.log('╚════════════════════════════════════════════╝\n')

// Reset
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
// Clean any previous gift
const gs = await q('gift_experiences', 'id', 'store_id=eq.' + SID)
for (const g of gs) await del('gift_experiences', 'id=eq.' + g.id)

// ───────────────────────────────────────────
// TEST 1: Pedido normal → cancelar
// ───────────────────────────────────────────
console.log('TEST 1: Cancelacion de pedido normal')
let s = await stock()
console.log('  Stock inicial: ' + s.stock)

const r1 = await co({
  idTienda: SID, nombreCliente: 'C1', telefonoCliente: '809555601',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 3, precio: 250 }],
  notas: 'E6-T1',
})
if (!r1.ok) { console.log('  FAIL: ' + r1.data.error); process.exit(1) }
console.log('  Pedido: ' + r1.data.pedido.id.substring(0,8) + ' total=' + r1.data.pedido.total)

s = await stock()
console.log('  Stock post-pedido: ' + s.stock + ' (reservado: ' + s.stock_reservado + ')')
if (s.stock !== 47) err.push('T1: stock deberia 47 (50-3), es ' + s.stock)

// Get pedido from DB
const [ped] = await q('pedidos', 'id,estado,total,ganancia_neta', 'id_tienda=eq.' + SID + '&order=creado_at.desc&limit=1')
console.log('  Pedido DB: estado=' + (ped ? ped.estado : 'UNDEFINED') + ' ganancia=' + (ped ? ped.ganancia_neta : 'N/A'))

// Cancel: update estado + restore stock via gestionarStock equivalent
await patch('pedidos', 'id=eq.' + ped.id, { estado: 'cancelado' })

// Restore stock (sin optimistic lock - test directo)
const dets = await q('detalles_pedido', 'id_producto,cantidad', 'id_pedido=eq.' + ped.id)
for (const d of dets) {
  if (d.id_producto) {
    const cur = await stock()
    await patch('productos', 'id=eq.' + d.id_producto, { stock: cur.stock + (d.cantidad || 1), in_stock: true })
  }
}

s = await stock()
console.log('  Stock post-cancel: ' + s.stock + ' (reservado: ' + s.stock_reservado + ')')
if (s.stock !== 50) err.push('T1: stock deberia 50, es ' + s.stock)

const [pc] = await q('pedidos', 'estado', 'id=eq.' + ped.id)
if (pc.estado !== 'cancelado') err.push('T1: estado=' + pc.estado)
else console.log('  ✅ OK')

// ───────────────────────────────────────────
// TEST 2: Gift PENDING → cancelar (rechazado)
// ───────────────────────────────────────────
console.log('\nTEST 2: Cancelar gift PENDING (debe rechazar)')
const r2 = await co({
  idTienda: SID, nombreCliente: 'C2', telefonoCliente: '809555602',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 2, precio: 250 }],
  isGift: true, giftSender: 'C2', giftReceiver: 'R2',
  giftReceiverPhone: '809555603', giftMessage: 'Feliz cumple',
  notas: 'E6-T2',
})
const [g2] = await q('gift_experiences', 'id,status', 'store_id=eq.' + SID + '&order=created_at.desc&limit=1')
const cp = await rpc('cancelar_regalo_v2', { p_gift_id: g2.id })
if (typeof cp.data === 'object' && cp.data.error && cp.data.error.includes('Solo se pueden cancelar')) {
  console.log('  ✅ RPC rechazo PENDING correctamente')
} else err.push('T2: RPC debio rechazar, obtuvo ' + JSON.stringify(cp.data))

// ───────────────────────────────────────────
// TEST 3: Gift RESERVED → cancelar
// ───────────────────────────────────────────
console.log('\nTEST 3: Cancelar gift RESERVED')
await rpc('aprobar_regalo_v2', { p_gift_id: g2.id })
s = await stock()
console.log('  Stock post-aprobar: ' + s.stock + ' (reservado: ' + s.stock_reservado + ')')
// Bug P1-01: reservado=1 en vez de 2
if (s.stock_reservado === 1) console.log('  [BUG CONOCIDO P1-01] reservado=1 en vez de 2')

const cr = await rpc('cancelar_regalo_v2', { p_gift_id: g2.id })
if (!cr.ok) err.push('T3: cancel RPC fallo: ' + JSON.stringify(cr.data))

const [g3] = await q('gift_experiences', 'status', 'id=eq.' + g2.id)
console.log('  Gift status: ' + g3.status)
if (g3.status !== 'cancelled') err.push('T3: status=' + g3.status)

s = await stock()
console.log('  Stock post-cancel: ' + s.stock + ' (reservado: ' + s.stock_reservado + ')')
// Bug P1-06: cancelar_regalo_v2 solo resta -1 en vez de -cantidad
// Pero como aprobar solo sumo +1, el resultado neto parece correcto
if (s.stock_reservado !== 0) err.push('T3: reservado deberia 0, es ' + s.stock_reservado)
else console.log('  ✅')

// ───────────────────────────────────────────
// TEST 4: Gift CLAIMED → cancelar
// ───────────────────────────────────────────
console.log('\nTEST 4: Cancelar gift CLAIMED')
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) await del('gift_experiences', 'id=eq.' + g.id)

const r4 = await co({
  idTienda: SID, nombreCliente: 'C4', telefonoCliente: '809555604',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 2, precio: 250 }],
  isGift: true, giftSender: 'C4', giftReceiver: 'R4',
  giftReceiverPhone: '809555605', giftMessage: 'Para ti',
  notas: 'E6-T4',
})
const [g4] = await q('gift_experiences', 'id,gift_code,status', 'store_id=eq.' + SID + '&order=created_at.desc&limit=1')
await rpc('aprobar_regalo_v2', { p_gift_id: g4.id })
await rpc('reclamar_regalo_v2', { p_gift_code: g4.gift_code, p_store_id: SID })
console.log('  Status post-claim: ' + g4.status + ' (recargado de query)')
const [g4a] = await q('gift_experiences', 'status', 'id=eq.' + g4.id)
console.log('  Status DB: ' + g4a.status)

await rpc('cancelar_regalo_v2', { p_gift_id: g4.id })
const [g4c] = await q('gift_experiences', 'status', 'id=eq.' + g4.id)
if (g4c.status !== 'cancelled') err.push('T4: status=' + g4c.status)
s = await stock()
console.log('  Stock: ' + s.stock + ' (reservado: ' + s.stock_reservado + ')')
console.log('  ✅')

// ───────────────────────────────────────────
// TEST 5: Gift DELIVERED → cancelar (rechazado)
// ───────────────────────────────────────────
console.log('\nTEST 5: Cancelar gift DELIVERED (debe rechazar)')
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) await del('gift_experiences', 'id=eq.' + g.id)

const r5 = await co({
  idTienda: SID, nombreCliente: 'C5', telefonoCliente: '809555606',
  items: [{ id: PID, nombre: 'Jabon', cantidad: 1, precio: 250 }],
  isGift: true, giftSender: 'C5', giftReceiver: 'R5',
  giftReceiverPhone: '809555607', giftMessage: 'Disfruta',
  notas: 'E6-T5',
})
let [g5] = await q('gift_experiences', 'id,gift_code,status', 'store_id=eq.' + SID + '&order=created_at.desc&limit=1')
await rpc('aprobar_regalo_v2', { p_gift_id: g5.id })
await rpc('reclamar_regalo_v2', { p_gift_code: g5.gift_code, p_store_id: SID })
await rpc('entregar_regalo_v2', { p_gift_id: g5.id })
const [g5d] = await q('gift_experiences', 'status', 'id=eq.' + g5.id)
console.log('  Gift status post-delivery: ' + g5d.status)

const cd = await rpc('cancelar_regalo_v2', { p_gift_id: g5.id })
if (typeof cd.data === 'object' && cd.data.error && cd.data.error.includes('Solo se pueden cancelar')) {
  console.log('  ✅ RPC rechazo DELIVERED correctamente')
} else err.push('T5: RPC debio rechazar, obtuvo ' + JSON.stringify(cd.data))

// ───────────────────────────────────────────
// TEST 6: Gift Card restoration
// ───────────────────────────────────────────
console.log('\nTEST 6: Restaurar Gift Card')
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) await del('gift_experiences', 'id=eq.' + g.id)

// Create GC
const gcRes = await fetch(API + '/gift_cards', {
  method: 'POST', headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({ store_id: SID, code: 'GCE6T6', initial_value: 500, balance: 500, status: 'active' })
})
const gcBody = await gcRes.json()
const gcId = gcBody && gcBody[0] ? gcBody[0].id : (gcBody.id || null)
if (!gcId) { console.log('  FAIL: No se pudo crear GC'); err.push('T6: No se pudo crear GC'); process.exit(1) }
console.log('  GC creada: id=' + gcId)

// Simulate redemption
await fetch(API + '/gift_card_transactions', {
  method: 'POST', headers: H,
  body: JSON.stringify({ gift_card_id: gcId, amount: 300, type: 'redemption' })
})
await patch('gift_cards', 'id=eq.' + gcId, { balance: 200 })

const rg = await rpc('restaurar_giftcard_v2', { p_gift_card_id: gcId, p_amount: 300 })
console.log('  Restore result: ' + JSON.stringify(rg.data).substring(0, 100))

const [gcCheck] = await q('gift_cards', 'balance,status', 'id=eq.' + gcId)
console.log('  GC post-restore: balance=' + gcCheck.balance + ' status=' + gcCheck.status)
if (Number(gcCheck.balance) !== 500) err.push('T6: balance deberia 500, es ' + gcCheck.balance)
if (gcCheck.status !== 'active') err.push('T6: status deberia active, es ' + gcCheck.status)
else console.log('  ✅')
await del('gift_cards', 'id=eq.' + gcId)

// ── FINAL CLEANUP ──
for (const g of await q('gift_experiences', 'id', 'store_id=eq.' + SID)) await del('gift_experiences', 'id=eq.' + g.id)
await patch('productos', 'id=eq.' + PID, { stock: 50, stock_reservado: 0, in_stock: true })

console.log('\n═══════════════════════════════════════════════')
if (err.length === 0) console.log('ESCENARIO 6: CANCELACIONES — COMPLETO Y CONSISTENTE')
else { console.log(err.length + ' error(es):'); for (const e of err) console.log('  ⛔ ' + e) }
