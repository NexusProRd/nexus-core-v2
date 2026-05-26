import { createAdminClient } from '@/lib/supabase/admin'

export async function sendWhatsAppAlert(mensaje: string) {
  try {
    const { supabase } = createAdminClient()
    if (!supabase) return

    const [apiKeyRes, soporteRes] = await Promise.all([
      supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_api_key').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle(),
    ])

    const apiKey = apiKeyRes.data?.valor
    const soporteNum = soporteRes.data?.valor

    if (!apiKey || !soporteNum) {
      console.warn('[WhatsApp] whatsapp_api_key o whatsapp_soporte no configurados. Alerta:\n' + mensaje)
      return
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(soporteNum)}&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apiKey)}`

    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) console.error('[WhatsApp] Error al enviar alerta:', res.status, await res.text())
  } catch (err) {
    console.error('[WhatsApp] Error:', err)
  }
}
