import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'

// CONFIG ACCESS FIX: resolve signed token to UUID
async function getTiendaId(req: NextRequest): Promise<string | null> {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return null
  return session.tiendaId
}

export async function GET(req: NextRequest) {
  const sessionId = await getTiendaId(req)
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { data: tienda } = await supabase!
    .from('tiendas')
    .select('id, direccion, rnc, slug')
    .eq('id', sessionId)
    .single()

  return NextResponse.json({ data: tienda })
}

export async function PATCH(req: NextRequest) {
  const sessionId = await getTiendaId(req)
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { direccion, rnc, slug } = body

  const updates: Record<string, any> = {}
  if (direccion !== undefined) updates.direccion = direccion
  if (rnc !== undefined) updates.rnc = rnc
  if (slug !== undefined) updates.slug = slug

  const { error: updateError } = await supabase!
    .from('tiendas')
    .update(updates)
    .eq('id', sessionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const sessionId = await getTiendaId(req)
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { error: deleteError } = await supabase!
    .from('tiendas')
    .delete()
    .eq('id', sessionId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('nx_session', '', { path: '/', maxAge: 0 })
  return response
}
