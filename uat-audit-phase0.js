const SUPABASE_URL = 'https://iyyeczoamsoiwujbwgjh.supabase.co'
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'count=exact',
}

async function query(table, select = '*', filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`
  const res = await fetch(url, { headers })
  const data = await res.json()
  return { data, count: res.headers.get('content-range') || '?' }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('FASE 0: RECONOCIMIENTO DE BASE DE DATOS')
  console.log('═══════════════════════════════════════\n')

  // 1. Count stores
  const tiendas = await query('tiendas', 'id, nombre_tienda, slug, tienda_abierta, esta_activa')
  console.log(`📊 Tiendas: ${tiendas.data.length}`)
  for (const t of tiendas.data.slice(0, 10)) {
    console.log(`   [${t.id.substring(0,8)}] "${t.nombre_tienda}" — slug=${t.slug} abierta=${t.tienda_abierta} activa=${t.esta_activa}`)
  }

  // Find a store with products
  for (const t of tiendas.data.slice(0, 20)) {
    const prods = await query('productos', 'id, nombre, stock, precio, precio_oferta, in_stock, tallas, costo_compra, aplica_impuesto, porcentaje_impuesto', `id_tienda=eq.${t.id}`)
    if (prods.data.length > 0) {
      console.log(`\n🔍 Store with products: "${t.nombre_tienda}" (${t.id})`)
      console.log(`   Products: ${prods.data.length}`)
      for (const p of prods.data.slice(0, 10)) {
        const hasTallas = Array.isArray(p.tallas) && p.tallas.length > 0
        console.log(`   📦 [${p.id.substring(0,8)}] "${p.nombre}" stock=${p.stock} precio=${p.precio} oferta=${p.precio_oferta ?? '-'} in_stock=${p.in_stock} costo=${p.costo_compra ?? '-'} impuesto=${p.aplica_impuesto ? `${p.porcentaje_impuesto}%` : 'no'}${hasTallas ? ` 🏷️ tallas=${JSON.stringify(p.tallas)}` : ''}`)
      }
      break
    }
  }

  // 2. Check coupons
  const cupones = await query('coupons', '*', 'limit=5')
  console.log(`\n📊 Cupones: ${cupones.count}`)
  for (const c of cupones.data) {
    console.log(`   [${c.id.substring(0,8)}] code="${c.code}" type=${c.discount_type} value=${c.value} active=${c.is_active} usage=${c.usage_count}/${c.usage_limit}`)
  }

  // 3. Check gift_cards
  const gcs = await query('gift_cards', '*', 'limit=5')
  console.log(`\n📊 Gift Cards: ${gcs.count}`)
  for (const g of gcs.data) {
    console.log(`   [${g.id.substring(0,8)}] code="${g.code}" balance=${g.balance} initial=${g.initial_balance} active=${g.is_active}`)
  }

  // 4. Check existing pedidos
  const pedidos = await query('pedidos', 'id, total, estado, created_at, giftcard_code, notas', 'limit=5&order=created_at.desc')
  console.log(`\n📊 Pedidos totales: ${pedidos.count}`)
  for (const p of pedidos.data) {
    console.log(`   [${p.id.substring(0,8)}] total=${p.total} estado=${p.estado} gc=${p.giftcard_code || '-'} notas="${(p.notas||'').substring(0,40)}"`)
  }

  // 5. Check gift_experiences
  const gifts = await query('gift_experiences', 'id, gift_code, status, store_id, sender_name', 'limit=5')
  console.log(`\n📊 Gift Experiences: ${gifts.count}`)
  for (const g of gifts.data) {
    console.log(`   [${g.id.substring(0,8)}] code="${g.gift_code}" status=${g.status} from=${g.sender_name}`)
  }

  // 6. Check detalles_pedido
  const detalles = await query('detalles_pedido', 'id, id_pedido, producto, cantidad, precio_unitario, variante_seleccionada', 'limit=5')
  console.log(`\n📊 Detalles de pedido: ${detalles.count}`)

  // 7. Check gift_card_transactions
  const gct = await query('gift_card_transactions', '*', 'limit=5')
  console.log(`\n📊 Gift Card Transactions: ${gct.count}`)
  for (const t of gct.data) {
    console.log(`   [${t.id.substring(0,8)}] gc_id=${t.gift_card_id?.substring(0,8)||'-'} type=${t.type} amount=${t.amount} balance_before=${t.balance_before} balance_after=${t.balance_after}`)
  }
}

main().catch(console.error)
