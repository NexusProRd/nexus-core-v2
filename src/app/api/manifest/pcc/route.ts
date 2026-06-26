import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  let logoUrl = '/pwa-icon.svg'
  let color = '#7C3AED'

  try {
    const { supabase, error } = createAdminClient()
    if (supabase && !error) {
      const { data: logoData } = await supabase
        .from('nexus_config')
        .select('valor')
        .eq('clave', 'landing_logo_url')
        .maybeSingle()
      if (logoData?.valor) logoUrl = logoData.valor
    }
  } catch {
    // Use defaults on error
  }

  const iconType = logoUrl.endsWith('.svg') ? 'image/svg+xml' : logoUrl.endsWith('.png') ? 'image/png' : 'image/webp'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = []

  if (supabaseUrl) {
    icons.push(
      { src: `${supabaseUrl}/storage/v1/object/public/img_products/logos_pwa/pcc/192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${supabaseUrl}/storage/v1/object/public/img_products/logos_pwa/pcc/512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${supabaseUrl}/storage/v1/object/public/img_products/logos_pwa/pcc/maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    )
  }

  icons.push(
    { src: logoUrl, sizes: '192x192', type: iconType },
    { src: logoUrl, sizes: '512x512', type: iconType },
    { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'monochrome' },
    { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
  )

  const manifest = {
    name: 'Nexus PCC - Panel de Control',
    short_name: 'Nexus PCC',
    description: 'Panel de Control Corporativo de Nexus',
    start_url: '/pcc',
    scope: '/pcc',
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#0f172a',
    theme_color: color,
    prefer_related_applications: false,
    icons,
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
