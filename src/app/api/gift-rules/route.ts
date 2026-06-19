import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextRequest, NextResponse } from 'next/server'
import { getGiftRules } from '@/lib/gift-cards/rules'
import type { GiftRules } from '@/types/gift-cards'

const DEFAULT_RULES: GiftRules = {
  reserved_expires_days: 7,
  claimed_expires_days: 30,
  gift_card_expires_days: 365,
}

const MIN = 1
const MAX_RESERVED = 90
const MAX_CLAIMED = 365
const MAX_GIFTCARD = 1825

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const rules = await getGiftRules(session.tiendaId)
  return NextResponse.json(rules)
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body: Partial<GiftRules> = await req.json()

  const clamped: GiftRules = {
    reserved_expires_days: Math.max(MIN, Math.min(body.reserved_expires_days ?? DEFAULT_RULES.reserved_expires_days, MAX_RESERVED)),
    claimed_expires_days: Math.max(MIN, Math.min(body.claimed_expires_days ?? DEFAULT_RULES.claimed_expires_days, MAX_CLAIMED)),
    gift_card_expires_days: Math.max(MIN, Math.min(body.gift_card_expires_days ?? DEFAULT_RULES.gift_card_expires_days, MAX_GIFTCARD)),
  }

  if (!Number.isFinite(clamped.reserved_expires_days) ||
      !Number.isFinite(clamped.claimed_expires_days) ||
      !Number.isFinite(clamped.gift_card_expires_days)) {
    return NextResponse.json({ error: 'Valores inválidos' }, { status: 400 })
  }

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { data: tienda } = await supabase!
    .from('tiendas')
    .select('gift_config')
    .eq('id', session.tiendaId)
    .single()

  const existingConfig =
    tienda?.gift_config && typeof tienda.gift_config === 'object' ? tienda.gift_config : {}

  const merged = { ...existingConfig, ...clamped }

  const { error: updateError } = await supabase!
    .from('tiendas')
    .update({ gift_config: merged })
    .eq('id', session.tiendaId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(clamped)
}
