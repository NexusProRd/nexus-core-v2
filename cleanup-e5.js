// Cleanup E5 test data
const ANON_KEY = 'sb_publishable_US69pGw1SL7fhQARTe1gzA_jUrmYC_P'
const ADMIN_H = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }
const SUPABASE = 'https://iyyeczoamsoiwujbwgjh.supabase.co/rest/v1'
const STORE_ID = 'ad64ace8-23cb-45a5-81f2-4c3ec73eb8eb'
const JABON_ID = '7e1a8645-aca3-43c2-b5c9-db4b5b169851'

async function main() {
  // Restore stock
  const [prod] = await (await fetch(`${SUPABASE}/productos?id=eq.${JABON_ID}`, { headers: ADMIN_H })).json()
  console.log('Before stock:', { stock: prod.stock, stock_reservado: prod.stock_reservado })
  await fetch(`${SUPABASE}/productos?id=eq.${JABON_ID}`, { method: 'PATCH', headers: ADMIN_H, body: JSON.stringify({ stock: 50, stock_reservado: 0, in_stock: true }) })
  console.log('Stock restored to 50')

  // Delete test gifts (code starting with Y3K)
  const gifts = await (await fetch(`${SUPABASE}/gift_experiences?select=id,gift_code&store_id=eq.${STORE_ID}&order=created_at.desc&limit=5`, { headers: ADMIN_H })).json()
  for (const g of gifts) {
    if (g.gift_code && g.gift_code.startsWith('Y3K')) {
      await fetch(`${SUPABASE}/gift_experiences?id=eq.${g.id}`, { method: 'DELETE', headers: ADMIN_H })
      console.log('Deleted gift:', g.gift_code)
    }
  }

  // Delete test GC
  const gcs = await (await fetch(`${SUPABASE}/gift_cards?select=id,code&order=created_at.desc&limit=5`, { headers: ADMIN_H })).json()
  for (const g of gcs) {
    if (g.code && (g.code.startsWith('GCY6') || g.code.startsWith('Y3K'))) {
      await fetch(`${SUPABASE}/gift_cards?id=eq.${g.id}`, { method: 'DELETE', headers: ADMIN_H })
      console.log('Deleted GC:', g.code)
    }
  }

  // Delete test pedido (total=750 created today)
  const pedidos = await (await fetch(`${SUPABASE}/pedidos?select=id,total,created_at&id_cliente=eq.8095553001&order=created_at.desc&limit=10`, { headers: ADMIN_H })).json()
  for (const p of pedidos) {
    if (p.total === 750) {
      await fetch(`${SUPABASE}/pedidos?id=eq.${p.id}`, { method: 'DELETE', headers: ADMIN_H })
      console.log('Deleted pedido:', p.id.substring(0,8))
    }
  }

  // Verify
  const [p2] = await (await fetch(`${SUPABASE}/productos?id=eq.${JABON_ID}`, { headers: ADMIN_H })).json()
  console.log('After fix stock:', { stock: p2.stock, stock_reservado: p2.stock_reservado })
}

main().catch(console.error)
