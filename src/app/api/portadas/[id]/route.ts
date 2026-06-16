import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { id } = await params

  const { data: existing } = await supabase
    .from('portadas')
    .select('id, activo')
    .eq('id', id)
    .eq('id_tienda', session.tiendaId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Portada no encontrada' }, { status: 404 })
  }

  const body = await req.json()
  const { tipo, imagen_url, titulo, descripcion, id_producto, cta_texto, cta_accion, cta_url, cta_pestana, cta_categoria, duracion_ms, activo, orden } = body

  if (tipo && !['institucional', 'producto', 'oferta', 'personalizado'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de portada inválido' }, { status: 400 })
  }

  if (activo === true && !existing.activo) {
    const { count, error: countError } = await supabase
      .from('portadas')
      .select('*', { count: 'exact', head: true })
      .eq('id_tienda', session.tiendaId)
      .eq('activo', true)

    if (countError) {
      return NextResponse.json({ error: 'Error al verificar límite' }, { status: 500 })
    }

    if (count != null && count >= 5) {
      return NextResponse.json({ error: 'Máximo 5 portadas activas por tienda. Desactiva otra antes de activar esta.' }, { status: 400 })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (tipo !== undefined) updateData.tipo = tipo
  if (imagen_url !== undefined) updateData.imagen_url = imagen_url
  if (titulo !== undefined) updateData.titulo = titulo
  if (descripcion !== undefined) updateData.descripcion = descripcion
  if (id_producto !== undefined) updateData.id_producto = id_producto
  if (cta_texto !== undefined) updateData.cta_texto = cta_texto
  if (cta_accion !== undefined) updateData.cta_accion = cta_accion
  if (cta_url !== undefined) updateData.cta_url = cta_url
  if (cta_pestana !== undefined) updateData.cta_pestana = cta_pestana
  if (cta_categoria !== undefined) updateData.cta_categoria = cta_categoria
  if (duracion_ms !== undefined) updateData.duracion_ms = duracion_ms
  if (activo !== undefined) updateData.activo = activo
  if (orden !== undefined) updateData.orden = orden
  updateData.actualizado_at = new Date().toISOString()

  const { data: updated, error: updateError } = await supabase
    .from('portadas')
    .update(updateData)
    .eq('id', id)
    .eq('id_tienda', session.tiendaId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { id } = await params

  const { data: existing } = await supabase
    .from('portadas')
    .select('id')
    .eq('id', id)
    .eq('id_tienda', session.tiendaId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Portada no encontrada' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('portadas')
    .delete()
    .eq('id', id)
    .eq('id_tienda', session.tiendaId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
