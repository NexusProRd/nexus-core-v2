// RC-UAT-02 — ESCENARIO 5: Gift Lifecycle
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const ADMIN_H = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const AUTH_H = { 'apikey': 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P', 'Authorization': 'Bearer sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P' }
const SUPABASE = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'
const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const JABON_ID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function q(table, select, filter, admin = false) {
  const url = `${SUPABASE}/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const raw = await (await fetch(url, { headers: admin ? ADMIN_H : AUTH_H })).json()
  return Array.isArray(raw) ? raw : (raw ? [raw] : [])
}

async function rpc(name, params) {
  const res = await fetch(`${SUPABASE}/rpc/${name}`, { method: 'POST', headers: ADMIN_H, body: JSON.stringify(params) })
  const data = res.ok ? await res.json() : await res.text()
  return { ok: res.ok, status: res.status, data }
}

async function co(body) {
  const r = await fetch('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

async function main() {
  let errores = []
  console.log('══════════════════════════════════════════')
  console.log('ESCENARIO 5 — REGALOS (GIFT LIFECYCLE)')
  console.log('══════════════════════════════════════════\n')

  // ── STEP 1: Create gift via checkout (gift mode) ──
  console.log('📌 PASO 1: CREAR REGALO (checkout modo regalo)')
  const r1 = await co({
    idTienda: STORE_ID, nombreCliente: 'Juan Regalador', telefonoCliente: '8095553001',
    items: [{ id: JABON_ID, nombre: 'Jabón Artesanal', cantidad: 3, precio: 250 }],
    isGift: true,
    giftSender: 'Juan Regalador', giftReceiver: 'María Regalada',
    giftReceiverPhone: '8095553002', giftMessage: 'Feliz cumpleaños María!',
    notas: 'E5 - Crear regalo',
  })
  let giftCode = ''
  if (!r1.ok) { console.log(`❌ Falló creación: ${r1.data.error}`); return }
  console.log(`   ✅ Pedido creado: ${r1.data.pedido.id.substring(0,8)} total=${r1.data.pedido.total}`)

  // Find the gift that was created
  let gifts = await q('gift_experiences', 'id,gift_code,status,sender_name,receiver_name,items_list,store_id,created_at', `store_id=eq.${STORE_ID}&order=created_at.desc&limit=1`)
  let gift = gifts[0]
  giftCode = gift.gift_code
  console.log(`   🎁 Regalo creado: code=${giftCode} status=${gift.status} from=${gift.sender_name} to=${gift.receiver_name}`)

  // Check stock: gift purchases use DEDUCT, not reserve
  let [prod] = await q('productos', 'nombre,stock,stock_reservado,in_stock', `id=eq.${JABON_ID}`)
  console.log(`   Stock Jabón: ${prod.stock} (reservado: ${prod.stock_reservado})`)
  if (gift.status !== 'pending') errores.push(`1: Status debería ser "pending", es "${gift.status}"`)

  // ── STEP 2: Approve gift → status='approved', stock_reservado += qty ──
  console.log('\n📌 PASO 2: APROBAR REGALO')
  if (!gift?.id) { console.log('   ❌ No hay gift ID'); return }
  const r2 = await rpc('aprobar_regalo_v2', { p_gift_id: gift.id })
  console.log(`   RPC status: ${r2.status}, data: ${JSON.stringify(r2.data).substring(0,200)}`)

  gifts = await q('gift_experiences', 'id,gift_code,status', `id=eq.${gift.id}`, true)
  gift = gifts[0]
  console.log(`   Gift status: ${gift.status}`)

  ;[prod] = await q('productos', 'nombre,stock,stock_reservado', `id=eq.${JABON_ID}`, true)
  console.log(`   Stock Jabón: ${prod.stock} (reservado: ${prod.stock_reservado})`)
  if (gift.status !== 'approved') errores.push(`2: Status debería ser "approved", es "${gift.status}"`)
  if (prod.stock_reservado !== 3) errores.push(`2: stock_reservado debería ser 3, es ${prod.stock_reservado}`)

  // ── STEP 3: Claim gift → status='CLAIMED' ──
  console.log('\n📌 PASO 3: RECLAMAR REGALO')
  const r3 = await rpc('reclamar_regalo_v2', { p_gift_code: giftCode, p_store_id: STORE_ID })
  console.log(`   RPC status: ${r3.status}, data: ${JSON.stringify(r3.data).substring(0,200)}`)

  gifts = await q('gift_experiences', 'id,gift_code,status', `id=eq.${gift.id}`, true)
  gift = gifts[0]
  console.log(`   Gift status: ${gift.status}`)
  if (gift.status !== 'CLAIMED') errores.push(`3: Status debería ser "CLAIMED", es "${gift.status}"`)

  // ── STEP 4: Deliver gift → status='DELIVERED', stock_reservado--, stock-- ──
  console.log('\n📌 PASO 4: ENTREGAR REGALO')
  const r4 = await rpc('entregar_regalo_v2', { p_gift_id: gift.id })
  console.log(`   RPC status: ${r4.status}, data: ${JSON.stringify(r4.data).substring(0,200)}`)

  gifts = await q('gift_experiences', 'id,gift_code,status', `id=eq.${gift.id}`, true)
  gift = gifts[0]
  console.log(`   Gift status: ${gift.status}`)

  ;[prod] = await q('productos', 'nombre,stock,stock_reservado', `id=eq.${JABON_ID}`, true)
  console.log(`   Stock Jabón: ${prod.stock} (reservado: ${prod.stock_reservado})`)
  if (gift.status !== 'DELIVERED') errores.push(`4: Status debería ser "DELIVERED", es "${gift.status}"`)
  if (prod.stock_reservado !== 0) errores.push(`4: stock_reservado debería ser 0, es ${prod.stock_reservado}`)

  // ── STEP 5: Revert delivery → back to CLAIMED, stock restored ──
  console.log('\n📌 PASO 5: REVERTIR ENTREGA')
  const r5 = await rpc('revertir_entrega_regalo_v2', { p_gift_id: gift.id })
  console.log(`   RPC status: ${r5.status}, data: ${JSON.stringify(r5.data).substring(0,200)}`)

  gifts = await q('gift_experiences', 'id,gift_code,status', `id=eq.${gift.id}`, true)
  gift = gifts[0]
  console.log(`   Gift status: ${gift.status}`)

  ;[prod] = await q('productos', 'nombre,stock,stock_reservado', `id=eq.${JABON_ID}`, true)
  console.log(`   Stock Jabón: ${prod.stock} (reservado: ${prod.stock_reservado})`)
  if (gift.status !== 'CLAIMED') errores.push(`5: Status debería ser "CLAIMED", es "${gift.status}"`)

  // ── STEP 6: Convert to Gift Card ──
  console.log('\n📌 PASO 6: CONVERTIR REGALO A GIFT CARD')
  const r6 = await rpc('convertir_regalo_a_giftcard_v2', { p_gift_id: gift.id })
  console.log(`   RPC status: ${r6.status}, data: ${JSON.stringify(r6.data).substring(0,200)}`)

  gifts = await q('gift_experiences', 'id,gift_code,status', `id=eq.${gift.id}`, true)
  gift = gifts[0]
  console.log(`   Gift status: ${gift.status}`)

  // Check if a gift card was created
  const gcs = await q('gift_cards', 'id,code,balance,initial_value,original_gift_id,status', `original_gift_id=eq.${gift.id}`, true)
  console.log(`   Gift Cards from conversion: ${gcs.length}`)
  for (const g of gcs) console.log(`     ${g.code}: balance=$${g.balance}/${g.initial_value} status=${g.status}`)

  if (gift.status !== 'CONVERTED') errores.push(`6: Status debería ser "CONVERTED", es "${gift.status}"`)
  if (gcs.length === 0) errores.push('6: No se creó ninguna Gift Card')
  else if (gcs[0].balance !== 750) errores.push(`6: GC balance debería ser $750 (3×$250), es $${gcs[0].balance}`)

  console.log('\n═══════════════ RESULTADO ═══════════════')
  if (errores.length === 0) console.log('✅ ESCENARIO 5: REGALOS — COMPLETO Y CONSISTENTE')
  else { console.log(`❌ ESCENARIO 5: ${errores.length} error(es):`); for (const e of errores) console.log(`   ❌ ${e}`) }
}

main().catch(console.error)
