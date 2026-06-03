'use server'

import { createClient } from '@/lib/supabase/server'

export async function findGiftByCode(code: string, storeId: string) {
  const supabase = await createClient()
  const { data: gift } = await supabase
    .from('gift_experiences')
    .select('id, gift_code, status, is_redeemed')
    .eq('gift_code', code.toUpperCase())
    .eq('store_id', storeId)
    .maybeSingle()

  if (!gift) return { found: false as const }
  if (gift.is_redeemed) return { found: false as const, reason: 'REDEEMED' as const }
  if (gift.status !== 'approved') return { found: false as const, reason: 'UNAVAILABLE' as const }
  return { found: true as const, gift }
}
