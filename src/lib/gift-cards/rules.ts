import { createAdminClient } from '@/lib/supabase/admin'
import type { GiftRules } from '@/types/gift-cards'

const DEFAULT_RULES: GiftRules = {
  reserved_expires_days: 7,
  claimed_expires_days: 30,
  gift_card_expires_days: 365,
}

export async function getGiftRules(storeId: string): Promise<GiftRules> {
  const { supabase } = createAdminClient()
  const { data } = await supabase!
    .from('tiendas')
    .select('gift_config')
    .eq('id', storeId)
    .single()

  const config = data?.gift_config

  if (!config || typeof config !== 'object') {
    return { ...DEFAULT_RULES }
  }

  return {
    reserved_expires_days:
      typeof config.reserved_expires_days === 'number'
        ? config.reserved_expires_days
        : DEFAULT_RULES.reserved_expires_days,
    claimed_expires_days:
      typeof config.claimed_expires_days === 'number'
        ? config.claimed_expires_days
        : DEFAULT_RULES.claimed_expires_days,
    gift_card_expires_days:
      typeof config.gift_card_expires_days === 'number'
        ? config.gift_card_expires_days
        : DEFAULT_RULES.gift_card_expires_days,
  }
}

export async function calculateGiftCardExpiration(storeId: string): Promise<Date> {
  const rules = await getGiftRules(storeId)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + rules.gift_card_expires_days)
  return expiresAt
}
