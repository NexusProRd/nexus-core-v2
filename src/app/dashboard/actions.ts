'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function recalcularDashboard(tiendaId: string) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('nx_session')?.value
  if (!sessionId || sessionId !== tiendaId) {
    return { error: 'No autorizado' }
  }

  const { supabase } = createAdminClient()
  if (!supabase) return { error: 'Error de conexión' }

  const hoy = new Date()
  const hoyISO = hoy.toISOString().split('T')[0]
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

  const [pedidosRes, productosRes, regalosCountRes, giftsHoyRes] = await Promise.all([
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
  const regalosPendientes = regalosCountRes.count || 0
  const giftsAprobadosHoy = giftsHoyRes.data || []

  const ventasRegalos = giftsAprobadosHoy.reduce((sum, g) => {
    const items = (g.items_list as { precio: number }[]) || []
    return sum + items.reduce((s, i) => s + Number(i.precio || 0), 0)
  }, 0)

  const pedidosHoy = pedidos.filter(p => {
    if (!p.creado_at) return false
    const pedidoFecha = new Date(p.creado_at).toISOString().split('T')[0]
    return pedidoFecha === hoyISO && p.estado !== 'cancelado' && p.estado !== 'rechazado'
  })

  let ventasPedidos = 0
  for (const p of pedidosHoy) {
    if (p.estado !== 'confirmado') continue
    ventasPedidos += Number(p.total || 0)
  }

  const ventasHoy = ventasPedidos + ventasRegalos
  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const ultimosPedidos = pedidos.slice(0, 5)
  const stockBajo = productos
    .filter(p => Number(p.stock) > 0 && Number(p.stock) < 5)
    .sort((a, b) => a.stock - b.stock)

  return {
    ventasHoy,
    pendientes,
    pedidosHoy: pedidosHoy.length,
    regalosPendientes,
    stockBajo: stockBajo.map(p => ({ nombre: p.nombre, stock: p.stock, id: p.id })),
    ultimosPedidos: ultimosPedidos.map(p => ({
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
  }
}
