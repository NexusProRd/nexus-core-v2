import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { data: gifts, error: giftsError } = await supabase!
    .from('gift_experiences')
    .select('*')
    .eq('store_id', sessionId)
    .order('created_at', { ascending: false })

  if (giftsError) {
    console.error('[API Regalos] error:', giftsError)
    return NextResponse.json({ error: giftsError.message }, { status: 500 })
  }

  const items = (gifts || []).map((g: any) => ({
    id: g.id,
    store_id: g.store_id,
    tipo: 'regalo' as const,
    codigo: g.gift_code,
    productos: (g.items_list || []).map((i: any) => i.nombre),
    de: g.sender_name,
    para: g.receiver_name,
    mensaje: g.personal_message || '',
    estado: g.is_redeemed ? 'reclamado' as const
      : g.status === 'pending' ? 'pendiente' as const
      : g.status === 'approved' ? 'activo' as const
      : g.status === 'RESERVED' ? 'reservado' as const
      : g.status === 'CLAIMED' ? 'reclamado' as const
      : g.status === 'DELIVERED' ? 'entregado' as const
      : g.status === 'expired' ? 'vencido' as const
      : g.status === 'cancelled' ? 'cancelado' as const
      : 'rechazado' as const,
    cliente: g.sender_phone || '—',
    fecha: g.created_at,
  }))

  return NextResponse.json({ data: items })
}
