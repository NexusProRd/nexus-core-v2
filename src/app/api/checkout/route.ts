import { createAdminClient } from '@/lib/supabase/admin'
import { gestionarStock } from '@/lib/stock'
import { NextRequest, NextResponse } from 'next/server'

function idProductoReal(item: any): string | null {
  if (item.isGift) return null
  if (item.variante_seleccionada) return item.id.replace(/-[^-]+$/, '')
  return item.id
}

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { idTienda, nombreCliente, telefonoCliente, items, isGift, notas, couponCode } = body

  if (!idTienda || !nombreCliente || !items?.length) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
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
      .select('id, tallas, stock, in_stock, precio, precio_oferta, costo_compra')
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
      if (variant && variant.stock < item.cantidad) {
        return NextResponse.json({
          error: `Lo sentimos, la talla (${item.variante_seleccionada}) se agotó mientras procesabas tu compra`,
          item: item.nombre,
        }, { status: 409 })
      }
    } else if (!item.variante_seleccionada && (prod.stock || 0) < item.cantidad) {
      return NextResponse.json({
        error: `Lo sentimos, "${item.nombre}" se agotó mientras procesabas tu compra`,
        item: item.nombre,
      }, { status: 409 })
    }
  }

  // ───────────────────────────────────────────────
  // PASO 2: Inyección segura del costo en privado
  // ───────────────────────────────────────────────
  const detallesPedido = await Promise.all(items.map(async (i: any) => {
    const entry: Record<string, any> = {
      producto: i.nombre,
      cantidad: i.cantidad,
      precio_unitario: i.precio,
    }

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
              entry.precio_cobrado = variant.precio ?? prod.precio_oferta ?? prod.precio
              entry.costo_real = variant.costo ?? prod.costo_compra ?? 0
            }
          } else {
            entry.costo_real = prod.costo_compra ?? 0
          }
        }
      }
    }

    return entry
  }))

  let total = detallesPedido.reduce((sum: number, i: any) => {
    const p = i.precio_cobrado ?? i.precio_unitario
    return sum + Number(p) * i.cantidad
  }, 0)

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
  // PASO 4: Creación de la orden
  // ───────────────────────────────────────────────
  const orderId = Array.from(crypto.getRandomValues(new Uint8Array(8)), b =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36]
  ).join('')

  const notasFinales = [notas || null]
  if (cuponAplicado) {
    notasFinales.push(`🎫 Cupón: ${cuponAplicado} - RD$${descuento.toLocaleString('es-DO')} descuento`)
  }

  const { data: pedido, error: pedidoError } = await supabase!
    .from('pedidos')
    .insert({
      id_tienda: idTienda,
      cliente_nombre: nombreCliente.trim(),
      cliente_telefono: telefonoCliente?.trim() || null,
      is_gift: !!isGift,
      notas: notasFinales.filter(Boolean).join(' | ') || null,
      order_id: orderId,
      total,
      estado: 'pendiente',
      detalles_pedido: detallesPedido,
    })
    .select()
    .single()

  if (pedidoError || !pedido) {
    return NextResponse.json({ error: pedidoError?.message || 'Error al crear pedido' }, { status: 500 })
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
    return NextResponse.json({ error: detError.message }, { status: 500 })
  }

  // ───────────────────────────────────────────────
  // PASO 5: Incrementar uso del cupón
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
  // PASO 6: Descontar stock híbrido (centralizado)
  // ───────────────────────────────────────────────
  const stockResult = await gestionarStock(
    supabase!,
    items
      .filter((i: any) => !i.isGift && i.precio !== 0 && idProductoReal(i))
      .map((i: any) => ({
        id_producto: idProductoReal(i),
        nombre: i.nombre,
        cantidad: i.cantidad,
        variante_seleccionada: i.variante_seleccionada,
      })),
    'deduct'
  )
  if (!stockResult.ok) {
    console.error('[API Checkout] Errores al descontar stock:', stockResult.errors)
  }

  const giftItems = items.filter((i: any) => i.isGift)
  for (const giftItem of giftItems) {
    const match = giftItem.id?.match(/^gift-([a-f0-9-]+)-/)
    if (!match) continue
    const originalOrderId = match[1]
    const { data: ticket } = await supabase!
      .from('tickets')
      .select('gift_details')
      .eq('order_id', originalOrderId)
      .maybeSingle()
    if (ticket) {
      const details = (ticket.gift_details as Record<string, unknown>) || {}
      await supabase!
        .from('tickets')
        .update({ gift_details: { ...details, id_pedido: pedido.id } })
        .eq('order_id', originalOrderId)
    }
  }

  return NextResponse.json({ pedido: { id: pedido.id, total, order_id: orderId } })
}
