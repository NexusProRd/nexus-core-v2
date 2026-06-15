import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const idTienda = searchParams.get('id_tienda')

  if (!idTienda) {
    return NextResponse.json({ error: 'id_tienda requerido' }, { status: 400 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { data: portadas, error: queryError } = await supabase
    .from('portadas')
    .select('id, tipo, imagen_url, titulo, descripcion, id_producto, cta_texto, cta_accion, duracion_ms')
    .eq('id_tienda', idTienda)
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (queryError) {
    return NextResponse.json({ error: 'Error al obtener portadas' }, { status: 500 })
  }

  return NextResponse.json(portadas || [])
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const body = await req.json()
  const { tipo, imagen_url, titulo, descripcion, id_producto, cta_texto, cta_accion, duracion_ms } = body

  if (!tipo || !['institucional', 'producto', 'oferta'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de portada inválido' }, { status: 400 })
  }

  if ((tipo === 'producto' || tipo === 'oferta') && !id_producto) {
    return NextResponse.json({ error: 'Debes seleccionar un producto' }, { status: 400 })
  }

  const { count, error: countError } = await supabase
    .from('portadas')
    .select('*', { count: 'exact', head: true })
    .eq('id_tienda', session.tiendaId)
    .eq('activo', true)

  if (countError) {
    return NextResponse.json({ error: 'Error al verificar límite' }, { status: 500 })
  }

  if (count != null && count >= 5) {
    return NextResponse.json({ error: 'Máximo 5 portadas activas por tienda. Desactiva una antes de crear otra.' }, { status: 400 })
  }

  const maxOrdenResult = await supabase
    .from('portadas')
    .select('orden')
    .eq('id_tienda', session.tiendaId)
    .order('orden', { ascending: false })
    .limit(1)

  const nextOrden = maxOrdenResult.data?.[0]?.orden != null ? maxOrdenResult.data[0].orden + 1 : 0

  const { data: newPortada, error: insertError } = await supabase
    .from('portadas')
    .insert({
      id_tienda: session.tiendaId,
      tipo,
      imagen_url: imagen_url || null,
      titulo: titulo || null,
      descripcion: descripcion || null,
      id_producto: id_producto || null,
      cta_texto: cta_texto || null,
      cta_accion: cta_accion || 'ver_productos',
      duracion_ms: duracion_ms || 5000,
      activo: true,
      orden: nextOrden,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(newPortada, { status: 201 })
}
