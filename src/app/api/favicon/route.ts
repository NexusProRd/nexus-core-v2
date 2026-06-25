import { getSession } from '@/lib/auth/get-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await getSession(req)

  if (session.valid && session.tiendaId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('perfil_tienda')
      .select('logo_url')
      .eq('id_tienda', session.tiendaId)
      .maybeSingle()

    if (data?.logo_url) {
      return NextResponse.redirect(data.logo_url, 302)
    }
  }

  const admin = createAdminClient()
  if (admin.supabase && !admin.error) {
    const { data: config } = await admin.supabase
      .from('nexus_config')
      .select('valor')
      .eq('clave', 'landing_logo_url')
      .maybeSingle()

    if (config?.valor) {
      return NextResponse.redirect(config.valor, 302)
    }
  }

  return NextResponse.redirect(new URL('/favicon.svg', req.url), 302)
}
