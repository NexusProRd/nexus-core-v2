'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCart, CartItem } from '@/context/CartContext'
import { useConfig } from '@/context/ConfigProvider'
import { formatCurrency } from '@/lib/utils'
import GiftModal from './GiftModal'
import GiftCardInput from './GiftCardInput'
import ToastProvider, { useToast } from '@/components/Toast'

interface CartDrawerProps {
  idTienda: string
  whatsappNumber: string
  hideCheckout?: boolean
}

function idProductoReal(item: CartItem): string | null {
  if (item.isGift) return null
  if (item.variante_seleccionada) {
    const suffix = '-' + item.variante_seleccionada
    if (item.id.endsWith(suffix)) return item.id.slice(0, -suffix.length)
    return item.id
  }
  return item.id
}

function CartDrawerInner({ idTienda, whatsappNumber, hideCheckout }: CartDrawerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems, totalImpuesto, subtotalSinImpuesto } = useCart()
  const { monedaSimbolo, currencyCode } = useConfig()
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [notas, setNotas] = useState('')
  const [giftToRemove, setGiftToRemove] = useState<CartItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [giftSubmitting, setGiftSubmitting] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null)
  const [giftModalOpen, setGiftModalOpen] = useState(false)
  const [giftCardCode, setGiftCardCode] = useState<string | null>(null)
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null)
  const [datosAccordionOpen, setDatosAccordionOpen] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null)
  const [couponInfo, setCouponInfo] = useState<{ discount_type: string; value: number; min_purchase_amount: number } | null>(null)
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'contra_entrega' | null>(null)
  const [datosTouched, setDatosTouched] = useState(false)
  const hasGiftItems = items.some(i => i.isGift)
  const nombreValido = nombreCliente.trim().length > 0
  const telefonoValido = telefonoCliente.replace(/\D/g, '').length >= 10
  const totalAntesDescuento = totalPrice + totalImpuesto
  const descuentoCupon = couponDiscount ?? 0
  const totalConCupon = Math.max(0, totalAntesDescuento - descuentoCupon)
  const giftCardDiscount = giftCardCode && giftCardBalance !== null
    ? Math.min(giftCardBalance, totalConCupon)
    : 0
  const totalPendiente = totalConCupon - giftCardDiscount
  const necesitaMetodoPago = totalPendiente > 0
  const puedeEnviar = nombreValido && telefonoValido && (!necesitaMetodoPago || metodoPago !== null)

  const nombreRef = useRef<HTMLInputElement>(null)
  const telefonoRef = useRef<HTMLInputElement>(null)
  const metodoPagoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (datosTouched) {
      setDatosAccordionOpen(true)
    }
  }, [isOpen, datosTouched])

  const marcarTocado = () => {
    if (!datosTouched) setDatosTouched(true)
  }

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.toUpperCase().trim(), storeId: idTienda }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCouponError(data.error || 'Error al validar cupón')
        return
      }
      const totalBase = totalPrice + totalImpuesto
      let descuento = data.discount_type === 'percentage'
        ? totalBase * (data.value / 100)
        : data.value
      descuento = Math.min(descuento, totalBase)
      setCouponCode(data.code)
      setCouponDiscount(descuento)
      setCouponInfo(data)
      setCouponInput('')
    } catch {
      setCouponError('Error de conexión')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode(null)
    setCouponDiscount(null)
    setCouponInfo(null)
    setCouponError(null)
  }

  if (!isOpen) return null

  const handleCheckout = async () => {
    if (!puedeEnviar) {
      setDatosAccordionOpen(true)
      if (!nombreValido) {
        setTimeout(() => nombreRef.current?.focus(), 100)
      } else if (!telefonoValido) {
        setTimeout(() => telefonoRef.current?.focus(), 100)
      } else if (necesitaMetodoPago && !metodoPago) {
        setTimeout(() => metodoPagoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
      }
      return
    }
    setIsSubmitting(true)
    try {
      const itemsParaInsertar = [...items]

      if (itemsParaInsertar.length === 0) {
        toast('El carrito está vacío', 'warning')
        return
      }

      let notaEnvio: string | null = notas.trim() || null
      if (hasGiftItems) {
        const add = '🎁 Regalo canjeado — Entrega coordinada por la tienda.'
        notaEnvio = notaEnvio ? `${notaEnvio} | ${add}` : add
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idTienda,
          nombreCliente: nombreCliente.trim(),
          telefonoCliente: telefonoCliente.trim() || null,
          items: itemsParaInsertar,
          metodoPago: necesitaMetodoPago ? metodoPago : null,
          notas: notaEnvio,
          couponCode: couponCode,
          giftCardCode: giftCardCode,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        console.error('Error al crear pedido:', errData.error)
        return
      }

      const { pedido } = await res.json()

      localStorage.setItem(`nexus-last-order-${idTienda}`, pedido.id)

      clearCart()
      setGiftCardCode(null)
      setGiftCardBalance(null)
      setCouponCode(null)
      setCouponDiscount(null)
      setCouponInfo(null)
      setCouponInput('')
      setCouponError(null)
      setMetodoPago(null)
      setDatosTouched(false)
      setNombreCliente('')
      setTelefonoCliente('')
      setNotas('')
      router.push(`/catalogo/exito?pedido=${pedido.id}&tienda=${idTienda}`)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop-in" onClick={() => setIsOpen(false)} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col overflow-y-auto animate-slide-in-right" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="p-4 border-b flex justify-between items-center bg-[var(--primary)] text-white">
          <h2 className="text-lg font-bold">Tu Carrito ({totalItems})</h2>
          <button onClick={() => setIsOpen(false)} className="p-2 text-white hover:text-white/70 rounded-lg touch-target native-press">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tu carrito está vacío</p>
          ) : (
            <div className="space-y-4">
              {items.map((item: CartItem) => (
                <div key={item.id} className={`flex gap-3 p-3 rounded-lg ${item.isGift ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  {item.imagen_url && (
                    <img src={item.imagen_url} alt={item.nombre} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 text-sm">{item.nombre}</h3>
                      {item.isGift && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">🎁 Regalo</span>
                      )}
                    </div>
                    {item.isGift ? (
                      <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full mt-1">🎁 Obsequio</span>
                    ) : item.precio === 0 ? (
                      <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full mt-1">📅 Reserva / Sin costo</span>
                    ) : (
                      <>
                        {item.modo_venta === 'libra' && item.peso_libras ? (
                          <p className="text-[var(--primary)] font-bold">{formatCurrency(Number(item.precio) * item.peso_libras, currencyCode)} <span className="text-[11px] font-normal text-slate-400">({item.peso_libras} lb)</span></p>
                        ) : (
                          <p className="text-[var(--primary)] font-bold">{formatCurrency(item.precio, currencyCode)}</p>
                        )}
                        {item.variante_seleccionada && <span className="text-[11px] text-violet-600 font-medium mt-0.5 block">📏 Talla: {item.variante_seleccionada}</span>}
                      </>
                    )}
                    {item.isGift ? (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium">Cantidad: 1 (canje de regalo)</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                          className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-slate-900">{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => item.isGift ? setGiftToRemove(item) : removeFromCart(item.id)}
                    className={`${item.isGift ? 'text-amber-500 hover:text-amber-700' : 'text-red-500 hover:text-red-700'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!hideCheckout && items.length > 0 && (
          <div className="p-4 border-t bg-gray-50 sticky-bottom">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-slate-600 font-medium">Total:</span>
                {totalImpuesto > 0 && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    Subtotal {formatCurrency(subtotalSinImpuesto, currencyCode)} + Impuesto {formatCurrency(totalImpuesto, currencyCode)}
                  </div>
                )}
                {descuentoCupon > 0 && (
                  <div className="text-xs text-emerald-600 mt-0.5">
                    🎫 Cupón: -{formatCurrency(descuentoCupon, currencyCode)}
                  </div>
                )}
                {giftCardDiscount > 0 && (
                  <div className="text-xs text-emerald-600 mt-0.5">
                    💳 Gift Card: -{formatCurrency(giftCardDiscount, currencyCode)}
                  </div>
                )}
              </div>
              <div className="text-right">
                {(descuentoCupon > 0 || giftCardDiscount > 0) && (
                  <span className="text-xs text-slate-400 line-through block">{formatCurrency(totalAntesDescuento, currencyCode)}</span>
                )}
                <span className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(totalPendiente, currencyCode)}</span>
              </div>
            </div>

            <button
              onClick={() => setGiftModalOpen(true)}
              disabled={giftSubmitting}
              className="w-full py-3 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              🎁 Comprar como regalo
            </button>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="w-full bg-[var(--primary)] text-white py-3.5 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed native-press elevation-2"
            >
              {isSubmitting ? 'Enviando...' : 'Procesar pedido'}
            </button>

            <button onClick={() => setDatosAccordionOpen(!datosAccordionOpen)}
              className="w-full flex items-center justify-between py-3 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">📋 Datos para tu pedido</span>
                {!datosAccordionOpen && nombreCliente.trim() && (
                  <span className={nombreValido ? 'text-emerald-600' : 'text-amber-600'}>✅</span>
                )}
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${datosAccordionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {datosAccordionOpen && (
              <>
                <div className="mb-4">
                  <GiftCardInput
                    storeId={idTienda}
                    currencyCode={currencyCode}
                    onApply={(code, balance) => {
                      setGiftCardCode(code)
                      setGiftCardBalance(balance)
                    }}
                    onRemove={() => {
                      setGiftCardCode(null)
                      setGiftCardBalance(null)
                    }}
                    appliedCode={giftCardCode}
                    appliedBalance={giftCardBalance}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    🎫 Cupón de descuento
                  </label>
                  {couponCode ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-emerald-800">Cupón aplicado</p>
                          <code className="text-xs font-mono text-emerald-600 select-all">{couponCode}</code>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                      {couponDiscount !== null && (
                        <p className="text-xs text-emerald-700 mt-1.5">
                          Descuento: -{formatCurrency(couponDiscount, currencyCode)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon() }}
                          placeholder="CÓDIGO"
                          className="flex-1 px-4 py-3 text-[16px] font-mono uppercase tracking-wider border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 placeholder:text-slate-300"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={!couponInput.trim() || couponLoading}
                          className="px-4 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed native-press whitespace-nowrap"
                        >
                          {couponLoading ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </span>
                          ) : (
                            'Aplicar'
                          )}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-rose-600 mt-1.5">{couponError}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        Ingresa el código de descuento
                      </p>
                    </>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">¿A nombre de quién preparamos el pedido?</label>
                  <input ref={nombreRef} type="text" value={nombreCliente} onChange={e => { setNombreCliente(e.target.value); marcarTocado() }}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">¿Cuál es tu WhatsApp para contactarte?</label>
                  <input ref={telefonoRef} type="tel" value={telefonoCliente} onChange={e => { setTelefonoCliente(e.target.value); marcarTocado() }}
                    placeholder="+1 809 123 4567"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`w-full px-4 py-3 text-[16px] border rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 ${telefonoCliente && !telefonoValido ? 'border-red-400' : 'border-slate-200'}`} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notas (opcional)</label>
                  <textarea value={notas} onChange={e => { setNotas(e.target.value); marcarTocado() }} rows={2}
                    placeholder="Ej: Entregar en la recepción"
                    className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 resize-none" />
                </div>

                <div className="mb-4" ref={metodoPagoRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">¿Cómo prefieres pagar?</label>
                  <div className="flex gap-3">
                    <button onClick={() => { setMetodoPago('transferencia'); marcarTocado() }}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                        metodoPago === 'transferencia'
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <span className="block text-base">🏦</span>
                      Transferencia
                    </button>
                    <button onClick={() => { setMetodoPago('contra_entrega'); marcarTocado() }}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                        metodoPago === 'contra_entrega'
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <span className="block text-base">🚚</span>
                      Contra entrega
                    </button>
                  </div>

                  {!metodoPago && (
                    <div className="mt-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        📱 Envías tu pedido y la tienda te contactará por WhatsApp para coordinar el pago y la entrega.
                      </p>
                    </div>
                  )}

                  {metodoPago === 'transferencia' && (
                    <div className="mt-2 p-2.5 rounded-xl border border-sky-200 bg-sky-50/70">
                      <p className="text-[11px] text-sky-700/80 leading-relaxed">
                        ℹ️ No necesitas transferir ahora. La tienda te contactará por WhatsApp con las instrucciones.
                      </p>
                    </div>
                  )}

                  {metodoPago === 'contra_entrega' && (
                    <div className="mt-2 p-2.5 rounded-xl border border-orange-200 bg-orange-50/70">
                      <p className="text-[11px] text-orange-700/80 leading-relaxed">
                        ℹ️ El pago se realiza al recibir tu pedido. La tienda coordinará la entrega contigo.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              onClick={clearCart}
              className="w-full mt-2 text-slate-500 text-sm hover:text-slate-700 py-2 touch-target"
            >
              Vaciar Carrito
            </button>
          </div>
        )}
      </div>

      {giftToRemove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4 animate-backdrop-in">
          <div className="bg-white rounded-2xl shadow-xl elevation-3 max-w-sm w-full p-6 text-center animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">¿Quitar regalo?</h3>
            <p className="text-sm text-slate-500 mb-2">
              Este producto fue canjeado con un código de regalo.
            </p>
            <p className="text-sm font-semibold text-amber-700 mb-6">
              Si lo eliminas del carrito, lo perderás permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setGiftToRemove(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors native-press">
                No, mantenerlo
              </button>
              <button onClick={async () => {
                  try {
                    await fetch('/api/gift-removed', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        storeId: idTienda,
                        productId: giftToRemove.id,
                        productName: giftToRemove.nombre,
                      }),
                    })
                  } catch {}
                  removeFromCart(giftToRemove.id)
                  setGiftToRemove(null)
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors native-press">
                Sí, quitar
              </button>
            </div>
          </div>
        </div>
      )}
      <GiftModal
        open={giftModalOpen}
        initialSender=""
        initialReceiver=""
        initialReceiverPhone=""
        initialMessage=""
        initialSenderPhone={telefonoCliente}
        onSave={async (sender, receiver, receiverPhone, message, senderPhone) => {
          setGiftSubmitting(true)
          setGiftError(null)
          try {
            const itemsList = items
              .filter(i => !i.isGift && i.precio !== 0)
              .map(i => ({
                product_id: idProductoReal(i) || i.id,
                nombre: i.nombre,
                precio: Number(i.precio) || 0,
                cantidad: i.cantidad || 1,
                imagen_url: i.imagen_url || null,
                variante_seleccionada: i.variante_seleccionada || null,
              }))

            const giftCode = Array.from(crypto.getRandomValues(new Uint8Array(10)), b =>
              'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36]
            ).join('')

            const res = await fetch('/api/gift-purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idTienda,
                sender,
                senderPhone,
                receiver,
                receiverPhone: receiverPhone || null,
                message: message || null,
                items: itemsList,
                giftCode,
                whatsappNumber,
              }),
            })

            if (!res.ok) {
              const errData = await res.json()
              setGiftError(errData.error || 'Error al procesar el regalo')
              setGiftSubmitting(false)
              return
            }

            clearCart()
            setGiftModalOpen(false)
            setIsOpen(false)
            toast('🎁 Regalo enviado con éxito', 'success')
          } catch (e: any) {
            setGiftError(e.message || 'Error al procesar el regalo')
          }
          setGiftSubmitting(false)
        }}
        onCancel={() => setGiftModalOpen(false)}
      />
      {giftError && (
        <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {giftError}
        </div>
      )}
    </div>
    </>
  )
}

export default function CartDrawer(props: CartDrawerProps) {
  return (
    <ToastProvider>
      <CartDrawerInner {...props} />
    </ToastProvider>
  )
}
