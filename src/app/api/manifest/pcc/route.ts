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

  const manifest = {
    name: 'Nexus PCC - Panel de Control',
    short_name: 'Nexus PCC',
    description: 'Panel de Control Corporativo de Nexus',
    start_url: '/pcc',
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#0f172a',
    theme_color: color,
    icons: [
      { src: logoUrl, sizes: '192x192', type: iconType },
      { src: logoUrl, sizes: '512x512', type: iconType },
      { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'monochrome' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
