import { createAdminClient } from '@/lib/supabase/admin'

export async function convertGiftToGiftCard(giftId: string) {
  const { supabase } = createAdminClient()

  const { data, error } = await supabase!
    .rpc('convertir_regalo_a_giftcard_v2', { p_gift_id: giftId })

  if (error) {
    return { success: false as const, error: error.message }
  }

  const result = data as {
    success: boolean
    error?: string
    giftCard?: { id: string; code: string }
    value?: number
    expiresAt?: string
  }

  if (!result.success) {
    return { success: false as const, error: result.error || 'Error al convertir el regalo' }
  }

  return {
    success: true as const,
    giftCard: result.giftCard!,
    value: result.value!,
    expiresAt: result.expiresAt!,
  }
}
