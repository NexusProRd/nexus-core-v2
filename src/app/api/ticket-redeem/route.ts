import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { code, storeId } = body

  if (!code || !storeId) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  if (storeId !== sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { error: updateError } = await supabase!
    .from('tickets')
    .update({ is_redeemed: true })
    .eq('code', code)
    .eq('store_id', storeId)
    .eq('is_redeemed', false)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
