import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getTiendaIdFromCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)nx_session=([^;]+)/)
  return match ? match[1] : null
}

export async function GET(req: Request) {
  const tiendaId = getTiendaIdFromCookie(req)
  if (!tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { data, error: dbError } = await supabase
    .from('nexus_catalogo_modal_historial')
    .select('*')
    .eq('id_tienda', tiendaId)
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ historial: data || [] })
}

export async function POST(req: Request) {
  const tiendaId = getTiendaIdFromCookie(req)
  if (!tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { config, imagen_url } = body

    if (!config) {
      return NextResponse.json({ error: 'config es requerido' }, { status: 400 })
    }

    const { supabase, error } = createAdminClient()
    if (error || !supabase) {
      return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }

    const { data, error: insertError } = await supabase
      .from('nexus_catalogo_modal_historial')
      .insert({
        id_tienda: tiendaId,
        config,
        imagen_url: imagen_url || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ historial: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const tiendaId = getTiendaIdFromCookie(req)
  if (!tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
      .from('nexus_catalogo_modal_historial')
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
