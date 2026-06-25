import { createAdminClient } from '@/lib/supabase/admin'
import { gestionarStock } from '@/lib/stock'
import { sendPushToTienda } from '@/lib/push'
import { calcularPrecioLinea, calcularTotalPedido } from '@/lib/precios'
import { redeemGiftCard } from '@/lib/gift-cards'
import { NextRequest, NextResponse } from 'next/server'

function idProductoReal(item: any): string | null {
  if (item.isGift) return null
  if (item.variante_seleccionada) return item.id.replace(/-[^-]+$/, '')
  return item.id
}

export async function POST(req: NextRequest) {
  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { idTienda, nombreCliente, telefonoCliente, items, isGift, notas, couponCode, giftCardCode, giftSender, giftReceiver, giftReceiverPhone, giftMessage, giftDeliveryAddress, giftDeliveryLink, metodoPago } = body

  if (!idTienda || !nombreCliente || !items?.length) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  // ── Tracking de estado para rollback P0 ──
  let _gcConsumed = false
  let _pedidoCreado = false

  async function _safeRollback(label: string, fn: () => any) {
    try {
      await fn()
      console.log(`[CHECKOUT ROLLBACK] ${label} OK`)
    } catch (e: any) {
      console.error(`[CHECKOUT ROLLBACK] ${label} FALLÓ:`, e.message)
    }
  }

  async function _rollbackAll(opts: {
    hasStock?: boolean; stockItems?: any[];
    hasPedido?: boolean; pedidoId?: string;
    gcCode?: string | null; gcAmount?: number; gcId?: string | null;
  }) {
    console.log('[CHECKOUT ROLLBACK] Iniciando rollback...')

    if (opts.hasStock && opts.stockItems?.length) {
      const r = await gestionarStock(supabase!, opts.stockItems, 'restore')
      console.log('[CHECKOUT ROLLBACK] Rollback Stock', r.ok ? 'OK' : `FALLÓ: ${r.errors.join(', ')}`)
    }

    if (opts.hasPedido && opts.pedidoId) {
      await _safeRollback('Detalles Pedido',
        () => supabase!.from('detalles_pedido').delete().eq('id_pedido', opts.pedidoId!))
      if (opts.gcId) {
        await _safeRollback('Gift Card Link',
          () => supabase!.from('gift_card_transactions')
            .update({ order_id: null })
            .eq('gift_card_id', opts.gcId)
            .eq('order_id', opts.pedidoId!))
      }
      await _safeRollback('Pedido',
        () => supabase!.from('pedidos').delete().eq('id', opts.pedidoId!))
    }

    if (opts.gcAmount && opts.gcAmount > 0) {
      let gcId = opts.gcId
      if (!gcId && opts.gcCode) {
        const { data: gc } = await supabase!
          .from('gift_cards')
          .select('id')
          .eq('code', opts.gcCode)
          .maybeSingle()
        if (gc) gcId = gc.id
      }
      if (gcId) {
        await _safeRollback('Gift Card',
          () => supabase!.rpc('restaurar_giftcard_v2', {
            p_gift_card_id: gcId,
            p_amount: opts.gcAmount,
          }))
      }
    }

    console.log('[CHECKOUT ROLLBACK] Rollback completado')
  }

  // ───────────────────────────────────────────────
  // PASO 1: Validación de stock de todos los productos
  // ───────────────────────────────────────────────
  const allProductIds = [
    ...new Set(items.filter((i: any) => !i.isGift).map((i: any) => idProductoReal(i))),
  ].filter(Boolean) as string[]

  let productosMap: Record<string, any> = {}
  if (allProductIds.length > 0) {
    const { data: prods } = await supabase!
      .from('productos')
      .select('id, tallas, stock, stock_reservado, in_stock, precio, precio_oferta, costo_compra, aplica_impuesto, porcentaje_impuesto')
      .in('id', allProductIds)

    if (prods) {
      for (const p of prods) productosMap[p.id] = p
    }
  }

  for (const item of items) {
    if (item.isGift) continue
    const pid = idProductoReal(item)
    if (!pid) continue
    const prod = productosMap[pid]
    if (!prod) continue

    if (!prod.in_stock) {
      return NextResponse.json({
        error: `Lo sentimos, "${item.nombre}" ya no está disponible`,
        item: item.nombre,
      }, { status: 409 })
    }

    if (item.variante_seleccionada && Array.isArray(prod.tallas)) {
      const variant = prod.tallas.find((t: any) =>
        typeof t === 'object' && t.talla === item.variante_seleccionada
      )
      if (variant) {
        const disponible = (variant.stock || 0) - (prod.stock_reservado || 0)
        if (disponible < item.cantidad) {
          return NextResponse.json({
            error: `Lo sentimos, la talla (${item.variante_seleccionada}) se agotó mientras procesabas tu compra`,
            item: item.nombre,
          }, { status: 409 })
        }
      }
    } else if (!item.variante_seleccionada) {
      const disponible = (prod.stock || 0) - (prod.stock_reservado || 0)
      if (disponible < item.cantidad) {
        return NextResponse.json({
          error: `Lo sentimos, "${item.nombre}" se agotó mientras procesabas tu compra`,
          item: item.nombre,
        }, { status: 409 })
      }
    }
  }

  // ───────────────────────────────────────────────
  // PASO 2: Cálculo de precios con impuestos
  // ───────────────────────────────────────────────
  const lineasCalculadas: Array<{ entry: Record<string, any>; calculo: import('@/lib/precios').CalculoLinea }> = []

  for (const i of items) {
    const entry: Record<string, any> = {
      producto: i.nombre,
      cantidad: i.cantidad,
      precio_unitario: i.precio,
    }

    let precioUnitario = Number(i.precio)
    let aplicaImpuesto = false
    let porcentajeImpuesto: number | null = null

    if (!i.isGift) {
      const pid = idProductoReal(i)
      if (pid) {
        const prod = productosMap[pid]
        if (prod) {
          if (i.variante_seleccionada && Array.isArray(prod.tallas)) {
            entry.variante_seleccionada = i.variante_seleccionada
            const variant = prod.tallas.find((t: any) =>
              typeof t === 'object' && t.talla === i.variante_seleccionada
            )
            if (variant) {
              precioUnitario = variant.precio ?? prod.precio_oferta ?? prod.precio
              entry.precio_cobrado = precioUnitario
              entry.costo_real = variant.costo ?? prod.costo_compra ?? 0
            }
          } else {
            entry.costo_real = prod.costo_compra ?? 0
          }
          aplicaImpuesto = prod.aplica_impuesto ?? false
          porcentajeImpuesto = prod.porcentaje_impuesto ?? null
        }
      }
    }

    const calculo = calcularPrecioLinea({
      precioUnitario,
      cantidad: i.cantidad,
      aplicaImpuesto,
      porcentajeImpuesto,
    })

    entry.subtotal = calculo.subtotal
    entry.impuesto = calculo.impuesto
    entry.total = calculo.total
    entry.aplica_impuesto = aplicaImpuesto
    entry.porcentaje_impuesto = porcentajeImpuesto

    lineasCalculadas.push({ entry, calculo })
  }

  const resumen = calcularTotalPedido({
    lineas: lineasCalculadas.map(l => l.calculo),
  })

  const detallesPedido = lineasCalculadas.map(l => l.entry)
  let total = resumen.total

  // ───────────────────────────────────────────────
  // PASO 3: Validación y aplicación de cupón
  // ───────────────────────────────────────────────
  let descuento = 0
  let cuponAplicado = ''

  if (couponCode) {
    const codigo = String(couponCode).toUpperCase().trim()
    const { data: cupon } = await supabase!
      .from('coupons')
      .select('*')
      .eq('code', codigo)
      .eq('store_id', idTienda)
      .maybeSingle()

    if (!cupon) {
      return NextResponse.json({ error: 'El código de cupón no existe' }, { status: 404 })
    }

    if (!cupon.is_active) {
      return NextResponse.json({ error: 'Este cupón ya no está activo' }, { status: 400 })
    }

    if (cupon.usage_limit > 0 && cupon.usage_count >= cupon.usage_limit) {
      return NextResponse.json({ error: 'Este cupón ya ha alcanzado su límite de usos' }, { status: 400 })
    }

    if (cupon.min_purchase_amount > 0 && total < cupon.min_purchase_amount) {
      return NextResponse.json({
        error: `Este cupón requiere una compra mínima de RD$${Number(cupon.min_purchase_amount).toLocaleString('es-DO')}`,
      }, { status: 400 })
    }

    if (cupon.discount_type === 'percentage') {
      descuento = total * (Number(cupon.value) / 100)
    } else {
      descuento = Number(cupon.value)
    }

    descuento = Math.min(descuento, total)
    total = Math.round((total - descuento) * 100) / 100
    cuponAplicado = codigo
  }

  // ───────────────────────────────────────────────
  // PASO 4: Aplicar Gift Card (si se proporcionó)
  // ───────────────────────────────────────────────
  let giftcardUsado = 0
  let giftcardCodigo: string | null = null
  let giftcardId: string | null = null

  if (giftCardCode && !isGift) {
    const gcResult = await redeemGiftCard(
      String(giftCardCode).toUpperCase().trim(),
      idTienda,
      total,
    )

    if (!gcResult.success) {
      return NextResponse.json({ error: gcResult.error || 'Error al aplicar Gift Card' }, { status: 400 })
    }

    giftcardUsado = gcResult.consumed || 0
    giftcardCodigo = String(giftCardCode).toUpperCase().trim()
    giftcardId = gcResult.giftCardId || null
    _gcConsumed = giftcardUsado > 0
    total = Math.round((total - giftcardUsado) * 100) / 100

    if (total < 0) total = 0
  }

  // ───────────────────────────────────────────────
  // PASO 5: Creación de la orden
  // ───────────────────────────────────────────────
  const orderId = Array.from(crypto.getRandomValues(new Uint8Array(8)), b =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36]
  ).join('')

  const notasFinales = [notas || null]
  if (isGift) {
    notasFinales.push('🎁 Modo Regalo')
  }
  if (cuponAplicado) {
    notasFinales.push(`🎫 Cupón: ${cuponAplicado} - RD$${descuento.toLocaleString('es-DO')} descuento`)
  }
  if (giftcardCodigo) {
    notasFinales.push(`💳 Gift Card: ${giftcardCodigo} - RD$${giftcardUsado.toLocaleString('es-DO')} consumo`)
  }

  const { data: pedido, error: pedidoError } = await supabase!
    .from('pedidos')
    .insert({
      id_tienda: idTienda,
      cliente_nombre: nombreCliente.trim(),
      cliente_telefono: telefonoCliente?.trim() || null,
      notas: notasFinales.filter(Boolean).join(' | ') || null,
      order_id: orderId,
      total,
      estado: 'pendiente',
      detalles_pedido: detallesPedido,
      metodo_pago: metodoPago || null,
      giftcard_code: giftcardCodigo,
      giftcard_used: giftcardUsado,
    })
    .select()
    .single()

  if (pedidoError || !pedido) {
    await _rollbackAll({ gcCode: giftcardCodigo, gcAmount: _gcConsumed ? giftcardUsado : 0, gcId: giftcardId })
    return NextResponse.json({ error: pedidoError?.message || 'Error al crear pedido' }, { status: 500 })
  }
  _pedidoCreado = true

  if (giftcardId && giftcardUsado > 0 && pedido) {
    const { error: linkError } = await supabase!
      .from('gift_card_transactions')
      .update({ order_id: pedido.id })
      .eq('gift_card_id', giftcardId)
      .eq('order_id', null)
      .eq('type', 'redemption')
    if (linkError) {
      await _rollbackAll({
        hasPedido: true, pedidoId: pedido.id,
        gcCode: giftcardCodigo, gcAmount: _gcConsumed ? giftcardUsado : 0, gcId: giftcardId,
      })
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }
  }

  const detalles = items.map((item: any) => ({
    id_pedido: pedido.id,
    id_producto: idProductoReal(item),
    producto: item.nombre,
    cantidad: item.cantidad,
    precio_unitario: item.precio,
  }))

  const { error: detError } = await supabase!.from('detalles_pedido').insert(detalles)
  if (detError) {
    await _rollbackAll({
      hasPedido: true, pedidoId: pedido.id,
      gcCode: giftcardCodigo, gcAmount: _gcConsumed ? giftcardUsado : 0, gcId: giftcardId,
    })
    return NextResponse.json({ error: detError.message }, { status: 500 })
  }

  // ───────────────────────────────────────────────
  // PASO 6: Incrementar uso del cupón
  // ───────────────────────────────────────────────
  // We stored the coupon id in the validation step — look it up and increment
  if (cuponAplicado) {
    const { data: cuponActual } = await supabase!
      .from('coupons')
      .select('usage_count')
      .eq('code', cuponAplicado)
      .eq('store_id', idTienda)
      .maybeSingle()
    if (cuponActual) {
      await supabase!
        .from('coupons')
        .update({ usage_count: (cuponActual.usage_count || 0) + 1 })
        .eq('code', cuponAplicado)
        .eq('store_id', idTienda)
    }
  }

  // ───────────────────────────────────────────────
  // PASO 7: Descontar stock híbrido (centralizado)
  // ───────────────────────────────────────────────
  const stockItems = items
    .filter((i: any) => !i.isGift && i.precio !== 0 && idProductoReal(i))
    .map((i: any) => ({
      id_producto: idProductoReal(i),
      nombre: i.nombre,
      cantidad: i.cantidad,
      variante_seleccionada: i.variante_seleccionada,
    }))

  const stockResult = await gestionarStock(supabase!, stockItems, 'deduct')
  if (!stockResult.ok) {
    console.error('[API Checkout] Error al descontar stock, ejecutando rollback completo:', stockResult.errors)
    await _rollbackAll({
      hasStock: true, stockItems,
      hasPedido: true, pedidoId: pedido.id,
      gcCode: giftcardCodigo, gcAmount: _gcConsumed ? giftcardUsado : 0, gcId: giftcardId,
    })
    return NextResponse.json({ error: 'Error al procesar el pedido. Intenta de nuevo.' }, { status: 500 })
  }

  sendPushToTienda(idTienda, {
    title: '¡Nuevo pedido!',
    body: `Cliente: ${nombreCliente.trim()} — $${total.toLocaleString('es-DO')}`,
    data: { url: '/dashboard/pedidos', id_pedido: pedido.id, id_tienda: idTienda },
  }).catch((e) => console.error('[API Checkout] push error', e))

  // ───────────────────────────────────────────────
  // PASO 8: Crear gift_experiences si es modo regalo
  // ───────────────────────────────────────────────
  if (isGift && giftSender) {
    const giftCode = Array.from(crypto.getRandomValues(new Uint8Array(10)), b =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36]
    ).join('')

    const giftItemsList = items
      .filter((i: any) => !i.isGift)
      .map((i: any) => ({
        product_id: idProductoReal(i) || i.id,
        nombre: i.nombre,
        precio: Number(i.precio) || 0,
        imagen_url: i.imagen_url || null,
        cantidad: i.cantidad || 1,
        variante_seleccionada: i.variante_seleccionada || null,
      }))

    const { error: giftError } = await supabase!
      .from('gift_experiences')
      .insert({
        store_id: idTienda,
        sender_name: giftSender.trim(),
        sender_phone: telefonoCliente?.trim() || null,
        receiver_name: giftReceiver?.trim() || '',
        receiver_phone: giftReceiverPhone?.trim() || null,
        personal_message: giftMessage?.trim() || null,
        gift_code: giftCode,
        status: 'pending',
        items_list: giftItemsList,
        delivery_address: giftDeliveryAddress?.trim() || null,
        delivery_location_link: giftDeliveryLink?.trim() || null,
      })

    if (giftError) {
      console.error('[Checkout] Error al crear gift_experiences:', giftError.message)
    } else {
      sendPushToTienda(idTienda, {
        title: '🎁 Nuevo regalo pendiente',
        body: `${giftSender.trim()} te ha enviado un regalo para ${giftReceiver?.trim() || ''}. Código: ${giftCode}`,
        data: { url: '/dashboard/regalos', giftCode },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ pedido: { id: pedido.id, total, order_id: orderId } })
}
