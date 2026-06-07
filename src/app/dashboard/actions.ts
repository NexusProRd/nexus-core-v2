'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { calcularMetricasDashboard, calcularTodasLasMetricas } from './dashboard-metrics'
import { checkTiendaActiva } from '@/lib/commercial'

export async function recalcularDashboard(tiendaId: string) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('nx_session')?.value
  if (!sessionId || sessionId !== tiendaId) {
    return { error: 'No autorizado' }
  }

  const { supabase } = createAdminClient()
  if (!supabase) return { error: 'Error de conexión' }

  const activa = await checkTiendaActiva(supabase, tiendaId)
  if (!activa.ok) return { error: activa.error }

  const hoyStr = new Date().toISOString().split('T')[0]
  const inicioHoy = `${hoyStr}T00:00:00.000Z`

  const [pedidosRes, productosRes, perfilRes, modalRes, regalosCountRes, giftsHoyRes] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, cliente_nombre, total, estado, creado_at, detalles_pedido')
      .eq('id_tienda', tiendaId)
      .order('creado_at', { ascending: false }),
    supabase
      .from('productos')
      .select('nombre, stock, id')
      .eq('id_tienda', tiendaId),
    supabase
      .from('perfil_tienda')
      .select('whatsapp_numero')
      .eq('id_tienda', tiendaId)
      .maybeSingle(),
    supabase
      .from('nexus_catalogo_modal')
      .select('activo')
      .eq('id_tienda', tiendaId)
      .maybeSingle(),
    supabase
      .from('gift_experiences')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', tiendaId)
      .eq('status', 'pending'),
    supabase
      .from('gift_experiences')
      .select('items_list')
      .eq('store_id', tiendaId)
      .eq('status', 'approved')
      .gte('created_at', inicioHoy),
  ])

  const pedidos = pedidosRes.data || []
  const productos = productosRes.data || []
  const perfil = perfilRes.data
  const modalConfig = modalRes.data
  const regalosPendientes = regalosCountRes.count || 0
  const giftsAprobadosHoy = giftsHoyRes.data || []

  const ventasRegalos = giftsAprobadosHoy.reduce((sum, g) => {
    const items = (g.items_list as { precio: number }[]) || []
    return sum + items.reduce((s, i) => s + Number(i.precio || 0), 0)
  }, 0)

  const metricas = calcularMetricasDashboard(pedidos)
  const ventasHoy = metricas.ventasHoy + ventasRegalos
  const stockBajo = productos
    .filter(p => Number(p.stock) > 0 && Number(p.stock) < 5)
    .sort((a, b) => a.stock - b.stock)

  const metricasCompletas = calcularTodasLasMetricas(
    pedidos,
    ventasRegalos,
    productos as { nombre: string; stock: number }[],
    perfil?.whatsapp_numero || null,
    modalConfig?.activo === true,
  )

  return {
    ventasHoy,
    pendientes: metricas.pendientes,
    pedidosHoy: metricas.pedidosHoyCount,
    regalosPendientes,
    stockBajo: stockBajo.map(p => ({ nombre: p.nombre, stock: p.stock, id: p.id })),
    ultimosPedidos: metricas.ultimosPedidos.map(p => ({
      id: p.id,
      cliente_nombre: p.cliente_nombre,
      total: p.total,
      estado: p.estado,
      creado_at: p.creado_at,
    })),
    pedidos: pedidos.map(p => ({
      id: p.id,
      cliente_nombre: p.cliente_nombre,
      total: p.total,
      estado: p.estado,
      creado_at: p.creado_at,
      detalles_pedido: p.detalles_pedido,
    })),
    metricasCompletas,
    productos: productos.map(p => ({ nombre: p.nombre, stock: p.stock })),
  }
}
