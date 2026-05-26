import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const idTienda = searchParams.get('id_tienda')

  if (!slug && !idTienda) {
    return NextResponse.json({ error: 'slug o id_tienda requerido' }, { status: 400 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  let tiendaId = idTienda

  if (slug) {
    const { data: tienda } = await supabase
      .from('tiendas')
      .select('id')
      .eq('slug', slug)
      .is('soft_deleted_at', null)
      .maybeSingle()
    if (!tienda) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    tiendaId = tienda.id
  }

  const [perfilRes, configRes] = await Promise.all([
    supabase.from('perfil_tienda').select('logo_url, nombre_comercial').eq('id_tienda', tiendaId).maybeSingle(),
    supabase.from('nexus_catalogo_modal').select('*').eq('id_tienda', tiendaId).eq('activo', true).maybeSingle(),
  ])

  if (!configRes.data) {
    return NextResponse.json({ modal: null })
  }

  return NextResponse.json({
    modal: {
      tipo: configRes.data.tipo,
      imagen_url: configRes.data.imagen_url,
      url_redireccion: configRes.data.url_redireccion,
      contenido: configRes.data.contenido,
      plantilla_id: configRes.data.plantilla_id,
    },
    tienda: {
      logo_url: perfilRes.data?.logo_url || null,
      nombre: perfilRes.data?.nombre_comercial || '',
    },
  })
}
