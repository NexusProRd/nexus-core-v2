'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '@/context/CartContext'
import { createClient } from '@/lib/supabase'

export default function GiftUrlDetector() {
  const { addMultipleToCart, setIsOpen } = useCart()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('gift')
    const storeId = params.get('id')
    if (!code) return

    const run = async () => {
      const supabase = createClient()
      const query = supabase
        .from('gift_experiences')
        .select('items_list')
        .eq('gift_code', code.trim().toUpperCase())
        .eq('status', 'approved')
        .eq('is_redeemed', false)
      if (storeId) query.eq('store_id', storeId)
      const { data: gift } = await query.maybeSingle()

      if (!gift) return

      const items = (gift.items_list as { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]) || []
      if (items.length > 0) {
        addMultipleToCart(items.map(item => ({
          id: item.product_id,
          nombre: item.nombre,
          precio: 0,
          imagen_url: item.imagen_url,
          isGift: true,
        })))
      }

      setIsOpen(true)

      const url = new URL(window.location.href)
      url.searchParams.delete('gift')
      url.searchParams.delete('id')
      window.history.replaceState({}, '', url.toString())
    }

    run()
  }, [addMultipleToCart, setIsOpen])

  return null
}
