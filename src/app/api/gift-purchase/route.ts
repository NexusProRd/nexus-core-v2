import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { gestionarStock } from '@/lib/stock'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { idTienda, sender, senderPhone, receiver, message, items, giftCode } = body

  if (!idTienda || !sender?.trim() || !senderPhone?.trim() || !receiver?.trim() || !items?.length) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  if (idTienda !== sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // ── Validación de stock y variantes ──
  const productIds = items.map((p: any) => p.product_id)
  const { data: stockCheck, error: stockCheckError } = await supabase!
    .from('productos')
    .select('id, stock, stock_reservado, in_stock, tallas')
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

  // ── Insertar gift con status RESERVED ──
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
      personal_message: message?.trim() || null,
      gift_code: giftCode,
      status: 'RESERVED',
      items_list: itemsList,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // ── Reservar stock (compensación: DELETE si falla) ──
  const stockItems = items.map((p: any) => ({
    id_producto: p.product_id,
    nombre: p.nombre,
    cantidad: 1,
  }))

  const reserveResult = await gestionarStock(supabase!, stockItems, 'reserve')
  if (!reserveResult.ok) {
    await supabase!.from('gift_experiences').delete().eq('gift_code', giftCode)
    return NextResponse.json({ error: 'No se pudo reservar el stock. Intenta de nuevo.' }, { status: 409 })
  }

  const giftLink = `/canje?gift=${giftCode}&id=${idTienda}`

  return NextResponse.json({ giftId: newGift.id, giftCode, giftLink })
}
