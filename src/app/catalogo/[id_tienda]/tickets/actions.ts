'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface TicketData {
  is_redeemed: boolean
  created_at: string
  gift_details: unknown
  store_id: string
  order_id: string | null
}

interface TicketResult {
  data: TicketData | null
  error: 'INVALID' | 'EXPIRED' | 'REDEEMED' | null
}

export async function getTicketByCode(code: string, storeId: string): Promise<TicketResult> {
  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('is_redeemed, created_at, gift_details, store_id, order_id')
    .eq('code', code)
    .eq('store_id', storeId)
    .maybeSingle()

  if (!ticket) return { data: null, error: 'INVALID' }

  const createdAt = new Date(ticket.created_at)
  const now = new Date()
  const diffHoras = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

  if (diffHoras > 72) return { data: ticket, error: 'EXPIRED' }
  if (ticket.is_redeemed) return { data: ticket, error: 'REDEEMED' }

  return { data: ticket, error: null }
}

export async function getOrderProducts(orderId: string) {
  const supabase = await createClient()

  // Intentar desde detalles_pedido (tabla relacionada)
  const { data: detalles } = await supabase
    .from('detalles_pedido')
    .select('id_producto, producto, cantidad')
    .eq('id_pedido', orderId)

  let items: { id_producto: string | null; producto: string; cantidad: number }[] = []

  if (detalles && detalles.length > 0) {
    items = detalles
  } else {
    // FALLBACK: leer el JSONB del pedido directamente
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('detalles_pedido')
      .eq('id', orderId)
      .maybeSingle()

    if (!pedido?.detalles_pedido) return []

    const jsonb = Array.isArray(pedido.detalles_pedido)
      ? pedido.detalles_pedido
      : [pedido.detalles_pedido]

    items = jsonb.map((d: any, i: number) => ({
      id_producto: null,
      producto: d.producto || d.producto_nombre || d.nombre || `Producto ${i + 1}`,
      cantidad: d.cantidad || 1,
    }))
  }

  // Consultar productos por ID válidos para obtener imágenes/nombres reales
  const validIds = items.map(d => d.id_producto).filter(Boolean) as string[]
  const prodsMap = new Map<string, { id: string; nombre: string; imagen_url: string | null }>()

  if (validIds.length > 0) {
    const { data: prods } = await supabase
      .from('productos')
      .select('id, nombre, imagen_url')
      .in('id', validIds)
    if (prods) {
      for (const p of prods) {
        prodsMap.set(p.id, p)
      }
    }
  }

  return items.map(d => {
    const prod = d.id_producto ? prodsMap.get(d.id_producto) : undefined
    return {
      id: d.id_producto || `gift-${orderId}-${d.producto?.replace(/\s+/g, '-')}`,
      nombre: prod?.nombre || d.producto || 'Producto',
      precio: 0,
      imagen_url: prod?.imagen_url || null,
      cantidad: d.cantidad || 1,
    }
  })
}

export async function markTicketRedeemed(code: string, storeId: string) {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) return { error: adminError || 'Error de configuración del servidor' }
  const { error } = await supabase
    .from('tickets')
    .update({ is_redeemed: true })
    .eq('code', code)
    .eq('store_id', storeId)
    .eq('is_redeemed', false)
  return { error: error?.message || null }
}
