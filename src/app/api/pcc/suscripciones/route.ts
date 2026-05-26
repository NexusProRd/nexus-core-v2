import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, plan_nivel, tokens_disponibles, token_productos_limite, esta_activa, fecha_creacion, fecha_vencimiento, fecha_bloqueo_panel')

  if (!tiendas) {
    return NextResponse.json({ data: [] })
  }

  const ahora = new Date()
  const data = tiendas.map(t => {
    const vence = t.fecha_vencimiento ? new Date(t.fecha_vencimiento) : null
    const bloqueo = t.fecha_bloqueo_panel ? new Date(t.fecha_bloqueo_panel) : null
    const diasRestantes = vence ? Math.ceil((vence.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)) : null
    const vencida = bloqueo ? bloqueo <= ahora : false
    return {
      id: t.id,
      nombre: t.nombre_tienda,
      plan: t.plan_nivel,
      tokens: t.tokens_disponibles || 0,
      limite: t.token_productos_limite || 0,
      activa: t.esta_activa && !vencida,
      creada: t.fecha_creacion,
      vence: t.fecha_vencimiento,
      diasRestantes,
      vencida,
    }
  })

  data.sort((a, b) => {
    if (a.vencida !== b.vencida) return a.vencida ? 1 : -1
    return (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999)
  })

  return NextResponse.json({ data })
}
