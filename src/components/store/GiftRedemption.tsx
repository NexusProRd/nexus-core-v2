'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import confetti from 'canvas-confetti'
import { useCart } from '@/context/CartContext'

export default function GiftRedemption({ idTienda, defaultCode, onOpen }: { idTienda: string; defaultCode?: string; onOpen?: () => void }) {
  const { addToCart, setIsOpen } = useCart()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (defaultCode) {
      setCode(defaultCode.toUpperCase())
      setOpen(true)
      onOpen?.()
    }
  }, [defaultCode, onOpen])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gift, setGift] = useState<{
    sender_name: string
    receiver_name: string
    personal_message: string
    items: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  } | null>(null)

  const handleRedeem = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setGift(null)

    const supabase = createClient()

    const { data: giftData, error: fetchError } = await supabase
      .from('gift_experiences')
      .select('id, sender_name, receiver_name, personal_message, approved_at, items_list')
      .eq('store_id', idTienda)
      .eq('gift_code', code.trim().toUpperCase())
      .eq('status', 'approved')
      .eq('is_redeemed', false)
      .maybeSingle()

    if (fetchError || !giftData) {
      setError('Código inválido, ya fue canjeado o ha expirado.')
      setLoading(false)
      return
    }

    const aprobado = new Date(giftData.approved_at)
    const ahora = new Date()
    const diffHoras = (ahora.getTime() - aprobado.getTime()) / (1000 * 60 * 60)
    if (diffHoras > 72) {
      setError('Este código ha expirado (más de 72 horas desde su aprobación).')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('gift_experiences')
      .update({ is_redeemed: true })
      .eq('id', giftData.id)
      .eq('is_redeemed', false)

    if (updateError) {
      setError('No se pudo canjear el regalo. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const items = (giftData.items_list as { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]) || []

    const productIds = items.map(item => item.product_id)
    const { data: stockData, error: stockError } = await supabase
      .from('productos')
      .select('id, in_stock')
      .in('id', productIds)

    if (stockError) {
      setError('No se pudo verificar el inventario. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const outOfStock = stockData?.filter(p => !p.in_stock) || []
    if (outOfStock.length > 0) {
      setError('Lo sentimos, este detalle está temporalmente agotado. Por favor, contacta a la tienda.')
      setLoading(false)
      return
    }

    for (const item of items) {
      addToCart({ id: item.product_id, nombre: item.nombre, precio: 0, imagen_url: item.imagen_url, isGift: true })
    }

    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#7c3aed', '#ffffff', '#22c55e', '#f59e0b'],
    })
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.3 }, colors: ['#7c3aed', '#22c55e'] })
    }, 300)

    setGift({
      sender_name: giftData.sender_name,
      receiver_name: giftData.receiver_name,
      personal_message: giftData.personal_message || '',
      items,
    })
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full bg-[var(--primary)] text-white font-semibold py-2.5 px-4 rounded-xl hover:brightness-110 transition-all text-sm shadow-sm">
        🎁 Canjear Cupón
      </button>

      {open && !gift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">🎁 Canjear Regalo</h3>
              <button onClick={() => { setOpen(false); setError(''); setCode('') }} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">Ingresa el código que recibiste para canjear tu regalo.</p>

            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={20}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none uppercase text-center text-lg font-bold tracking-widest"
              placeholder="CÓDIGO" />

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <p className="text-[11px] font-bold text-amber-800">¡Importante! Debes canjear este regalo en menos de <span className="text-amber-900 underline decoration-amber-400 decoration-2">72 horas</span> después de ser aprobado.</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Pasado este tiempo, el cupón expirará automáticamente para liberar el inventario y no habrá reembolsos.</p>
              <p className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-amber-200/50">El costo de envío no está incluido y se cotizará según la zona al realizar el pedido.</p>
            </div>

            {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}

            <button onClick={handleRedeem} disabled={loading || !code.trim()}
              className="w-full mt-4 py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 text-sm">
              {loading ? 'Validando...' : 'Canjear Regalo'}
            </button>
          </div>
        </div>
      )}

      {gift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Felicidades {gift.receiver_name}!</h2>
            <p className="text-sm text-slate-600 mb-4">
              {gift.sender_name} te ha enviado un detalle especial: <span className="font-semibold text-amber-700">&ldquo;{gift.personal_message || 'Sin mensaje'}&rdquo;</span>
            </p>

            {gift.items.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
                {gift.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {item.imagen_url && (
                      <img src={item.imagen_url} alt={item.nombre} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.nombre}</p>
                      <p className="text-xs text-slate-500">Disfruta tu regalo</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setIsOpen(true); setOpen(false); setGift(null); setCode('') }}
              className="w-full py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:brightness-110 transition-colors text-sm">
              Ir al carrito por mi regalo
            </button>
          </div>
        </div>
      )}
    </>
  )
}
