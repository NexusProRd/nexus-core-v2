import { createAdminClient } from '@/lib/supabase/admin'

interface CanjeResult {
  success: boolean
  giftCardId?: string
  consumed?: number
  remainingBalance?: number
  giftCardStatus?: string
  error?: string
}

export async function redeemGiftCard(
  code: string,
  storeId: string,
  amount: number,
  orderId?: string,
): Promise<CanjeResult> {
  const { supabase, error: clientError } = createAdminClient()
  if (clientError) {
    return { success: false, error: 'Error de conexión' }
  }

  const { data, error } = await supabase!
    .rpc('canjear_giftcard_v2', {
      p_code: code,
      p_store_id: storeId,
      p_amount: amount,
      p_order_id: orderId || null,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as CanjeResult

  if (!result.success) {
    return { success: false, error: result.error || 'Error al canjear Gift Card' }
  }

  return {
    success: true,
    giftCardId: result.giftCardId,
    consumed: result.consumed,
    remainingBalance: result.remainingBalance,
    giftCardStatus: result.giftCardStatus,
  }
}
