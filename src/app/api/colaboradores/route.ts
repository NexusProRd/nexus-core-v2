import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const id_tienda = searchParams.get('id_tienda')
  if (!id_tienda) {
    return NextResponse.json({ error: 'id_tienda requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nombre, whatsapp_num, permisos, activo, creado_en')
    .eq('id_tienda', id_tienda)
    .order('creado_en', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const { id, activo } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const { error } = await supabase.from('colaboradores').update({ activo }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const { error } = await supabase.from('colaboradores').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
