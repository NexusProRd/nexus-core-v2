export interface GiftRules {
  reserved_expires_days: number
  claimed_expires_days: number
  gift_card_expires_days: number
}

export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'cancelled'

export interface GiftCard {
  id: string
  store_id: string
  original_gift_id: string | null
  code: string
  initial_value: number
  balance: number
  recipient_name: string | null
  recipient_phone: string | null
  status: GiftCardStatus
  expires_at: string | null
  created_at: string
  redeemed_at: string | null
}

export type GiftCardTransactionType = 'creation' | 'redemption' | 'expiration' | 'cancellation'

export interface GiftCardTransaction {
  id: string
  gift_card_id: string
  order_id: string | null
  amount: number
  type: GiftCardTransactionType
  created_at: string
}
