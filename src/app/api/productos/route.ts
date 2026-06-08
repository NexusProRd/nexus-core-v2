import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })
  }

  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })
  }

  const { error } = await supabase.from('productos').delete().in('id', ids).eq('id_tienda', sessionId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
