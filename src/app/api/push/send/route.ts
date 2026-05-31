import { NextRequest, NextResponse } from 'next/server'
import { sendPushToTienda } from '@/lib/push'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id_tienda, cliente_nombre, total, id_pedido } = body

  if (!id_tienda) {
    return NextResponse.json({ error: 'Falta id_tienda' }, { status: 400 })
  }

  sendPushToTienda(id_tienda, {
    title: '¡Nuevo pedido!',
    body: `Cliente: ${cliente_nombre || '—'} — $${Number(total || 0).toLocaleString('es-DO')}`,
    data: { url: '/dashboard/pedidos', id_pedido, id_tienda },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
