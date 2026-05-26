import { createAdminClient } from '@/lib/supabase/admin'
import { gestionarStock } from '@/lib/stock'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { idTienda, sender, senderPhone, receiver, message, items, giftCode, whatsappNumber } = body

  if (!idTienda || !sender?.trim() || !senderPhone?.trim() || !receiver?.trim() || !items?.length) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  if (idTienda !== sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const productIds = items.map((p: any) => p.product_id)
  const { data: stockCheck, error: stockCheckError } = await supabase!
    .from('productos')
    .select('id, stock, in_stock')
    .in('id', productIds)

  if (stockCheckError) {
    return NextResponse.json({ error: stockCheckError.message }, { status: 500 })
  }

  const agotados = stockCheck?.filter(p => !p.in_stock || p.stock <= 0) || []
  if (agotados.length > 0) {
    return NextResponse.json({ error: 'Algunos productos seleccionados ya no están disponibles.' }, { status: 409 })
  }

  const itemsList = items.map((p: any) => ({
    product_id: p.product_id,
    nombre: p.nombre,
    precio: p.precio,
    imagen_url: p.imagen_url,
  }))

  const { error: insertError } = await supabase!
    .from('gift_experiences')
    .insert({
      store_id: idTienda,
      sender_name: sender.trim(),
      sender_phone: senderPhone.trim(),
      receiver_name: receiver.trim(),
      personal_message: message?.trim() || null,
      gift_code: giftCode,
      is_redeemed: false,
      items_list: itemsList,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Deduct stock for each gift item
  const stockResult = await gestionarStock(
    supabase!,
    items.map((p: any) => ({
      id_producto: p.product_id,
      nombre: p.nombre,
      cantidad: 1,
      variante_seleccionada: p.variante_seleccionada || null,
    })),
    'deduct'
  )
  if (!stockResult.ok) {
    console.error('[API gift-purchase] Errores al descontar stock:', stockResult.errors)
  }

  const itemsText = items.map((p: any) => p.nombre).join(', ')
  const whatsappMsg = `¡Hola! Quiero comprar un Regalo. 🎁\nDe: ${sender.trim()}\nPara: ${receiver.trim()}\nProductos: ${itemsText}\nCódigo: ${giftCode}\nMensaje: ${message?.trim() || 'Sin mensaje'}`
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`

  return NextResponse.json({ success: true, giftCode, whatsappUrl })
}
