import { NextRequest, NextResponse } from 'next/server'
import { sendPushToTienda } from '@/lib/push'
import { getSession } from '@/lib/auth/get-session'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { cliente_nombre, total, id_pedido } = body

  const id_tienda = session.tiendaId

  console.log('[Push Send API] sending push for tienda', id_tienda, 'pedido', id_pedido)
  sendPushToTienda(id_tienda, {
    title: '¡Nuevo pedido!',
    body: `Cliente: ${cliente_nombre || '—'} — $${Number(total || 0).toLocaleString('es-DO')}`,
    data: { url: '/dashboard/pedidos', id_pedido, id_tienda },
  }).then((r) => console.log('[Push Send API] result', r))
    .catch((e) => console.error('[Push Send API] error', e))

  return NextResponse.json({ success: true })
}
