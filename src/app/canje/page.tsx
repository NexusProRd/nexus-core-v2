'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase'
import RedeemButton from './RedeemButton'
import { getPalette, applyPalette } from '@/lib/palettes'

interface GiftData {
  id: string
  sender_name: string
  receiver_name: string
  personal_message: string | null
  gift_code: string
  store_id: string
  items: { product_id: string; nombre: string; precio: number; imagen_url: string | null }[]
  delivery_address: string | null
}

function CanjeContent() {
  const searchParams = useSearchParams()
  const [gift, setGift] = useState<GiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState(false)
  const [isRedeemed, setIsRedeemed] = useState(false)
  const [isV2, setIsV2] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    setError(false)
    const code = (searchParams.get('gift') || '').trim().toUpperCase()
    const storeId = searchParams.get('id') || ''

    if (!code) {
      setLoading(false)
      setShowForm(true)
      return
    }

    setShowForm(false)
    fetched.current = true
    const supabase = createClient()
    const query = supabase
      .from('gift_experiences')
      .select('id, sender_name, receiver_name, personal_message, gift_code, is_redeemed, store_id, items_list, status, delivery_address')
      .eq('gift_code', code)

    query.maybeSingle().then(({ data, error: fetchError }) => {
      if (fetchError) {
        console.error('[canje] Supabase error:', fetchError)
        setError(true)
        setLoading(false)
        return
      }
      if (!data) {
        setError(true)
        setLoading(false)
        return
      }
      if (data.is_redeemed) {
        setIsRedeemed(true)
        setGift({
          id: data.id,
          sender_name: data.sender_name,
          receiver_name: data.receiver_name || '',
          personal_message: data.personal_message,
          gift_code: data.gift_code,
          store_id: data.store_id,
          items: (data.items_list as GiftData['items']) || [],
          delivery_address: data.delivery_address,
        })
        setLoading(false)
        return
      }
      if (data.status === 'CLAIMED') {
        setIsRedeemed(true)
        setGift({
          id: data.id,
          sender_name: data.sender_name,
          receiver_name: data.receiver_name || '',
          personal_message: data.personal_message,
          gift_code: data.gift_code,
          store_id: data.store_id,
          items: (data.items_list as GiftData['items']) || [],
          delivery_address: data.delivery_address,
        })
        setLoading(false)
        return
      }
      if (data.status === 'cancelled') {
        setError(true)
        setLoading(false)
        return
      }
      if (data.status === 'pending') {
        setError(true)
        setLoading(false)
        return
      }
      if (data.status !== 'approved' && data.status !== 'RESERVED') {
        setError(true)
        setLoading(false)
        return
      }
      if (data.status === 'RESERVED') {
        setIsV2(true)
      }
      setGift({
        id: data.id,
        sender_name: data.sender_name,
        receiver_name: data.receiver_name || '',
        personal_message: data.personal_message,
        gift_code: data.gift_code,
        store_id: data.store_id,
        items: (data.items_list as GiftData['items']) || [],
        delivery_address: data.delivery_address,
      })
      setLoading(false)
    })
  }, [searchParams])

  const handleReveal = () => {
    setRevealed(true)
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.4 },
      colors: ['#7c3aed', '#ec4899', '#f59e0b', '#ffffff'],
    })
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.3 },
        colors: ['#7c3aed', '#ec4899'],
      })
    }, 250)
  }

  const handleRedeemSuccess = () => {
    setRedeemed(true)
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.55 },
    })
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.3 },
        colors: ['#7c3aed', '#22c55e'],
      })
    }, 300)
  }

  useEffect(() => {
    if (gift) {
      const supabase = createClient()
      supabase.from('perfil_tienda')
        .select('theme_config')
        .eq('id_tienda', gift.store_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.theme_config) {
            const config = data.theme_config as { palette?: string }
            if (config.palette) applyPalette(getPalette(config.palette))
          }
        })
    }
  }, [gift])

  if (showForm) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-200">
              <span className="text-3xl">🎁</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Canjear regalo</h1>
            <p className="mt-2 text-sm text-slate-500">Ingresa el código que recibiste para canjear tu regalo.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = formCode.trim().toUpperCase()
              if (!trimmed) return
              window.location.href = `/canje?gift=${encodeURIComponent(trimmed)}`
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="gift-code" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Código del regalo
              </label>
              <input
                id="gift-code"
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Ej: ABC123"
                className="w-full px-4 py-3 text-[16px] text-center text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow uppercase tracking-widest"
                required
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-violet-200"
            >
              Canjear regalo
            </button>
          </form>
          <p className="text-center mt-6">
            <a href="/" className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2">Volver al inicio</a>
          </p>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (isRedeemed && gift) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">🎁</div>
            <h1 className="text-2xl font-bold text-emerald-800 mb-3">¡Este detalle ya fue reclamado! 🎁</h1>
            <p className="text-sm text-emerald-700 mb-6">
              Esperamos que lo estés disfrutando tanto como {gift.sender_name} disfrutó enviándolo.
            </p>
            {gift.personal_message && (
              <div className="bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl p-5 mb-6 border border-amber-200">
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest mb-2">
                  Recuerda las palabras de {gift.sender_name}:
                </p>
                <p className="text-base italic font-medium text-[#334155] leading-relaxed">
                  &ldquo;{gift.personal_message}&rdquo;
                </p>
              </div>
            )}
            <a href={`/catalogo/${gift.store_id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all duration-300"
            >
              🏪 Explorar tienda
            </a>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-6">
            Código: <span className="font-mono font-semibold text-slate-500">{gift.gift_code}</span>
          </p>
        </div>
      </main>
    )
  }

  if (error || !gift) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">⚠️</div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Código no disponible</h1>
          <p className="mt-2 text-sm text-slate-600">Este código no existe, ya fue usado o no está disponible para canje.</p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-violet-600 hover:underline">Volver al inicio</Link>
          
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        {redeemed ? (
          <div className="animate-[fadeSlideUp_0.5s_ease-out]">
            <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm mb-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-xl font-bold text-emerald-700 mb-1">¡Regalo canjeado con éxito!</h1>
              <div className="mt-6 text-left space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">De</p>
                  <p className="text-base font-bold text-slate-900">{gift.sender_name}</p>
                </div>
                {gift.personal_message && (
                  <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl p-4 border border-violet-100">
                    <p className="text-base italic font-medium text-violet-800 leading-relaxed">
                      &ldquo;{gift.personal_message}&rdquo;
                    </p>
                  </div>
                )}
                {gift.items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tu regalo incluye</p>
                    <div className="space-y-2">
                      {gift.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                          {item.imagen_url && (
                            <div className="w-12 h-12 rounded-lg bg-white flex-shrink-0 overflow-hidden">
                              <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="text-sm font-semibold text-slate-900">{item.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-bold text-amber-800 mb-1">📱 ¿Qué sigue?</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                El comercio se pondrá en contacto contigo para coordinar la entrega.
              </p>
            </div>
            <div className="space-y-3">
              <a href={`/catalogo/${gift.store_id}`}
                className="block w-full text-center px-6 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-lg hover:brightness-110 transition-all duration-300 text-base">
                🏪 Explorar tienda
              </a>
              <a href="/"
                className="block w-full text-center px-6 py-3 text-slate-500 font-semibold rounded-xl hover:text-slate-700 transition-colors text-sm">
                🏠 Volver al inicio
              </a>
            </div>
            <p className="text-xs text-slate-500 text-center mt-6">
              Código: <span className="font-mono font-semibold text-slate-600">{gift.gift_code}</span>
              <button onClick={() => navigator.clipboard.writeText(gift.gift_code)}
                className="ml-1.5 text-[10px] text-violet-500 hover:text-violet-700 underline underline-offset-2 transition-colors">
                📋 Copiar
              </button>
            </p>
          </div>
        ) : !revealed ? (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-200 animate-[gentleFloat_3s_ease-in-out_infinite] flex items-center justify-center">
                <span className="text-5xl">🎁</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a] mb-2">{gift.sender_name} te ha enviado un regalo</h1>
            {gift.receiver_name && (
              <p className="text-sm text-[#334155] mb-8">Para <span className="font-semibold text-[#0f172a]">{gift.receiver_name}</span></p>
            )}
            <button onClick={handleReveal}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-lg hover:brightness-110 transition-all duration-200 text-base">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Abrir Regalo
            </button>
            <p className="text-xs text-slate-500 mt-6">
              Código: <span className="font-mono font-semibold text-slate-600">{gift.gift_code}</span>
              <button onClick={() => navigator.clipboard.writeText(gift.gift_code)}
                className="ml-1.5 text-[10px] text-violet-500 hover:text-violet-700 underline underline-offset-2 transition-colors">
                📋 Copiar
              </button>
            </p>
          </div>
        ) : (
          <div className="animate-[fadeSlideUp_0.5s_ease-out]">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-3xl">🎁</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">¡Sorpresa{gift.receiver_name ? `, ${gift.receiver_name}` : ''}!</h1>
              <p className="text-sm text-slate-500 mb-4">
                <span className="font-semibold text-violet-700">{gift.sender_name}</span> te ha enviado un detalle especial
              </p>
              {gift.personal_message && (
                <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl p-5 mb-4 border border-violet-100">
                  <p className="text-base italic font-medium text-violet-800 leading-relaxed">
                    &ldquo;{gift.personal_message}&rdquo;
                  </p>
                </div>
              )}
              {gift.items.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 text-left space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Productos incluidos</p>
                  {gift.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 overflow-hidden">
                        {item.imagen_url ? (
                          <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-slate-700">{item.nombre}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isV2 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800">¡Importante! Debes canjear este regalo en menos de <span className="text-amber-900 underline decoration-amber-400 decoration-2">72 horas</span> después de ser aprobado.</p>
                <p className="text-[11px] text-amber-600 mt-1">Pasado este tiempo, el cupón expirará automáticamente para liberar el inventario y no habrá reembolsos.</p>
              </div>
            )}
            <RedeemButton items={gift.items} storeId={gift.store_id} giftCode={gift.gift_code} isV2={isV2} onSuccess={handleRedeemSuccess} />
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gentleFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </main>
  )
}

export default function CanjePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <CanjeContent />
    </Suspense>
  )
}
