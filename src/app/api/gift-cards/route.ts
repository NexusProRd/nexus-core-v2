import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { data } = await supabase!
    .from('gift_cards')
    .select('*, gift_experiences!original_gift_id(gift_code)')
    .eq('store_id', session.tiendaId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: data || [] })
}
