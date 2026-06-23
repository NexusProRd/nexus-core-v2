'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { useConfig } from '@/context/ConfigProvider'
import { formatCurrency } from '@/lib/utils'
import { calcularPrecioConImpuesto } from '@/lib/precios'
import ModalSeleccionarTalla from './ModalSeleccionarTalla'
import BotonWhatsApp from './BotonWhatsApp'
import ModalCompartirProducto from './ModalCompartirProducto'
import GiftPurchaseForm from '@/components/store/GiftPurchaseForm'
// import ModalSeleccionPeso from './ModalSeleccionPeso' // Fase 2 — colmado
import type { Producto } from './ProductCard'

interface Props {
  producto: Producto
  onClose: () => void
}

export default function ProductQuickView({ producto, onClose }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState<'idle' | 'cart' | 'buy'>('idle')
  const [buying, setBuying] = useState(false)
  const { addToCart } = useCart()
  const { whatsappNumber, nombreTienda, idTienda, tipoNegocio, currencyCode } = useConfig()

  useEffect(() => {
    const prev = document.title
    document.title = `${producto.nombre} | ${nombreTienda}`
    return () => { document.title = prev }
  }, [producto.nombre, nombreTienda])

  const [showSizeModal, setShowSizeModal] = useState(false)
  const [selectedTalla, setSelectedTalla] = useState<string | undefined>(undefined)
  const [selectedPrecioVariant, setSelectedPrecioVariant] = useState<number | null | undefined>(undefined)
  // const [showPesoModal, setShowPesoModal] = useState(false) // Fase 2 — colmado
  // const [selectedPeso, setSelectedPeso] = useState<number | undefined>(undefined)
  const [showBuyForm, setShowBuyForm] = useState(false)
  const [showGiftForm, setShowGiftForm] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [buyName, setBuyName] = useState('')
  const [buyPhone, setBuyPhone] = useState('')
  const [buyMetodoPago, setBuyMetodoPago] = useState<'transferencia' | 'contra_entrega' | null>(null)

  const precioBase = producto.precio_oferta ?? producto.precio
  const precioActivo = selectedPrecioVariant ?? precioBase
  const precioMinimoVariantes = producto.tallas?.reduce((min, t) => {
    if (typeof t !== 'string' && t.precio != null && t.precio < min) return t.precio
    return min
  }, producto.precio) ?? producto.precio
  const desdeMenor = !selectedPrecioVariant && precioMinimoVariantes < producto.precio
  const tieneImpuesto = (producto.aplica_impuesto ?? false) && (producto.porcentaje_impuesto ?? 0) > 0
  const mostrarConImpuesto = (precio: number) => {
    if (!tieneImpuesto) return { mostrar: precio, impuesto: 0 }
    const r = calcularPrecioConImpuesto(precio, true, producto.porcentaje_impuesto!)
    return { mostrar: r.total, impuesto: r.impuesto }
  }
  const qtyLabel = 'Cantidad'

  const necesitaTalla = tipoNegocio === 'ropa' && producto.tallas && producto.tallas.length > 0

  const addItems = (variante?: string, precioVariant?: number | null) => {
    const precioFinal = precioVariant ?? precioActivo
    const nombreFinal = variante ? `${producto.nombre} (Talla: ${variante})` : producto.nombre
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: variante ? `${producto.id}-${variante}` : producto.id,
        nombre: nombreFinal,
        precio: precioFinal,
        imagen_url: producto.imagen_url,
        variante_seleccionada: variante,
        precio_cobrado: variante ? precioFinal : undefined,
        aplica_impuesto: producto.aplica_impuesto ?? undefined,
        porcentaje_impuesto: producto.porcentaje_impuesto ?? undefined,
      })
    }
  }

  const handleCart = () => {
    if (necesitaTalla && !selectedTalla) {
      setShowSizeModal(true)
      return
    }
    addItems(selectedTalla, selectedPrecioVariant)
    setFeedback('cart')
    setTimeout(() => setFeedback('idle'), 1200)
  }

  const handleBuy = () => {
    if (buying) return
    if (necesitaTalla && !selectedTalla) {
      setShowSizeModal(true)
      return
    }
    setShowBuyForm(true)
  }

  const confirmBuy = async () => {
    if (!buyName.trim() || !buyPhone.trim() || buying) return

    if (!producto.in_stock || producto.stock <= 0) {
      alert('Este producto no está disponible actualmente.')
      return
    }

    if (necesitaTalla && selectedTalla && Array.isArray(producto.tallas)) {
      const variant: any = producto.tallas.find((t: any) =>
        typeof t === 'object' && t.talla === selectedTalla
      )
      if (variant && (variant.stock || 0) < quantity) {
        alert(`Stock insuficiente para la talla (${selectedTalla}). Disponible: ${variant.stock || 0}`)
        return
      }
    } else if ((producto.stock || 0) < quantity) {
      alert(`Stock insuficiente. Disponible: ${producto.stock || 0}`)
      return
    }

    setBuying(true)
    setShowBuyForm(false)
    const precioFinal = selectedPrecioVariant ?? precioActivo
    const nombreConVariante = selectedTalla ? `${producto.nombre} (Talla: ${selectedTalla})` : producto.nombre

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idTienda,
        nombreCliente: buyName.trim(),
        telefonoCliente: buyPhone.trim(),
        items: [{
          id: selectedTalla ? `${producto.id}-${selectedTalla}` : producto.id,
          nombre: nombreConVariante,
          precio: precioFinal,
          cantidad: quantity,
          variante_seleccionada: selectedTalla || null,
        }],
        isGift: false,
        notas: `Compra rápida directa: ${nombreConVariante} x${quantity}`,
        metodoPago: buyMetodoPago,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      console.error('[ProductQuickView] checkout error:', errData.error)
      setBuying(false)
      alert('Error al procesar el pedido. Inténtalo de nuevo.')
      return
    }

    const { pedido } = await res.json()

    localStorage.setItem(`nexus-last-order-${idTienda}`, pedido.id)

    setBuying(false)
    setFeedback('buy')

    window.location.href = `/catalogo/exito?pedido=${pedido.id}&tienda=${idTienda}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdrop-in" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-3xl rounded-b-none sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl elevation-4 mobile-scroll modal-enter"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/30 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative h-64 sm:h-72 bg-slate-50">
          {producto.imagen_url ? (
            <Image src={producto.imagen_url} alt={producto.nombre} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{producto.nombre}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setShowShareModal(true)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all" title="Compartir">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <a href={`/catalogo/${idTienda}/producto/${producto.slug || producto.id}`} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all" title="Ver página del producto">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {selectedPrecioVariant != null ? (
                <span className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">{formatCurrency(mostrarConImpuesto(selectedPrecioVariant).mostrar, currencyCode)}</span>
              ) : producto.precio_oferta ? (
                <>
                  <span className="text-xl sm:text-2xl text-slate-400 line-through">{formatCurrency(mostrarConImpuesto(producto.precio).mostrar, currencyCode)}</span>
                  <span className="text-2xl sm:text-3xl font-bold text-rose-600">{formatCurrency(mostrarConImpuesto(producto.precio_oferta).mostrar, currencyCode)}</span>
                </>
              ) : desdeMenor ? (
                <span className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">Desde {formatCurrency(mostrarConImpuesto(precioMinimoVariantes).mostrar, currencyCode)}</span>
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">{formatCurrency(mostrarConImpuesto(producto.precio).mostrar, currencyCode)}</span>
              )}
              {tieneImpuesto && <span className="text-xs font-medium text-slate-400">Impuestos incl.</span>}
            </div>
          </div>

          {tipoNegocio === 'ropa' && producto.tallas && producto.tallas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {producto.tallas.map(t => {
                const stockVar = typeof t !== 'string' ? t.stock : 999
                const agotado = stockVar <= 0
                const seleccion = selectedTalla === (typeof t === 'string' ? t : t.talla)
                const tallaStr = typeof t === 'string' ? t : t.talla
                return (
                  <span key={tallaStr} className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all ${seleccion ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : agotado ? 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer'}`} onClick={!agotado && !seleccion ? () => {
                    setSelectedTalla(tallaStr)
                    setSelectedPrecioVariant(typeof t !== 'string' ? t.precio : null)
                  } : undefined}>
                    {tallaStr}
                  </span>
                )
              })}
              {!selectedTalla && <span className="text-[10px] text-slate-400 self-center ml-1">Selecciona una talla</span>}
            </div>
          )}
          {selectedTalla && (
            <p className="text-xs text-slate-400">
              {(() => {
                const varData = (producto.tallas || []).find(v => (typeof v === 'string' ? v : v.talla) === selectedTalla)
                const stockVar = varData && typeof varData !== 'string' ? varData.stock : null
                if (stockVar != null) return stockVar <= 3 ? <span className="text-rose-600 font-semibold">¡Solo quedan {stockVar} piezas en {selectedTalla}!</span> : `Disponibles en ${selectedTalla}: ${stockVar}`
                return ''
              })()}
            </p>
          )}

          {producto.descripcion && (
            <p className="text-sm text-slate-500 leading-relaxed">{producto.descripcion}</p>
          )}

          {!selectedTalla && producto.stock > 0 && (
            <p className="text-xs text-slate-400">
              Stock total: <span className="font-semibold text-slate-600">{producto.stock} unidades</span>
            </p>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-sm font-semibold text-slate-700">{qtyLabel}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-lg font-medium hover:bg-slate-200 transition-colors active:scale-90"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-bold text-slate-900">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-lg font-medium hover:bg-slate-200 transition-colors active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Dual buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCart}
              className="flex-1 py-3 rounded-full border-2 border-[var(--primary)] text-[var(--primary)] font-bold text-sm hover:bg-[var(--primary)]/5 transition-all active:scale-95"
            >
              {feedback === 'cart' ? '✓ Agregado' : '🛒 Carrito'}
            </button>
            <button
              onClick={handleBuy}
              disabled={buying}
              className="flex-1 py-3 rounded-full bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
            >
              {feedback === 'buy' ? '✓ Listo' : buying ? '...' : 'Comprar ahora'}
            </button>
          </div>

          {/* Gift button */}
          {producto.in_stock && (
            <button
              onClick={() => setShowGiftForm(true)}
              className="w-full py-2.5 rounded-full border border-amber-300 text-amber-700 font-semibold text-sm hover:bg-amber-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🎁</span>
              Comprar como Regalo
            </button>
          )}

          {showBuyForm && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <p className="text-sm font-semibold text-slate-700">Tus datos</p>
              <input
                type="text"
                value={buyName}
                onChange={e => setBuyName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-slate-50"
              />
              <input
                type="tel"
                value={buyPhone}
                onChange={e => setBuyPhone(e.target.value)}
                placeholder="Tu WhatsApp (829-123-4567)"
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-slate-50"
              />
              <div className="flex gap-3">
                  <button onClick={() => setBuyMetodoPago('transferencia')}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold text-left transition-all ${
                      buyMetodoPago === 'transferencia'
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                        : 'border-slate-200 text-slate-600'
                    }`}>
                    <span className="block text-xs">🏦</span>
                    Transferencia
                  </button>
                  <button onClick={() => setBuyMetodoPago('contra_entrega')}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold text-left transition-all ${
                      buyMetodoPago === 'contra_entrega'
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                        : 'border-slate-200 text-slate-600'
                    }`}>
                    <span className="block text-xs">🚚</span>
                    Contra entrega
                  </button>
                </div>

              {!buyMetodoPago && (
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-[11px] font-semibold text-slate-700 mb-1">📱 ¿Qué sucede después?</p>
                  <ol className="text-[10px] text-slate-500 space-y-0.5 list-decimal list-inside">
                    <li>Envías tu pedido.</li>
                    <li>La tienda revisa la disponibilidad.</li>
                    <li>Te contactará por WhatsApp para coordinar el pago y la entrega.</li>
                  </ol>
                </div>
              )}

              {buyMetodoPago === 'transferencia' && (
                <div className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/70">
                  <p className="text-[11px] font-semibold text-sky-800 mb-0.5">ℹ️ Transferencia bancaria</p>
                  <p className="text-[10px] text-sky-700/80 leading-relaxed">
                    No necesitas realizar ninguna transferencia ahora. La tienda se comunicará contigo por WhatsApp para compartir las instrucciones de pago.
                  </p>
                </div>
              )}

              {buyMetodoPago === 'contra_entrega' && (
                <div className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/70">
                  <p className="text-[11px] font-semibold text-orange-800 mb-0.5">ℹ️ Contra entrega</p>
                  <p className="text-[10px] text-orange-700/80 leading-relaxed">
                    El pago se realizará al recibir tu pedido. La tienda se comunicará contigo por WhatsApp para coordinar la entrega.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setShowBuyForm(false); setBuyName(''); setBuyPhone(''); setBuyMetodoPago(null) }} className="flex-1 py-2.5 rounded-full border border-slate-300 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={confirmBuy} disabled={!buyName.trim() || !buyPhone.trim() || !buyMetodoPago} className="flex-1 py-2.5 rounded-full bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 disabled:opacity-40 transition-all shadow-sm">Confirmar compra</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* // Fase 2 — colmado
      {showPesoModal && (
        <ModalSeleccionPeso
          producto={producto}
          onConfirm={(peso_libras) => {
            setSelectedPeso(peso_libras)
            setShowPesoModal(false)
            addItems(undefined, peso_libras)
            setFeedback('cart')
            setTimeout(() => setFeedback('idle'), 1200)
          }}
          onClose={() => setShowPesoModal(false)}
        />
      )} */}

      {showSizeModal && (
        <ModalSeleccionarTalla
          producto={{ ...producto, tallas: producto.tallas }}
          onConfirm={(variante, precioVariant) => {
            setSelectedTalla(variante)
            setSelectedPrecioVariant(precioVariant)
            setShowSizeModal(false)
            addItems(variante, precioVariant)
            setFeedback('cart')
            setTimeout(() => setFeedback('idle'), 1200)
          }}
          onClose={() => setShowSizeModal(false)}
        />
      )}

      {showShareModal && (
        <ModalCompartirProducto
          productoNombre={producto.nombre}
          tiendaSlug={idTienda}
          productoSlug={producto.slug || producto.id}
          whatsappNumber={whatsappNumber}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showGiftForm && (
        <GiftPurchaseForm
          idTienda={idTienda}
          whatsappNumber={whatsappNumber || ''}
          autoOpen
          defaultProduct={{
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio_oferta ?? producto.precio,
            stock: producto.stock,
            in_stock: producto.in_stock,
            imagen_url: producto.imagen_url,
          }}
        />
      )}
    </div>
  )
}
