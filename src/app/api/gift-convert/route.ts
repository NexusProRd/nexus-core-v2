import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error: clientError } = createAdminClient()
  if (clientError) return NextResponse.json({ error: clientError }, { status: 500 })

  const { giftId } = await req.json()
  if (!giftId || typeof giftId !== 'string') {
    return NextResponse.json({ error: 'giftId es requerido' }, { status: 400 })
  }

  const { data: gift, error: giftError } = await supabase!
    .from('gift_experiences')
    .select('store_id')
    .eq('id', giftId)
    .single()

  if (giftError || !gift) {
    return NextResponse.json({ error: 'Regalo no encontrado' }, { status: 404 })
  }

  if (gift.store_id !== session.tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data, error } = await supabase!
    .rpc('convertir_regalo_a_giftcard_v2', { p_gift_id: giftId })

  if (error) {
    return NextResponse.json({ success: false, error: error.message })
  }

  const result = data as {
    success: boolean
    error?: string
    giftCard?: { id: string; code: string }
    value?: number
    expiresAt?: string
  }

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || 'Error al convertir el regalo' })
  }

  return NextResponse.json({
    success: true,
    giftCard: result.giftCard,
    value: result.value,
    expiresAt: result.expiresAt,
  })
}
