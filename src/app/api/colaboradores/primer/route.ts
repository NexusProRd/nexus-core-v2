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
    .select('id, nombre, permisos')
    .eq('id_tienda', id_tienda)
    .eq('activo', true)
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Sin colaboradores activos' }, { status: 404 })
  }

  return NextResponse.json(data)
}
