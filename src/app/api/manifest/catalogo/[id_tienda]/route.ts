import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export async function GET(_req: Request, { params }: { params: Promise<{ id_tienda: string }> }) {
  const { id_tienda } = await params

  let nombre = 'Catálogo'
  let logoUrl = '/pwa-icon.svg'
  let color = '#7C3AED'

  try {
    const supabase = createPublicClient()
    const { data: perfil } = await supabase
      .from('perfil_tienda')
      .select('logo_url, color_primario, nombre_comercial')
      .eq('id_tienda', id_tienda)
      .maybeSingle()

    const { data: tienda } = await supabase
      .from('tiendas')
      .select('nombre_tienda')
      .eq('id', id_tienda)
      .maybeSingle()

    nombre = perfil?.nombre_comercial || tienda?.nombre_tienda || 'Catálogo'
    if (perfil?.logo_url) logoUrl = perfil.logo_url
    if (perfil?.color_primario) color = perfil.color_primario
  } catch {
    // Use defaults on error
  }

  const iconType = logoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png'

  const manifest = {
    name: `Catálogo - ${nombre}`,
    short_name: nombre,
    description: `Catálogo de productos de ${nombre}`,
    start_url: `/catalogo/${id_tienda}`,
    scope: '/catalogo/',
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#f8fafc',
    theme_color: color,
    prefer_related_applications: false,
    icons: [
      { src: logoUrl, sizes: '192x192', type: iconType },
      { src: logoUrl, sizes: '512x512', type: iconType },
      { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'monochrome' },
      { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
