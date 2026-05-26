import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { data } = await supabase!
    .from('coupons')
    .select('*')
    .eq('store_id', sessionId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: data || [] })
}

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { code, discount_type, value, min_purchase_amount, usage_limit } = body

  if (!code?.trim() || !discount_type || value == null) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  const { error: insertError } = await supabase!
    .from('coupons')
    .insert({
      store_id: sessionId,
      code: code.trim().toUpperCase(),
      discount_type,
      value,
      min_purchase_amount: min_purchase_amount || 0,
      usage_limit: usage_limit || 0,
      usage_count: 0,
      is_active: true,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const sessionId = req.cookies.get('nx_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { id, is_active } = body

  if (!id) {
    return NextResponse.json({ error: 'Falta id del cupón' }, { status: 400 })
  }

  const { error: updateError } = await supabase!
    .from('coupons')
    .update({ is_active })
    .eq('id', id)
    .eq('store_id', sessionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
