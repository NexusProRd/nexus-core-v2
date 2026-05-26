import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getTiendaIdFromCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)nx_session=([^;]+)/)
  return match ? match[1] : null
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const tiendaId = getTiendaIdFromCookie(req)
  if (!tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  try {
    const { data: historial, error: fetchError } = await supabase
      .from('nexus_catalogo_modal_historial')
      .select('*')
      .eq('id', id)
      .eq('id_tienda', tiendaId)
      .single()

    if (fetchError || !historial) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const config = historial.config

    const upsertData: any = {
      id_tienda: tiendaId,
      activo: true,
      tipo: config.tipo || 'plantilla',
      plantilla_id: config.plantilla_id || 'elegante',
      imagen_url: historial.imagen_url || config.imagen_url || null,
      url_redireccion: config.url_redireccion || null,
      contenido: config.contenido || null,
      updated_at: new Date().toISOString(),
    }

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
