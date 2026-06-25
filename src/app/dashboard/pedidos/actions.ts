'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import { gestionarStock } from '@/lib/stock'
import { checkTiendaActiva } from '@/lib/commercial'

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

function extraerCodigoCupon(notas: string | null): string | null {
  if (!notas) return null
  const match = notas.match(/🎫 Cupón:\s*(\S+)/)
  return match?.[1] ?? null
}

export async function actualizarEstado(formData: FormData) {
  const admin = createAdminClient()
  const supabase = admin.supabase || await createClient()
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) return
  const sessionId = session.tiendaId

  const activa = await checkTiendaActiva(supabase, sessionId)
  if (!activa.ok) return

  const pedidoId = formData.get('pedidoId') as string
  const nuevoEstado = formData.get('estado') as string

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id_tienda, is_gift, notas, cliente_telefono, cliente_nombre, detalles_pedido, giftcard_code, giftcard_used')
    .eq('id', pedidoId)
    .eq('id_tienda', sessionId)
    .single()

  await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)
    .eq('id_tienda', sessionId)

  const { data: detalles } = await supabase
    .from('detalles_pedido')
    .select('id_producto, producto, cantidad, precio_unitario, variante_seleccionada, imagen_url')
    .eq('id_pedido', pedidoId)

  if (nuevoEstado === 'rechazado' || nuevoEstado === 'cancelado' || nuevoEstado === 'devuelto') {
    console.log(`[ORDER CANCEL] Pedido ${pedidoId} → ${nuevoEstado}`)

    // Gift Card restoration
    if (pedido?.giftcard_code && (pedido?.giftcard_used || 0) > 0) {
      const { data: gc } = await supabase
        .from('gift_cards')
        .select('id')
        .eq('code', pedido.giftcard_code)
        .maybeSingle()

      if (gc) {
        const { data: gcResult, error: gcError } = await supabase
          .rpc('restaurar_giftcard_v2', {
            p_gift_card_id: gc.id,
            p_amount: pedido.giftcard_used,
          })

        if (gcError || !gcResult?.success) {
          console.error('[ORDER CANCEL] Error al restaurar Gift Card:', gcError?.message || gcResult?.error)
        } else {
          console.log('[ORDER CANCEL] Gift Card restaurada:', pedido.giftcard_code, '- Monto:', pedido.giftcard_used)
        }
      } else {
        console.error('[ORDER CANCEL] Gift Card no encontrada:', pedido.giftcard_code)
      }
    }

    // Coupon usage_count decrement
    const codigoCupon = extraerCodigoCupon(pedido?.notas ?? null)
    if (codigoCupon) {
      const { data: cuponResult, error: cuponError } = await supabase
        .rpc('decrementar_uso_cupon', {
          p_code: codigoCupon,
          p_store_id: sessionId,
        })

      if (cuponError) {
        console.error('[ORDER CANCEL] Error al decrementar uso del cupón:', cuponError.message)
      } else if (cuponResult?.success) {
        console.log('[ORDER CANCEL] Cupón restaurado:', codigoCupon, '- usage_count:', cuponResult.usage_count)
      }
    }

    // Stock restoration
    if (detalles && detalles.length > 0) {
      const items = detalles.map(d => ({
        id_producto: d.id_producto,
        nombre: d.producto || '',
        cantidad: d.cantidad || 1,
        variante_seleccionada: d.variante_seleccionada || null,
      }))
      const result = await gestionarStock(supabase, items, 'restore')
      if (!result.ok) {
        console.error('[ORDER CANCEL] Errores al restaurar inventario:', result.errors)
      } else {
        console.log('[ORDER CANCEL] Inventario restaurado')
      }
    }

    console.log('[ORDER CANCEL] Pedido cancelado:', pedidoId)
  }

  if (nuevoEstado === 'confirmado' || nuevoEstado === 'entregado') {
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

    const isGift = (pedido?.notas?.includes('🎁 Modo Regalo') ?? false) || (pedido as any)?.is_gift === true
    if (isGift) {
      const giftDetails = parseGiftDetails(pedido?.notas ?? null)

      // Dedup guard: skip if checkout already created a pending gift (Sprint 3N)
      if (giftDetails.sender_name && pedido?.id_tienda) {
        const { data: existingGift } = await supabase
          .from('gift_experiences')
          .select('id')
          .eq('store_id', pedido.id_tienda)
          .eq('sender_name', giftDetails.sender_name)
          .eq('receiver_name', giftDetails.recipient_name)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())
          .limit(1)

        if (existingGift && existingGift.length > 0) {
          console.log('[actions] Gift already exists from checkout, skipping creation')
          return redirect('/dashboard/pedidos')
        }
      }

      const code = generateTicketCode()

      if (!pedido?.id_tienda) {
        console.error('Error al crear gift: pedido sin id_tienda')
      } else {
        const itemsList = (detalles || []).map(d => ({
          product_id: d.id_producto,
          nombre: d.producto || '',
          precio: 0,
          imagen_url: d.imagen_url || null,
          cantidad: d.cantidad || 1,
          variante_seleccionada: d.variante_seleccionada || null,
        }))

        const { error: giftError } = await supabase.from('gift_experiences').insert({
          store_id: pedido.id_tienda,
          sender_name: giftDetails.sender_name,
          receiver_name: giftDetails.recipient_name,
          personal_message: giftDetails.dedication,
          gift_code: code,
          is_redeemed: false,
          status: 'pending',
          sender_phone: pedido.cliente_telefono,
          items_list: itemsList,
        })

        if (giftError) {
          console.error('Error al crear gift_experiences:', giftError.message)
        }
      }
    }
  }

  redirect('/dashboard/pedidos')
}

export async function eliminarTodosLosPedidos() {
  const admin = createAdminClient()
  const supabase = admin.supabase || await createClient()
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) return
  const sessionId = session.tiendaId

  const activa = await checkTiendaActiva(supabase, sessionId)
  if (!activa.ok) return

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

  await supabase.from('gift_experiences').delete().eq('store_id', sessionId)
  await supabase.from('detalles_pedido').delete().in('id_pedido', ids)
  await supabase.from('pedidos').delete().in('id', ids)
  redirect('/dashboard/pedidos')
}
