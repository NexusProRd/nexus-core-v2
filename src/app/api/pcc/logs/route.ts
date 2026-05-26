import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const modulo = url.searchParams.get('modulo') || ''
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = supabase
    .from('nexus_logs')
    .select('id, id_tienda, modulo, accion, detalle, created_at', { count: 'exact' })

  if (modulo) {
    query = query.eq('modulo', modulo)
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: modulos } = await supabase
    .from('nexus_logs')
    .select('modulo')

  const modulosUnicos = [...new Set((modulos || []).map(m => m.modulo))].sort()

  return NextResponse.json({ data: data || [], count: count || 0, modulos: modulosUnicos })
}
