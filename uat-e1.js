// ============================================================
// RC-UAT-02 — ESCENARIO 1: Compra normal
// ============================================================
const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const headers = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }

const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'  // Primus Company
const PRODUCTO_ID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'  // Jabón Artesanal

async function q(table, select = '*', filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers })
  const raw = await res.json()
  const data = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  const count = res.headers.get('content-range')
  return { data, count, ok: res.ok }
}

async function snapshot(label) {
  console.log(`\n📸 SNAPSHOT: ${label}`)
  const prods = await q('productos', 'id, nombre, stock, stock_reservado, in_stock', `id_tienda=eq.${STORE_ID}`)
  const pedidos = await q('pedidos', 'id, total, estado, cliente_nombre, notas, creado_at', `id_tienda=eq.${STORE_ID}&order=creado_at.desc`)
  const detalles = await q('detalles_pedido', 'id, id_pedido, producto, cantidad, precio_unitario, variante_seleccionada', '')
  
  console.log(`   Productos: ${prods.data.length}`)
  for (const p of prods.data) {
    const idShort = p.id ? p.id.substring(0,8) : '??'
    console.log(`     [${idShort}] "${p.nombre}" stock=${p.stock} reservado=${p.stock_reservado ?? 0} in_stock=${p.in_stock}`)
  }
  console.log(`   Pedidos: ${pedidos.data.length}`)
  for (const p of pedidos.data) {
    const idShort = p.id ? p.id.substring(0,8) : '??'
    console.log(`     [${idShort}] total=${p.total} "${p.estado}" "${p.cliente_nombre || ''}"`)
  }
  console.log(`   Detalles: ${detalles.data.length}`)
  return { productos: prods.data, pedidos: pedidos.data, detalles: detalles.data }
}

async function main() {
  console.log('══════════════════════════════════════════')
  console.log('ESCENARIO 1 — COMPRA NORMAL')
  console.log('══════════════════════════════════════════\n')

  // 1. BEFORE
  const antes = await snapshot('ANTES')

  const productoAntes = antes.productos.find(p => p.id === PRODUCTO_ID)
  if (!productoAntes) { console.log('\n❌ Producto no encontrado en estado ANTES'); return }
  console.log(`\n📊 Stock antes: ${productoAntes.stock} (reservado: ${productoAntes.stock_reservado ?? 0})`)

  // 2. EXECUTE purchase: 2 x Jabón Artesanal @ 250 = 500
  const payload = {
    idTienda: STORE_ID,
    nombreCliente: 'Carlos Pérez',
    telefonoCliente: '8095551234',
    items: [
      {
        id: PRODUCTO_ID,
        nombre: 'Jabón Artesanal',
        cantidad: 2,
        precio: 250,
      }
    ],
    notas: 'UAT Scenario 1 - Compra normal',
  }

  console.log(`\n🛒 Enviando compra: 2x Jabón Artesanal @ $250`)
  const resp = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await resp.json()
  console.log(`   Status: ${resp.status}`)
  console.log(`   Response: ${JSON.stringify(result)}`)

  if (!resp.ok) {
    console.log(`\n❌ COMPRA FALLÓ: ${result.error}`)
    return
  }

  // 3. AFTER
  const despues = await snapshot('DESPUÉS')

  const productoDespues = despues.productos.find(p => p.id === PRODUCTO_ID)
  console.log(`\n📊 Stock después: ${productoDespues.stock} (reservado: ${productoDespues.stock_reservado ?? 0})`)

  // 4. VERIFY
  console.log('\n═══════════════ VERIFICACIÓN ═══════════════')
  const errores = []

  // Stock: 15 - 2 = 13
  const stockEsperado = productoAntes.stock - 2
  if (productoDespues.stock !== stockEsperado) {
    errores.push(`Stock incorrecto: esperado ${stockEsperado}, obtenido ${productoDespues.stock}`)
  } else {
    console.log(`✅ Stock: ${productoAntes.stock} → ${productoDespues.stock} (correcto, -2)`)
  }

  // Stock reservado no debe cambiar en compra normal (no es reserva, es deduct directo)
  if (productoDespues.stock_reservado !== (productoAntes.stock_reservado || 0)) {
    errores.push(`Stock reservado cambió: antes ${productoAntes.stock_reservado ?? 0}, después ${productoDespues.stock_reservado ?? 0}`)
  } else {
    console.log(`✅ Stock reservado: sin cambios (${productoDespues.stock_reservado ?? 0})`)
  }

  // Un pedido debe existir
  const pedidosNuevos = despues.pedidos.filter(p => !antes.pedidos.some(a => a.id === p.id))
  if (pedidosNuevos.length !== 1) {
    errores.push(`Debería haber 1 pedido nuevo, hay ${pedidosNuevos.length}`)
  } else {
    const pedido = pedidosNuevos[0]
    console.log(`✅ Pedido creado: ID=${pedido.id.substring(0,8)} total=${pedido.total} estado="${pedido.estado}"`)
    
    // Total debe ser 500 (2 x 250)
    if (pedido.total !== 500) {
      errores.push(`Total del pedido incorrecto: esperado 500, obtenido ${pedido.total}`)
    } else {
      console.log(`✅ Total: $500 (correcto, 2 x $250)`)
    }
  }

  // in_stock debe seguir true (stock=13 > 0)
  if (productoDespues.in_stock !== true) {
    errores.push(`in_stock cambió a false incorrectamente`)
  } else {
    console.log(`✅ in_stock: true (stock 13 > 0)`)
  }

  // Verificar detalles_pedido
  const detalles = despues.detalles.filter(d => pedidosNuevos.length > 0 && d.id_pedido === pedidosNuevos[0].id)
  if (detalles.length > 0) {
    console.log(`✅ Detalles del pedido: ${detalles.length} línea(s)`)
    for (const d of detalles) {
      if (d.cantidad !== 2 || d.precio_unitario !== 250) {
        errores.push(`Detalle incorrecto: cantidad=${d.cantidad}, precio=${d.precio_unitario}`)
      } else {
        console.log(`   "${d.producto}" x${d.cantidad} @ $${d.precio_unitario} = $${d.cantidad * d.precio_unitario}`)
      }
    }
  }

  // Dashboard metrics check
  // Ventas hoy debería incluir este pedido
  // Nota: usado total 500 (sin impuestos porque producto no aplica impuesto)

  console.log('\n═══════════════ RESULTADO ═══════════════')
  if (errores.length === 0) {
    console.log('✅ ESCENARIO 1: COMPRA NORMAL — COMPLETO Y CONSISTENTE')
  } else {
    console.log(`❌ ESCENARIO 1: ${errores.length} error(es):`)
    for (const e of errores) console.log(`   ❌ ${e}`)
  }
}

main().catch(console.error)
