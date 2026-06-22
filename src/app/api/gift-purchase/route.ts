import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToTienda } from '@/lib/push'

export async function POST(req: NextRequest) {
  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { idTienda, sender, senderPhone, receiver, receiverPhone, message, items, giftCode, delivery_address, delivery_location_link } = body

  if (!idTienda || !sender?.trim() || !senderPhone?.trim() || !receiver?.trim() || !items?.length) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  const productIds = items.map((p: any) => p.product_id)
  const { data: stockCheck, error: stockCheckError } = await supabase!
    .from('productos')
    .select('id, stock, stock_reservado, in_stock, tallas, costo_compra')
    .in('id', productIds)

  if (stockCheckError) {
    return NextResponse.json({ error: stockCheckError.message }, { status: 500 })
  }

  const noDisponibles = stockCheck?.filter(p => {
    if (!p.in_stock) return true
    if (Array.isArray(p.tallas) && p.tallas.length > 0) return true
    const disponible = (p.stock || 0) - (p.stock_reservado || 0)
    return disponible <= 0
  }) || []
  if (noDisponibles.length > 0) {
    return NextResponse.json({ error: 'Algunos productos seleccionados ya no están disponibles o tienen variantes.' }, { status: 409 })
  }

  const costMap = new Map<string, number>()
  stockCheck?.forEach(p => costMap.set(p.id, p.costo_compra || 0))

  const itemsList = items.map((p: any) => ({
    product_id: p.product_id,
    nombre: p.nombre,
    precio: p.precio,
    imagen_url: p.imagen_url,
  }))

  const { data: newGift, error: insertError } = await supabase!
    .from('gift_experiences')
    .insert({
      store_id: idTienda,
      sender_name: sender.trim(),
      sender_phone: senderPhone.trim(),
      receiver_name: receiver.trim(),
      receiver_phone: receiverPhone?.trim() || null,
      personal_message: message?.trim() || null,
      gift_code: giftCode,
      status: 'pending',
      items_list: itemsList,
      delivery_address: delivery_address?.trim() || null,
      delivery_location_link: delivery_location_link?.trim() || null,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const total = items.reduce((sum: number, p: any) => sum + Number(p.precio || 0), 0)

  const { error: pedidoError } = await supabase!
    .from('pedidos')
    .insert({
      id_tienda: idTienda,
      cliente_nombre: sender.trim(),
      cliente_telefono: senderPhone.trim(),
      total,
      estado: 'pendiente',
      notas: '🎁 Modo Regalo',
      detalles_pedido: items.map((p: any) => ({
        id_producto: p.product_id,
        producto: p.nombre,
        cantidad: 1,
        precio_unitario: p.precio,
        costo_real: costMap.get(p.product_id) || 0,
        subtotal: p.precio,
        total: p.precio,
        impuesto: 0,
        aplica_impuesto: false,
        porcentaje_impuesto: null,
      })),
      order_id: crypto.randomUUID(),
    })

  if (pedidoError) {
    console.error('[gift-purchase] Error al crear pedido:', pedidoError)
  }

  sendPushToTienda(idTienda, {
    title: '🎁 Nuevo regalo pendiente',
    body: `${sender.trim()} te ha enviado un regalo para ${receiver.trim()}. Código: ${giftCode}`,
    data: { url: '/dashboard/regalos', giftCode },
  }).catch((e) => console.error('[gift-purchase] push error:', e))

  return NextResponse.json({ success: true, giftId: newGift.id, giftCode, status: 'pending' })
}
