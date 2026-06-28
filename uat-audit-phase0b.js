const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const headers = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }

async function q(table, select = '*', filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers })
  return res.json()
}

async function main() {
  // Check ALL products across ALL stores for variants
  const tiendas = await q('tiendas', 'id, nombre_tienda, slug')

  for (const t of tiendas) {
    const prods = await q('productos', 'id, nombre, stock, precio, tallas, in_stock, costo_compra, aplica_impuesto, porcentaje_impuesto, tipo_articulo', `id_tienda=eq.${t.id}`)
    if (prods.length > 0) {
      console.log(`\n🏪 "${t.nombre_tienda}" (${t.id.substring(0,8)}) — ${prods.length} productos:`)
      for (const p of prods) {
        const hasTallas = Array.isArray(p.tallas) && p.tallas.length > 0
        const tallasStr = hasTallas ? JSON.stringify(p.tallas) : 'sin tallas'
        console.log(`   📦 "${p.nombre}" stock=${p.stock} precio=${p.precio} costo=${p.costo_compra??'-'} impuesto=${p.aplica_impuesto?p.porcentaje_impuesto+'%':'no'} in_stock=${p.in_stock} tipo=${p.tipo_articulo||'-'} ${tallasStr}`)
      }
    }
  }

  // Check pedidos (the exact count might be 0)
  console.log('\n📊 PEDIDOS (sin filtro):')
  try {
    const pedidos = await q('pedidos', 'id, total, estado, cliente_nombre, created_at, giftcard_code, notas', 'order=created_at.desc')
    console.log(`   Total: ${pedidos.length}`)
    if (pedidos.length > 0) {
      for (const p of pedidos.slice(0, 10)) {
        console.log(`   [${p.id.substring(0,8)}] total=${p.total} "${p.estado}" cliente="${p.cliente_nombre}" gc=${p.giftcard_code||'-'}`)
      }
    } else {
      console.log('   (vacio)')
    }
  } catch(e) { console.log('   Error:', e.message) }

  // Check productos with tallas non-empty
  console.log('\n🏷️ PRODUCTOS CON VARIANTES:')
  for (const t of tiendas) {
    const prods = await q('productos', 'id, nombre, tallas', `id_tienda=eq.${t.id}`)
    for (const p of prods) {
      if (Array.isArray(p.tallas) && p.tallas.length > 0) {
        console.log(`   "${t.nombre_tienda}" → "${p.nombre}": ${JSON.stringify(p.tallas)}`)
      }
    }
  }

  // Check existing gift_experiences
  console.log('\n🎁 GIFT EXPERIENCES:')
  const gifts = await q('gift_experiences', '*')
  console.log(`   Total: ${gifts.length}`)
  if (gifts.length > 0) {
    for (const g of gifts.slice(0, 5)) {
      console.log(`   code=${g.gift_code} status=${g.status} from=${g.sender_name} to=${g.receiver_name||'-'}`)
    }
  }

  // Check gift_card_transactions
  console.log('\n💳 GIFT CARD TRANSACTIONS:')
  const gcts = await q('gift_card_transactions', '*')
  console.log(`   Total: ${gcts.length}`)
  if (gcts.length > 0) {
    for (const t of gcts.slice(0, 5)) {
      console.log(`   gc_id=${t.gift_card_id?.substring(0,8)||'-'} type=${t.type} amount=${t.amount}`)
    }
  }

  // Check coupons
  console.log('\n🎫 COUPONS:')
  const cupones = await q('coupons', '*')
  console.log(`   Total: ${cupones.length}`)
  if (cupones.length > 0) {
    for (const c of cupones.slice(0, 5)) {
      console.log(`   code="${c.code}" type=${c.discount_type} value=${c.value} active=${c.is_active} usage=${c.usage_count}/${c.usage_limit}`)
    }
  }
}

main().catch(console.error)
