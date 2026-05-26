import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { supabase } = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'No DB' }, { status: 500 })

  const { data } = await supabase
    .from('nexus_login_vigilado')
    .select('*')
    .eq('notificado', false)
    .eq('ignorado', false)
    .order('fecha', { ascending: false })

  return NextResponse.json({ alertas: data || [] })
}

export async function POST(req: Request) {
  const { id, action } = await req.json()
  const { supabase } = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'No DB' }, { status: 500 })

  const update: Record<string, boolean> = {}
  if (action === 'notificar') update.notificado = true
  if (action === 'ignorar') update.ignorado = true

  await supabase.from('nexus_login_vigilado').update(update).eq('id', id)
  return NextResponse.json({ success: true })
}
