'use client'

import { useState } from 'react'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase'
import { useCart } from '@/context/CartContext'

interface RedeemButtonProps {
  giftId: string
  items: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  storeId: string
  giftCode: string
  isV2?: boolean
}

export default function RedeemButton({ giftId, items, storeId, giftCode, isV2 }: RedeemButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { addMultipleToCart } = useCart()

  const handleRedeemAndGo = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const rpcName = isV2 ? 'reclamar_regalo_v2' : 'procesar_canje_regalo'
    const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, {
      p_gift_code: giftCode,
      p_store_id: storeId
    })

    if (rpcError) {
      setError('Error de comunicación con el servidor. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const res = rpcData as { success: boolean; error?: string; items?: any[] }
    if (!res.success) {
      setError(res.error || 'No se pudo procesar el canje.')
      setLoading(false)
      return
    }

    fetch('/api/push/gift-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idTienda: storeId, event: 'claimed', giftCode }),
    }).catch(() => {})

    const itemsList = res.items || items
    const giftCartItems = itemsList.map((item: any) => ({
      id: item.product_id || item.id,
      nombre: item.nombre,
      precio: 0,
      imagen_url: item.imagen_url || null,
      isGift: true,
      cantidad: 1,
    }))

    addMultipleToCart(giftCartItems)
    const key = storeId ? `nexus-cart-${storeId}` : 'nexus-cart'
    const raw = localStorage.getItem(key)
    let existing = []
    if (raw) {
      try { existing = JSON.parse(raw) } catch {}
    }
    const nonGift = existing.filter((i: any) => !i.isGift)
    const toSave = [...nonGift, ...giftCartItems]
    localStorage.setItem(key, JSON.stringify(toSave))

    await new Promise(resolve => setTimeout(resolve, 300))
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 } })

    window.location.href = window.location.origin + '/catalogo/' + storeId + '?openCart=1'
  }

  return (
    <div className="space-y-3">
      <button onClick={handleRedeemAndGo} disabled={loading}
        className="w-full px-6 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-lg hover:brightness-110 transition-all duration-300 text-base disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? 'Canjeando...' : 'Canjear e ir al carrito por mi regalo'}
      </button>
      {error && <p className="text-sm text-rose-600 text-center">{error}</p>}
    </div>
  )
}
