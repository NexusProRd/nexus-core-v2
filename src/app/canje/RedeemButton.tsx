'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface RedeemButtonProps {
  items: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  storeId: string
  giftCode: string
  isV2?: boolean
  onSuccess: () => void
}

export default function RedeemButton({ items, storeId, giftCode, isV2, onSuccess }: RedeemButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRedeem = async () => {
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
      console.error('Redeem RPC Error:', rpcError)
      console.error('Redeem RPC Response:', rpcData)
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

    onSuccess()
  }

  return (
    <div className="space-y-3">
      <button onClick={handleRedeem} disabled={loading}
        className="w-full px-6 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-lg hover:brightness-110 transition-all duration-300 text-base disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? 'Canjeando...' : 'Canjear mi regalo'}
      </button>
      {error && <p className="text-sm text-rose-600 text-center">{error}</p>}
    </div>
  )
}
