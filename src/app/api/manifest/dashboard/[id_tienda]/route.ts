import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export async function GET(_req: Request, { params }: { params: Promise<{ id_tienda: string }> }) {
  const { id_tienda } = await params

  let nombre = 'Dashboard'
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

    nombre = perfil?.nombre_comercial || tienda?.nombre_tienda || 'Dashboard'
    if (perfil?.logo_url) logoUrl = perfil.logo_url
    if (perfil?.color_primario) color = perfil.color_primario
  } catch {
  }

  const iconType = logoUrl.endsWith('.svg') ? 'image/svg+xml' : logoUrl.endsWith('.png') ? 'image/png' : 'image/webp'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = []

  if (supabaseUrl) {
    icons.push({ src: `${supabaseUrl}/storage/v1/object/public/img_products/logos_pwa/${id_tienda}/192.png`, sizes: '192x192', type: 'image/png' })
    icons.push({ src: `${supabaseUrl}/storage/v1/object/public/img_products/logos_pwa/${id_tienda}/512.png`, sizes: '512x512', type: 'image/png' })
    icons.push({ src: `${supabaseUrl}/storage/v1/object/public/img_products/logos_pwa/${id_tienda}/maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' })
  }

  icons.push(
    { src: logoUrl, sizes: '192x192', type: iconType },
    { src: logoUrl, sizes: '512x512', type: iconType },
    { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'monochrome' },
    { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
  )

  const manifest = {
    name: `Dashboard - ${nombre}`,
    short_name: nombre,
    description: `Panel de administración de ${nombre}`,
    start_url: '/dashboard',
    scope: '/dashboard',
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#f8fafc',
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
