import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId)
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const body = await req.json()
  const { subscription, user_agent } = body

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Faltan datos de suscripción' }, { status: 400 })
  }

  const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
    {
      id_tienda: sessionId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: user_agent || null,
    },
    { onConflict: 'id_tienda,endpoint', ignoreDuplicates: false }
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId)
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const { endpoint } = await req.json()
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 })
  }

  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('id_tienda', sessionId)

  return NextResponse.json({ success: true })
}
