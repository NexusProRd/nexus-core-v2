import { createAdminClient } from '@/lib/supabase/admin'

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  vibrate?: number[]
  data?: Record<string, unknown>
}

let webpush: any = null

function getWebpush() {
  if (webpush) return webpush
  try {
    webpush = require('web-push')
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT

    if (!publicKey || !privateKey || !subject) {
      console.warn('[Push Server] VAPID keys missing:', { publicKey: !!publicKey, privateKey: !!privateKey, subject: !!subject })
      return null
    }

    webpush.setVapidDetails(subject, publicKey, privateKey)
    return webpush
  } catch {
    console.warn('[Push] web-push not available')
    return null
  }
}

export async function sendPushToTienda(idTienda: string, payload: PushPayload) {
  const wp = getWebpush()
  if (!wp) return { sent: 0, failed: 0 }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) return { sent: 0, failed: 0 }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('id_tienda', idTienda)

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  console.log('[Push Server] sending to', subs.length, 'subscriptions')
  for (const sub of subs) {
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      console.log('[Push Server] sent to', sub.endpoint.slice(0, 50) + '...')
      sent++
    } catch (err: any) {
      console.error('[Push Server] error', err.statusCode, err.message)
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
      failed++
    }
  }

  console.log('[Push Server] done — sent:', sent, 'failed:', failed)
  return { sent, failed }
}
