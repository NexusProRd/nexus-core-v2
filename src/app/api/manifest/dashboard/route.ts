import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'

export async function GET() {
  let nombre = 'Dashboard'
  let logoUrl = '/pwa-icon.svg'
  let color = '#7C3AED'

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.id) {
      const publicSupabase = createPublicClient()
      const { data: perfil } = await publicSupabase
        .from('perfil_tienda')
        .select('logo_url, color_primario, nombre_comercial, id_tienda')
        .eq('id_usuario', user.id)
        .maybeSingle()

      if (perfil) {
        nombre = perfil.nombre_comercial || 'Dashboard'
        if (perfil.logo_url) logoUrl = perfil.logo_url
        if (perfil.color_primario) color = perfil.color_primario
      }
    }
  } catch {
    // Use defaults on error
  }

  const iconType = logoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png'

  const manifest = {
    name: `Dashboard - ${nombre}`,
    short_name: nombre,
    description: `Panel de administración de ${nombre}`,
    start_url: '/dashboard',
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#f8fafc',
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
