import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { supabase, error: clientError } = createAdminClient()
  if (clientError) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { code, storeId } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Código de Gift Card requerido' }, { status: 400 })
  }

  if (!storeId || typeof storeId !== 'string') {
    return NextResponse.json({ error: 'storeId requerido' }, { status: 400 })
  }

  const normalizedCode = code.toUpperCase().trim()

  if (!/^GC[A-Z0-9]{10}$/.test(normalizedCode)) {
    return NextResponse.json({ error: 'Formato de código inválido' }, { status: 400 })
  }

  const { data, error } = await supabase!
    .from('gift_cards')
    .select('code, balance, status, expires_at, store_id')
    .eq('store_id', storeId)
    .eq('code', normalizedCode)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Gift Card no encontrada' }, { status: 404 })
  }

  if (data.status !== 'active') {
    return NextResponse.json({
      error: `Gift Card no está activa. Estado: ${data.status}`,
      status: data.status,
    })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({
      error: 'Gift Card expiró',
      expiresAt: data.expires_at,
    })
  }

  if (data.balance <= 0) {
    return NextResponse.json({ error: 'Gift Card no tiene saldo disponible' })
  }

  return NextResponse.json({
    success: true,
    code: data.code,
    balance: Number(data.balance),
    expiresAt: data.expires_at,
  })
}
