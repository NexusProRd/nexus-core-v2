import { NextRequest, NextResponse } from 'next/server'
import { sendPushToTienda } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id_tienda, id_pedido, cliente_nombre, total } = body

  if (!id_tienda || !id_pedido) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, estado')
    .eq('id', id_pedido)
    .eq('id_tienda', id_tienda)
    .eq('estado', 'pendiente')
    .maybeSingle()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  console.log('[Push QuickBuy] sending push for tienda', id_tienda, 'pedido', id_pedido)
  sendPushToTienda(id_tienda, {
    title: '¡Nuevo pedido!',
    body: `Cliente: ${cliente_nombre || '—'} — $${Number(total || 0).toLocaleString('es-DO')}`,
    data: { url: '/dashboard/pedidos', id_pedido, id_tienda },
  }).then((r) => console.log('[Push QuickBuy] result', r))
    .catch((e) => console.error('[Push QuickBuy] error', e))

  return NextResponse.json({ success: true })
}
