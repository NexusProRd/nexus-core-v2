import { getSession } from '@/lib/auth/get-session'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tiendaId = session.tiendaId

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { data, error: dbError } = await supabase
    .from('nexus_disenos_biblioteca')
    .select('*')
    .eq('id_tienda', tiendaId)
    .order('updated_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ disenos: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tiendaId = session.tiendaId

  try {
    const body = await req.json()
    const { nombre, tipo, config, preview_url } = body

    if (!config) {
      return NextResponse.json({ error: 'config es requerido' }, { status: 400 })
    }

    const { supabase, error } = createAdminClient()
    if (error || !supabase) {
      return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }

    const { data, error: insertError } = await supabase
      .from('nexus_disenos_biblioteca')
      .insert({
        id_tienda: tiendaId,
        nombre: nombre || 'Diseño sin título',
        tipo: tipo || 'whatsapp_story',
        config,
        preview_url: preview_url || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ diseno: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tiendaId = session.tiendaId

  try {
    const body = await req.json()
    const { id, nombre, tipo, config, preview_url } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const { supabase, error } = createAdminClient()
    if (error || !supabase) {
      return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (nombre !== undefined) updates.nombre = nombre
    if (tipo !== undefined) updates.tipo = tipo
    if (config !== undefined) updates.config = config
    if (preview_url !== undefined) updates.preview_url = preview_url

    const { data, error: updateError } = await supabase
      .from('nexus_disenos_biblioteca')
      .update(updates)
      .eq('id', id)
      .eq('id_tienda', tiendaId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ diseno: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tiendaId = session.tiendaId

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const { supabase, error } = createAdminClient()
    if (error || !supabase) {
      return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('nexus_disenos_biblioteca')
      .delete()
      .eq('id', id)
      .eq('id_tienda', tiendaId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
