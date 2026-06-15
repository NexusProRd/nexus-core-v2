import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'

export async function GET(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { data: portadas, error: queryError } = await supabase
    .from('portadas')
    .select('*')
    .eq('id_tienda', session.tiendaId)
    .order('orden', { ascending: true })

  if (queryError) {
    return NextResponse.json({ error: 'Error al obtener portadas' }, { status: 500 })
  }

  return NextResponse.json(portadas || [])
}
