import { NextRequest, NextResponse } from 'next/server'
import { sendPushToTienda } from '@/lib/push'

const payloads: Record<string, { title: string; body: (d: any) => string }> = {
  purchase: {
    title: '🎁 Nuevo regalo pendiente',
    body: (d) => `${d.senderName || 'Alguien'} te ha enviado un regalo para ${d.receiverName || 'alguien'}. Código: ${d.giftCode}`,
  },
  approved: {
    title: '✅ Regalo aprobado',
    body: (d) => `El regalo ${d.giftCode} fue aprobado y está reservado.`,
  },
  claimed: {
    title: '🎁 Regalo reclamado',
    body: (d) => `El regalo ${d.giftCode} fue reclamado por ${d.receiverName || 'el destinatario'}.`,
  },
  delivered: {
    title: '🚚 Regalo entregado',
    body: (d) => `El regalo ${d.giftCode} fue marcado como entregado.`,
  },
  converted: {
    title: '🎁 Regalo convertido a Gift Card',
    body: (d) => `El regalo ${d.giftCode} fue convertido a Gift Card.`,
  },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { idTienda, event, giftCode, senderName, receiverName } = body

  if (!idTienda || !event) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  const tpl = payloads[event]
  if (!tpl) {
    return NextResponse.json({ error: 'Evento desconocido' }, { status: 400 })
  }

  sendPushToTienda(idTienda, {
    title: tpl.title,
    body: tpl.body({ giftCode, senderName, receiverName }),
    data: { url: '/dashboard/regalos', giftCode },
  }).catch((e) => console.error('[push/gift-notify] error:', e))

  return NextResponse.json({ success: true })
}
