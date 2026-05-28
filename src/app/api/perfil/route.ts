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

  const { data: perfil } = await supabase!
    .from('perfil_tienda')
    .select('*')
    .eq('id_tienda', sessionId)
    .maybeSingle()

  return NextResponse.json({ perfil })
}

export async function POST(req: NextRequest) {
  const sessionId = await getTiendaId(req)
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()

  const { data, error: queryError } = await supabase!
    .from('perfil_tienda')
    .upsert({ id_tienda: sessionId, ...body }, { onConflict: 'id_tienda' })
    .select()
    .maybeSingle()

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 })

  return NextResponse.json({ perfil: data })
}
