import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { supabase, error: clientError } = createAdminClient()
  if (clientError) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { code, storeId } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Código de cupón requerido' }, { status: 400 })
  }

  if (!storeId || typeof storeId !== 'string') {
    return NextResponse.json({ error: 'storeId requerido' }, { status: 400 })
  }

  const normalizedCode = code.toUpperCase().trim()

  const { data: cupon, error } = await supabase!
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('store_id', storeId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!cupon) {
    return NextResponse.json({ error: 'El código de cupón no existe' }, { status: 404 })
  }

  if (!cupon.is_active) {
    return NextResponse.json({ error: 'Este cupón ya no está activo' }, { status: 400 })
  }

  if (cupon.usage_limit > 0 && cupon.usage_count >= cupon.usage_limit) {
    return NextResponse.json({ error: 'Este cupón ha alcanzado su límite de usos' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    code: cupon.code,
    discount_type: cupon.discount_type,
    value: Number(cupon.value),
    min_purchase_amount: Number(cupon.min_purchase_amount),
  })
}
