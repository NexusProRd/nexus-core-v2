import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

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
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const body = await req.json()
  const { code, discount_type, value, min_purchase_amount, usage_limit } = body

  if (!code?.trim() || !discount_type || value == null) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  if (typeof value !== 'number' || value <= 0) {
    return NextResponse.json({ error: 'El valor del cupón debe ser un número positivo' }, { status: 400 })
  }

  if (discount_type === 'percentage' && value > 100) {
    return NextResponse.json({ error: 'El porcentaje de descuento no puede exceder 100%' }, { status: 400 })
  }

  if (min_purchase_amount != null && (typeof min_purchase_amount !== 'number' || min_purchase_amount < 0)) {
    return NextResponse.json({ error: 'El monto mínimo de compra no puede ser negativo' }, { status: 400 })
  }

  if (usage_limit != null && (typeof usage_limit !== 'number' || usage_limit < 0)) {
    return NextResponse.json({ error: 'El límite de usos no puede ser negativo' }, { status: 400 })
  }

  const codigoNormalizado = code.trim().toUpperCase()
  if (codigoNormalizado.length > 50) {
    return NextResponse.json({ error: 'El código de cupón es demasiado largo (máx. 50 caracteres)' }, { status: 400 })
  }

  if (!/^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s._-]+$/.test(codigoNormalizado)) {
    return NextResponse.json({ error: 'El código contiene caracteres no válidos' }, { status: 400 })
  }

  const { error: insertError } = await supabase!
    .from('coupons')
    .insert({
      store_id: sessionId,
      code: codigoNormalizado,
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
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

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
