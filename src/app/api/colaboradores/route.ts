import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextResponse } from 'next/server'

async function verificarPermisos(supabase: any, sessionId: string, req: Request): Promise<Response | null> {
  const cookieHeader = req.headers.get('cookie') || ''
  const colMatch = cookieHeader.match(/(?:^|;\s*)nx_colaborador=([^;]*)/)
  if (colMatch) {
    let colId: string
    try {
      const raw = decodeURIComponent(colMatch[1])
      const parsed = JSON.parse(raw)
      colId = parsed.id
    } catch {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { data: col } = await supabase
      .from('colaboradores')
      .select('id, permisos')
      .eq('id', colId)
      .eq('id_tienda', sessionId)
      .eq('activo', true)
      .maybeSingle()
    if (!col) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const p = col.permisos as Record<string, boolean> | null
    if (!p?.productos || !p?.pedidos) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar colaboradores' }, { status: 403 })
    }
  }
  return null
}

export async function GET(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId)
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const permError = await verificarPermisos(supabase, sessionId, req)
  if (permError) return permError

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nombre, whatsapp_num, permisos, activo, creado_en')
    .eq('id_tienda', sessionId)
    .order('creado_en', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId)
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const permError = await verificarPermisos(supabase, sessionId, req)
  if (permError) return permError

  const { id, activo } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const { error } = await supabase.from('colaboradores').update({ activo }).eq('id', id).eq('id_tienda', sessionId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId)
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const permError = await verificarPermisos(supabase, sessionId, req)
  if (permError) return permError

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const { error } = await supabase.from('colaboradores').delete().eq('id', id).eq('id_tienda', sessionId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
