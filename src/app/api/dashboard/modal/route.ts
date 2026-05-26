import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getTiendaIdFromCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)nx_session=([^;]+)/)
  return match ? match[1] : null
}

export async function GET(req: Request) {
  try {
    const tiendaId = getTiendaIdFromCookie(req)
    if (!tiendaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { supabase, error } = createAdminClient()
    if (error || !supabase) {
      return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }

    const { data } = await supabase
      .from('nexus_catalogo_modal')
      .select('*')
      .eq('id_tienda', tiendaId)
      .maybeSingle()

    return NextResponse.json({ config: data || null })
  } catch (err: any) {
    return NextResponse.json({ config: null, error: err?.message })
  }
}

export async function POST(req: Request) {
  const tiendaId = getTiendaIdFromCookie(req)
  if (!tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { activo, tipo, imagen_url, url_redireccion, contenido, plantilla_id } = body

    const { supabase, error } = createAdminClient()
    if (error || !supabase) {
      return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }

    const upsertData: any = {
      id_tienda: tiendaId,
      activo: activo ?? false,
      tipo: tipo || 'plantilla',
      plantilla_id: plantilla_id || 'elegante',
      updated_at: new Date().toISOString(),
    }

    if (imagen_url !== undefined) upsertData.imagen_url = imagen_url
    if (url_redireccion !== undefined) upsertData.url_redireccion = url_redireccion
    if (contenido !== undefined) upsertData.contenido = contenido

    const { error: upsertError } = await supabase
      .from('nexus_catalogo_modal')
      .upsert(upsertData, { onConflict: 'id_tienda' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
