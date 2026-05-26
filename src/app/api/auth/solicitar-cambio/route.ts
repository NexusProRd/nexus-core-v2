import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const { whatsapp } = await req.json()
  const digits = (whatsapp || '').replace(/\D/g, '')
  if (digits.length < 10) {
    return NextResponse.json({ error: 'WhatsApp inválido.' }, { status: 400 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión.' }, { status: 500 })
  }

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, whatsapp_num')
    .is('soft_deleted_at', null)
    .in('whatsapp_num', [whatsapp.trim(), digits])
    .maybeSingle()

  if (!tienda) {
    return NextResponse.json({ error: 'Número no registrado.' }, { status: 404 })
  }

  await supabase
    .from('tiendas')
    .update({ solicita_cambio: true })
    .eq('id', tienda.id)

  await supabase.from('nexus_logs').insert({
    modulo: 'Recuperacion',
    accion: 'Solicito cambio',
    detalle: `Tienda: ${tienda.nombre_tienda}`,
    metadata: { id_tienda: tienda.id, whatsapp: tienda.whatsapp_num },
  })

  return NextResponse.json({ success: true, nombre_tienda: tienda.nombre_tienda })
}
