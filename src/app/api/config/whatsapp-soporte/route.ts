import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { supabase } = createAdminClient()
  if (!supabase) return NextResponse.json({ numero: '' })

  const { data } = await supabase
    .from('nexus_config')
    .select('valor')
    .eq('clave', 'whatsapp_soporte')
    .maybeSingle()

  return NextResponse.json({ numero: data?.valor || '18299999999' })
}
