import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const [giftsRes, ticketsRes] = await Promise.all([
    supabase!
      .from('gift_experiences')
      .select('*')
      .eq('store_id', sessionId)
      .order('created_at', { ascending: false }),
    supabase!
      .from('tickets')
      .select('*, pedidos(cliente_nombre, cliente_telefono)')
      .eq('store_id', sessionId)
      .order('created_at', { ascending: false }),
  ])

  if (giftsRes.error) console.error('[API Regalos] gift_experiences error:', giftsRes.error)
  if (ticketsRes.error) console.error('[API Regalos] tickets error:', ticketsRes.error)

  const tickets = (ticketsRes.data || []).map((t: any) => {
    const details = (t.gift_details || {}) as Record<string, any>
    const pedido = t.pedidos as { cliente_nombre?: string; cliente_telefono?: string } | null
    return {
      id: t.id,
      store_id: t.store_id,
      tipo: 'ticket' as const,
      codigo: t.code,
      productos: details.productos || [],
      de: details.sender_name || '—',
      para: details.recipient_name || '—',
      mensaje: details.dedication || '',
      estado: t.is_redeemed ? 'canjeado' as const : 'activo' as const,
      cliente: t.is_redeemed ? (pedido?.cliente_nombre || '—') : '—',
      fecha: t.created_at,
    }
  })

  const gifts = (giftsRes.data || []).map((g: any) => ({
    id: g.id,
    store_id: g.store_id,
    tipo: 'regalo' as const,
    codigo: g.gift_code,
    productos: (g.items_list || []).map((i: any) => i.nombre),
    de: g.sender_name,
    para: g.receiver_name,
    mensaje: g.personal_message || '',
    estado: g.is_redeemed ? 'canjeado' as const
      : g.status === 'pending' ? 'pendiente' as const
      : g.status === 'approved' ? 'activo' as const
      : g.status === 'expired' ? 'vencido' as const
      : g.status === 'cancelled' ? 'cancelado' as const
      : 'rechazado' as const,
    cliente: g.is_redeemed ? g.receiver_name : '—',
    fecha: g.created_at,
  }))

  const unificados = [...gifts, ...tickets].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  return NextResponse.json({ data: unificados })
}
