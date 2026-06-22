'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart, CartItem } from '@/context/CartContext'
import { useConfig } from '@/context/ConfigProvider'
import { formatCurrency } from '@/lib/utils'
import GiftModal from './GiftModal'
import ToastProvider, { useToast } from '@/components/Toast'

interface CartDrawerProps {
  idTienda: string
  whatsappNumber: string
  hideCheckout?: boolean
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
  const [giftSender, setGiftSender] = useState('')
  const [giftReceiver, setGiftReceiver] = useState('')
  const [giftReceiverPhone, setGiftReceiverPhone] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [giftModalOpen, setGiftModalOpen] = useState(false)
  const [datosAccordionOpen, setDatosAccordionOpen] = useState(true)
  const hasGiftItems = items.some(i => i.isGift)
  const giftConfigurado = giftSender.trim() && giftReceiver.trim()
  const nombreValido = nombreCliente.trim().length > 0
  const telefonoValido = telefonoCliente.replace(/\D/g, '').length >= 10

  useEffect(() => {
    if (nombreValido && telefonoValido) {
      setDatosAccordionOpen(false)
    }
  }, [nombreValido, telefonoValido])
  const puedeEnviar = nombreValido && telefonoValido

  if (!isOpen) return null

  const handleCheckout = async () => {
    if (!nombreCliente.trim()) return
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
      if (giftSender.trim()) {
        let add = `🎁 Modo Regalo — De: ${giftSender.trim()}, Para: ${giftReceiver.trim() || '—'}`
        if (giftMessage.trim()) add += `, Msj: "${giftMessage.trim()}"`
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
          isGift: !!giftSender.trim(),
          notas: notaEnvio,
          giftSender: giftSender.trim() || null,
          giftReceiver: giftReceiver.trim() || null,
          giftReceiverPhone: giftReceiverPhone.trim() || null,
          giftMessage: giftMessage.trim() || null,
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
      setGiftSender('')
      setGiftReceiver('')
      setGiftReceiverPhone('')
      setGiftMessage('')
      router.push(`/catalogo/exito?pedido=${pedido.id}&tienda=${idTienda}`)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* MOTION SYSTEM PASS: Drawer slide-in with spring easing */}
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
                      /* MOBILE EXPERIENCE PASS: Larger quantity touch targets */
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

        {/* MOBILE EXPERIENCE PASS: Sticky checkout with touch-friendly inputs */}
        {!hideCheckout && items.length > 0 && (
          <div className="p-4 border-t bg-gray-50 sticky-bottom">
            {/* 🎁 Gift */}
            <div className="mb-3">
              {!giftConfigurado ? (
                <button onClick={() => setGiftModalOpen(true)}
                  className="w-full py-3 px-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-semibold text-left hover:bg-amber-100 transition-colors">
                  🎁 Comprar como regalo
                </button>
              ) : (
                <div className="flex items-center justify-between py-3 px-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-sm font-semibold text-amber-800">
                    🎁 {giftSender.trim()} → {giftReceiver.trim()}
                  </span>
                  <button onClick={() => setGiftModalOpen(true)}
                    className="text-xs font-semibold text-amber-700 underline hover:text-amber-900 transition-colors">
                    Editar
                  </button>
                </div>
              )}
            </div>
            {/* 👤 Tus datos accordion */}
            <button onClick={() => setDatosAccordionOpen(!datosAccordionOpen)}
              className="w-full flex items-center justify-between py-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {datosAccordionOpen ? (
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tus datos</span>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-700 truncate">{nombreCliente.trim() || 'Tus datos'}</span>
                    <span className={nombreValido ? 'text-emerald-600' : 'text-amber-600'}>{nombreValido ? '✅' : '⚠️'}</span>
                  </div>
                )}
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${datosAccordionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {datosAccordionOpen && (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">¿A nombre de quién preparamos el pedido?</label>
                  <input type="text" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">¿Cuál es tu WhatsApp para contactarte?</label>
                  <input type="tel" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)}
                    placeholder="+1 809 123 4567"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`w-full px-4 py-3 text-[16px] border rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 ${telefonoCliente && !telefonoValido ? 'border-red-400' : 'border-slate-200'}`} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notas (opcional)</label>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                    placeholder="Ej: Entregar en la recepción"
                    className="w-full px-4 py-3 text-[16px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none text-slate-900 resize-none" />
                </div>
              </>
            )}
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-slate-600 font-medium">Total:</span>
                {totalImpuesto > 0 && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    Subtotal {formatCurrency(subtotalSinImpuesto, currencyCode)} + Impuesto {formatCurrency(totalImpuesto, currencyCode)}
                  </div>
                )}
              </div>
              <span className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(totalPrice + totalImpuesto, currencyCode)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={!puedeEnviar || isSubmitting}
              className="w-full bg-[var(--primary)] text-white py-3.5 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed native-press elevation-2"
            >
              {isSubmitting ? 'Enviando...' : !nombreValido ? 'Ingresa tu nombre' : !telefonoValido ? 'Ingresa un teléfono válido' : 'Enviar Pedido por WhatsApp'}
            </button>
            <button
              onClick={clearCart}
              className="w-full mt-3 text-slate-500 text-sm hover:text-slate-700 py-2 touch-target"
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
        initialSender={giftSender}
        initialReceiver={giftReceiver}
        initialReceiverPhone={giftReceiverPhone}
        initialMessage={giftMessage}
        onSave={(sender, receiver, receiverPhone, message) => {
          setGiftSender(sender)
          setGiftReceiver(receiver)
          setGiftReceiverPhone(receiverPhone)
          setGiftMessage(message)
          setGiftModalOpen(false)
        }}
        onCancel={() => setGiftModalOpen(false)}
      />
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