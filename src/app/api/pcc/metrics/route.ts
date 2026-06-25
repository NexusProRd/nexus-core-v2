import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { ESTADOS_INCLUIDOS } from '@/app/dashboard/dashboard-metrics'

export async function GET() {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  // Tiendas Totales
  const { count: totalTiendas } = await supabase
    .from('tiendas')
    .select('*', { count: 'exact', head: true })

  // Tiendas activas vs suspendidas
  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, plan_tipo, fecha_bloqueo_panel, created_at, nombre_tienda')

  const { data: configPrices } = await supabase
    .from('nexus_config')
    .select('clave, valor')
    .in('clave', ['plan_emprendedor_price', 'plan_pro_price'])

  const priceMap = new Map(configPrices?.map(r => [r.clave, parseInt(r.valor, 10)]) ?? [])
  const emprendedorPrice = priceMap.get('plan_emprendedor_price') || 380
  const proPrice = priceMap.get('plan_pro_price') || 900

  const ahora = new Date()
  let activas = 0
  let suspendidas = 0
  let emprendedoresActivos = 0
  let prosActivos = 0
  const tiendasPorVencer: { id: string; nombre: string; vence: string }[] = []
  const tiendasNuevasHoy: { id: string; nombre: string; creado_en: string }[] = []
  const hoyStr = ahora.toISOString().split('T')[0]

  for (const t of tiendas || []) {
    if (t.fecha_bloqueo_panel && new Date(t.fecha_bloqueo_panel) <= ahora) {
      suspendidas++
    } else {
      activas++
      if (t.plan_tipo === 'pro') prosActivos++
      else emprendedoresActivos++
    }

    // Tiendas por vencer (próximos 7 días)
    if (t.fecha_bloqueo_panel) {
      const vence = new Date(t.fecha_bloqueo_panel)
      const diff = (vence.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      if (diff > 0 && diff <= 7) {
        tiendasPorVencer.push({ id: t.id, nombre: t.nombre_tienda || 'Sin nombre', vence: t.fecha_bloqueo_panel })
      }
    }

    // Tiendas nuevas hoy
    if (t.created_at) {
      const creado = t.created_at.split('T')[0]
      if (creado === hoyStr) {
        tiendasNuevasHoy.push({ id: t.id, nombre: t.nombre_tienda || 'Sin nombre', creado_en: t.created_at })
      }
    }
  }

  // Total Ventas Generadas (solo estados comerciales válidos)
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('total')
    .in('estado', ESTADOS_INCLUIDOS)

  const totalVentas = pedidos?.reduce((s, p) => s + (p.total || 0), 0) || 0

  // MRR basado en plan_tipo real y precios desde nexus_config
  const mrr = (emprendedoresActivos * emprendedorPrice) + (prosActivos * proPrice)

  // Revendedores
  const { count: revendedores } = await supabase
    .from('nexus_revendedores')
    .select('*', { count: 'exact', head: true })

  const { data: revData } = await supabase
    .from('nexus_revendedores')
    .select('comision_porcentaje')

  const creditosAsignados = revData?.reduce((s, r) => s + (r.comision_porcentaje || 0), 0) || 0

  // Fallos recientes (últimos 5)
  const { data: fallos } = await supabase
    .from('nexus_logs')
    .select('id, tienda_id, accion, detalle, created_at')
    .eq('modulo', 'api')
    .or(`accion.ilike.%error%,accion.ilike.%fail%,accion.ilike.%fallo%`)
    .order('created_at', { ascending: false })
    .limit(5)

  // Actividad reciente (últimas 5 tiendas)
  const { data: actividadReciente } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, whatsapp_num, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    totalTiendas: totalTiendas || 0,
    activas,
    suspendidas,
    tiendasPorVencer,
    tiendasNuevasHoy,
    totalVentas,
    mrr,
    revendedoresActivos: revendedores || 0,
    creditosAsignados,
    fallos: fallos || [],
    actividadReciente: (actividadReciente || []).map(t => ({
      id: t.id,
      nombre: t.nombre_tienda,
      whatsapp: t.whatsapp_num || '',
      creado_en: t.created_at,
    })),
  })
}
