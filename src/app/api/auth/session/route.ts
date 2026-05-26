import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const colaboradorId = req.headers.get('cookie')?.match(/(?:^|;\s*)nx_colaborador=([^;]*)/)?.[1]
  if (!colaboradorId) {
    return NextResponse.json({ esColaborador: false })
  }

  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('colaboradores')
    .select('nombre, whatsapp_num, permisos, activo')
    .eq('id', colaboradorId)
    .single()

  if (error || !data) {
    return NextResponse.json({ esColaborador: false })
  }

  if (!data.activo) {
    return NextResponse.json({ esColaborador: false })
  }

  return NextResponse.json({
    esColaborador: true,
    nombre: data.nombre,
    whatsapp: data.whatsapp_num,
    permisos: data.permisos,
  })
}
