'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { getTicketByCode, getOrderProducts, markTicketRedeemed } from './actions'

interface GiftDetails {
  sender_name: string
  recipient_name: string
  dedication: string
}

interface CartProduct {
  id: string
  nombre: string
  precio: number
  imagen_url: string | null
  cantidad?: number
}

type TicketState = 'loading' | 'invalid' | 'expired' | 'redeemed' | 'valid'

export default function TicketsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { addMultipleToCart, setStoreId } = useCart()
  const idTienda = params?.id_tienda as string
  const code = searchParams?.get('code') || ''

  useEffect(() => {
    if (idTienda) setStoreId(idTienda)
  }, [idTienda, setStoreId])

  const [state, setState] = useState<TicketState>('loading')
  const [details, setDetails] = useState<GiftDetails | null>(null)
  const [products, setProducts] = useState<CartProduct[]>([])
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState('')

  // Fetch ticket + order products on mount (validación en servidor)
  useEffect(() => {
    if (!code) { setState('invalid'); return }
    if (!idTienda) { setState('invalid'); return }

    ;(async () => {
      const result = await getTicketByCode(code, idTienda)

      if (result.data) setDetails(result.data.gift_details as GiftDetails | null)

      if (result.error === 'INVALID' || !result.data) { setState('invalid'); return }
      if (result.error === 'EXPIRED') { setState('expired'); return }
      if (result.error === 'REDEEMED') { setState('redeemed'); return }

      setState('valid')

      if (result.data.order_id) {
        const prods = await getOrderProducts(result.data.order_id)
        setProducts(prods)
      }
    })()
  }, [code, idTienda])

  const redeemAndRedirect = useCallback(async (isCartFlow: boolean) => {
    if (redeeming) return
    if (products.length === 0) { alert('No hay productos para agregar al carrito'); return }
    setRedeeming(true)
    setRedeemError('')

    const bulk = products.map(p => ({ id: p.id, nombre: p.nombre, precio: 0, imagen_url: p.imagen_url, cantidad: p.cantidad || 1, isGift: true }))
    addMultipleToCart(bulk)
    const existingRaw = localStorage.getItem('nexus-cart')
    let existing = []
    if (existingRaw) { try { existing = JSON.parse(existingRaw) } catch {} }
    const nonGift = existing.filter((e: any) => !e.isGift)
    localStorage.setItem('nexus-cart', JSON.stringify([...nonGift, ...bulk]))

    const result = await markTicketRedeemed(code, idTienda)
    if (result.error) {
      setRedeemError(result.error)
      setRedeeming(false)
      return
    }

    window.location.href = `/catalogo/${idTienda}?openCart=1`
  }, [code, idTienda, products, redeeming, addMultipleToCart])

  const handleRedeemAndGoToCart = useCallback(() => redeemAndRedirect(true), [redeemAndRedirect])
  const handleRedeemAndGoCatalog = useCallback(() => redeemAndRedirect(false), [redeemAndRedirect])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee]">
        <div className="animate-pulse text-stone-400 text-sm tracking-wide">Abriendo tu regalo...</div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee] p-4">
        <div className="max-w-md w-full text-center bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-stone-200 shadow-lg p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Código inválido</h1>
          <p className="text-sm text-stone-500">El código ingresado no es válido o no pertenece a esta tienda.</p>
        </div>
      </div>
    )
  }

  const sender = details?.sender_name || ''
  const recipient = details?.recipient_name || ''
  const dedication = details?.dedication || ''

  if (state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee] dark:bg-[#1c1a17] p-4">
        <div className="max-w-md w-full text-center bg-white/90 dark:bg-[#2a2722]/90 backdrop-blur-xl rounded-[2.5rem] border border-stone-200 dark:border-stone-700 shadow-lg p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Cupón expirado</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Hola {recipient}, este cupón ya expiró por haber pasado 72 horas. {sender} debe ponerse en contacto con el comercio que emitió el cupón.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'redeemed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ee] dark:bg-[#1c1a17] p-4">
        <div className="max-w-md w-full text-center bg-white/90 dark:bg-[#2a2722]/90 backdrop-blur-xl rounded-[2.5rem] border border-stone-200 dark:border-stone-700 shadow-lg p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Cupón ya reclamado</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Hola {recipient}, este cupón ya fue reclamado. Espero que lo estés disfrutando tanto como {sender} lo disfrutó al enviarte tu regalo.
          </p>
        </div>
      </div>
    )
  }

  // ─── CASE 3: Valid ticket — Envelope / Letter design ───
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e8dccc] via-[#f3f1ee] to-[#e8dccc] dark:from-[#1a1713] dark:via-[#1c1a17] dark:to-[#1a1713] p-4">
      {/* Envelope flap accent */}
      <div className="relative max-w-lg w-full">
        {/* Envelope top flap (decorative) */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[60px] border-r-[60px] border-b-[24px] border-l-transparent border-r-transparent border-b-[#d4c5a9] opacity-40" />

        {/* Letter card */}
        <div className="relative bg-white dark:bg-[#2a2722] rounded-[2rem] shadow-xl shadow-stone-300/40 dark:shadow-black/30 border border-stone-200/60 dark:border-stone-700/60 p-8 sm:p-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
          {/* Decorative seal */}
          <div className="absolute -top-4 right-8 w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-300/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          {/* Letter header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/40 rounded-full border border-amber-200/60 dark:border-amber-700/60 text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Tienes un regalo
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
              {recipient ? `¡Para ti, ${recipient}!` : '¡Para ti!'}
            </h1>
          </div>

          {/* From / To */}
          <div className="space-y-2 mb-6 text-sm">
            <p className="text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-200">De:</span> {sender}
            </p>
            <p className="text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-200">Para:</span> {recipient || 'Ti'}
            </p>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-stone-200 dark:border-stone-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-[#2a2722] px-3 text-stone-400 dark:text-stone-500 text-xs">⁕</span>
            </div>
          </div>

          {/* Dedication message */}
          {dedication && (
            <div className="mb-8">
              <p className="text-base sm:text-lg leading-relaxed text-stone-700 dark:text-stone-200 font-serif italic text-center">
                &ldquo;{dedication}&rdquo;
              </p>
            </div>
          )}

          {!dedication && (
            <div className="mb-8 text-center">
              <p className="text-base text-stone-400 dark:text-stone-500 italic">
                {sender ? `${sender} te ha enviado un regalo con mucho cariño.` : 'Alguien te ha enviado un regalo especial.'}
              </p>
            </div>
          )}

          {products.length > 0 && (
            <div className="mb-6 bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-stone-400 dark:text-stone-400 uppercase tracking-wider">Tu regalo incluye:</p>
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  {p.imagen_url && (
                    <img src={p.imagen_url} alt={p.nombre} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{p.nombre}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {redeemError && (
            <div className="mb-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm text-center">
              {redeemError}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRedeemAndGoToCart}
              disabled={redeeming}
              className="w-full py-3.5 bg-[var(--primary,#7c3aed)] text-white font-bold rounded-xl hover:brightness-110 transition-all duration-200 shadow-lg shadow-[var(--primary,#7c3aed)]/25 disabled:opacity-60 text-sm"
            >
              {redeeming ? 'Reclamando...' : '🎁 Reclamar e ir al carrito por mi regalo'}
            </button>

            <button
              onClick={handleRedeemAndGoCatalog}
              disabled={redeeming}
              className="w-full py-3 border-2 border-[var(--primary,#7c3aed)] text-[var(--primary,#7c3aed)] font-semibold rounded-xl hover:bg-[var(--primary,#7c3aed)] hover:text-white transition-all duration-200 disabled:opacity-60 text-sm"
            >
              🛒 Visitar catálogo y guardar regalo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
