import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { storeId, productId, productName } = await req.json()
  if (!storeId || !productId) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }
  if (storeId !== sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { error: insertError } = await supabase!
    .from('gift_experiences')
    .insert({
      store_id: storeId,
      sender_name: '—',
      receiver_name: '—',
      items_list: [{ product_id: productId, nombre: productName || '' }],
      status: 'cancelled',
      is_redeemed: false,
    })

  if (insertError) {
    console.error('[API gift-removed] Error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
