'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import { gestionarStock } from '@/lib/stock'

function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(10)
  crypto.getRandomValues(array)
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

function parseGiftDetails(notas: string | null): { sender_name: string; recipient_name: string; dedication: string } {
  if (!notas) return { sender_name: '', recipient_name: '', dedication: '' }
  const senderMatch = notas.match(/De:\s*(.+?),/)
  const receiverMatch = notas.match(/Para:\s*(.+?)(?:,|$)/)
  const msgMatch = notas.match(/Msj:\s*"(.+?)"/)
  return {
    sender_name: senderMatch ? senderMatch[1].trim() : '',
    recipient_name: receiverMatch ? receiverMatch[1].trim() : '',
    dedication: msgMatch ? msgMatch[1].trim() : '',
  }
}

export async function actualizarEstado(formData: FormData) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) return
  const sessionId = session.tiendaId

  const pedidoId = formData.get('pedidoId') as string
  const nuevoEstado = formData.get('estado') as string

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('is_gift, id_tienda, notas, cliente_telefono, cliente_nombre, detalles_pedido')
    .eq('id', pedidoId)
    .single()

  await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)
    .eq('id_tienda', sessionId)

  if (nuevoEstado === 'rechazado' || nuevoEstado === 'cancelado' || nuevoEstado === 'devuelto') {
    const { data: detalles } = await supabase
      .from('detalles_pedido')
      .select('id_producto, producto, cantidad, variante_seleccionada')
      .eq('id_pedido', pedidoId)

    if (detalles && detalles.length > 0) {
      const items = detalles.map(d => ({
        id_producto: d.id_producto,
        nombre: d.producto || '',
        cantidad: d.cantidad || 1,
        variante_seleccionada: d.variante_seleccionada || null,
      }))
      const result = await gestionarStock(supabase, items, 'restore')
      if (!result.ok) {
        console.error('[actualizarEstado] Errores al restaurar stock:', result.errors)
      }
    }
  }

  if (nuevoEstado === 'confirmado' || nuevoEstado === 'entregado') {
    const { data: detalles } = await supabase
      .from('detalles_pedido')
      .select('id_producto, cantidad, precio_unitario')
      .eq('id_pedido', pedidoId)

    if (detalles && detalles.length > 0) {
      let gananciaNeta = 0
      for (const d of detalles) {
        if (d.id_producto) {
          const { data: prod } = await supabase
            .from('productos')
            .select('costo_compra')
            .eq('id', d.id_producto)
            .single()
          if (prod) {
            gananciaNeta += (d.precio_unitario - (prod.costo_compra || 0)) * d.cantidad
          }
        }
      }
      if (gananciaNeta !== 0) {
        await supabase.from('pedidos').update({ ganancia_neta: gananciaNeta }).eq('id', pedidoId)
      }
    }

    const isGift = pedido?.is_gift || (pedido?.notas?.includes('🎁 Modo Regalo') ?? false)
    if (isGift) {
      const code = generateTicketCode()
      const giftDetails = parseGiftDetails(pedido?.notas ?? null)

      if (!pedido?.id_tienda) {
        console.error('Error al crear ticket: pedido sin id_tienda')
      } else {
        const { error: ticketError } = await supabase.from('tickets').insert({
          order_id: pedidoId,
          store_id: pedido.id_tienda,
          code,
          gift_details: {
            sender_name: giftDetails.sender_name,
            recipient_name: giftDetails.recipient_name,
            dedication: giftDetails.dedication,
          },
        })

        if (ticketError) {
          console.error('Error al crear ticket de regalo:', ticketError.message)
        }
      }
    }
  }

  redirect('/dashboard/pedidos')
}

export async function eliminarTodosLosPedidos() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) return
  const sessionId = session.tiendaId

  const { data: pedidos } = await supabase.from('pedidos').select('id').eq('id_tienda', sessionId)
  if (!pedidos || pedidos.length === 0) { redirect('/dashboard/pedidos'); return }

  const ids = pedidos.map(p => p.id)

  // Restaurar stock antes de eliminar
  const { data: detalles } = await supabase
    .from('detalles_pedido')
    .select('id_producto, producto, cantidad, variante_seleccionada')
    .in('id_pedido', ids)

  if (detalles && detalles.length > 0) {
    const items = detalles.map(d => ({
      id_producto: d.id_producto,
      nombre: d.producto || '',
      cantidad: d.cantidad || 1,
      variante_seleccionada: d.variante_seleccionada || null,
    }))
    const result = await gestionarStock(supabase, items, 'restore')
    if (!result.ok) {
      console.error('[eliminarTodosLosPedidos] Errores al restaurar stock:', result.errors)
    }
  }

  await supabase.from('tickets').delete().in('order_id', ids)
  await supabase.from('detalles_pedido').delete().in('id_pedido', ids)
  await supabase.from('pedidos').delete().in('id', ids)
  redirect('/dashboard/pedidos')
}
