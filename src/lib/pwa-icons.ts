import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

export async function generatePwaIcons(logoUrl: string, tiendaId: string): Promise<{ icon192: string; icon512: string } | null> {
  try {
    const response = await fetch(logoUrl)
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())

    const png192 = await sharp(buffer)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const png512 = await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const { supabase, error } = createAdminClient()
    if (error || !supabase) return null

    await supabase.storage.from('img_products').upload(`logos_pwa/${tiendaId}/192.png`, png192, { upsert: true, contentType: 'image/png' })
    await supabase.storage.from('img_products').upload(`logos_pwa/${tiendaId}/512.png`, png512, { upsert: true, contentType: 'image/png' })

    const { data: url192 } = supabase.storage.from('img_products').getPublicUrl(`logos_pwa/${tiendaId}/192.png`)
    const { data: url512 } = supabase.storage.from('img_products').getPublicUrl(`logos_pwa/${tiendaId}/512.png`)

    return { icon192: url192.publicUrl, icon512: url512.publicUrl }
  } catch {
    return null
  }
}
