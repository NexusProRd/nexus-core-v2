'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useConfig } from '@/context/ConfigProvider'
import { createClient } from '@/lib/supabase'
import { formatearPrecio } from '@/lib/utils'
import ModalSeleccionarTalla from './ModalSeleccionarTalla'
import ProductQuickView from './ProductQuickView'
import BotonWhatsApp from './BotonWhatsApp'
import ModalCompartirProducto from './ModalCompartirProducto'
// import ModalSeleccionPeso from './ModalSeleccionPeso' // Fase 2 — colmado (Venta al Detalle)
import type { TallaVariant } from '@/types/database'

export interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_oferta: number | null
  stock: number
  in_stock: boolean
  imagen_url: string | null
  categoria?: string | null
  unidad_medida?: string | null
  tallas?: (string | TallaVariant)[]
  tipo_articulo?: string | null
  slug?: string | null
}

function hashRating(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) { h = ((h << 5) - h) + id.charCodeAt(i); h |= 0 }
  return 3.5 + (Math.abs(h) % 15) / 10
}

function getBadge(id: string, stock: number, inStock: boolean, isTrending: boolean): { type: string; label: string } | null {
  if (!inStock || stock <= 0) return null
  if (stock <= 3) return { type: 'limited', label: 'Stock Limitado' }
  if (isTrending) return { type: 'trending', label: 'Trending' }
  return null
}

const badgeStyles: Record<string, string> = {
  trending: 'bg-blue-500',
  limited: 'bg-rose-500',
  smart: 'bg-emerald-500',
}

interface Props {
  producto: Producto
  monedaSimbolo: string
  giftMode: boolean
  compact?: boolean
  trendingIds: Set<string>
  onQuickView?: (p: Producto) => void
  index?: number
}

export default function ProductCard({ producto, monedaSimbolo, giftMode, compact, trendingIds, onQuickView, index }: Props) {
  const router = useRouter()
  const { addToCart } = useCart()
  const { idTienda, whatsappNumber, nombreTienda, tipoNegocio } = useConfig()
  const [quantity, setQuantity] = useState(1)
  const [showQuickView, setShowQuickView] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [feedback, setFeedback] = useState<'idle' | 'cart' | 'buy'>('idle')
  const [buying, setBuying] = useState(false)

  // Estado para Modal de Tallas (ropa)
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<'cart' | 'quickbuy' | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined)
  const [selectedPrecioVariant, setSelectedPrecioVariant] = useState<number | null | undefined>(undefined)

  // // Estado para Modal de Peso (colmado/libra) — Fase 2
  // const [showPesoModal, setShowPesoModal] = useState(false)
  // const [pendingPesoAction, setPendingPesoAction] = useState<'cart' | 'quickbuy' | null>(null)
  // const [selectedPeso, setSelectedPeso] = useState<number | undefined>(undefined)

  // Estados para el Modal de Compra Rápida Directa
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false)
  const [quickBuyName, setQuickBuyName] = useState('')
  const [quickBuyPhone, setQuickBuyPhone] = useState('')

  const rating = useMemo(() => hashRating(producto.id), [producto.id])
  const isTrending = useMemo(() => trendingIds.has(producto.id), [trendingIds, producto.id])
  const badge = useMemo(() => getBadge(producto.id, producto.stock, producto.in_stock, isTrending), [producto.id, producto.stock, producto.in_stock, isTrending])
  const outOfStock = !producto.in_stock
  const precioBase = producto.precio_oferta ?? producto.precio
  const precioActivo = selectedPrecioVariant ?? precioBase
  const precioMinimoVariantes = useMemo(() => producto.tallas?.reduce((min, t) => {
    if (typeof t !== 'string' && t.precio != null && t.precio < min) return t.precio
    return min
  }, producto.precio) ?? producto.precio, [producto.tallas, producto.precio])
  const desdeMenor = !selectedPrecioVariant && precioMinimoVariantes < producto.precio
  const qtyLabel = 'Cant'

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (tipoNegocio === 'ropa' && producto.tallas && producto.tallas.length > 0) {
      setPendingAction('cart')
      setShowSizeModal(true)
      return
    }
    doAddToCart()
  }

  const doAddToCart = (variante?: string, precioVariant?: number | null) => {
    const precioFinal = precioVariant ?? precioActivo
    for (let i = 0; i < quantity; i++) {
      const nombreFinal = variante
        ? `${producto.nombre} (Talla: ${variante})`
        : producto.nombre
      addToCart({
        id: variante ? `${producto.id}-${variante}` : producto.id,
        nombre: nombreFinal,
        precio: precioFinal,
        imagen_url: producto.imagen_url,
        variante_seleccionada: variante,
        precio_cobrado: variante ? precioFinal : undefined,
      })
    }
    setFeedback('cart')
    setTimeout(() => setFeedback('idle'), 1200)
  }

  const handleQuickBuyConfirm = async () => {
    if (!quickBuyName.trim() || !quickBuyPhone.trim() || buying) return
    setBuying(true)
    const supabase = createClient()

    const precioFinal = selectedPrecioVariant ?? precioActivo
    const nombreConSize = selectedSize ? `${producto.nombre} (Talla: ${selectedSize})` : producto.nombre
    const orderId = crypto.randomUUID().slice(0, 8).toUpperCase()
    const total = precioFinal * quantity

    const { data: pedido, error } = await supabase.from('pedidos').insert({
      id_tienda: idTienda,
      cliente_nombre: quickBuyName.trim(),
      cliente_telefono: quickBuyPhone.trim(),
      is_gift: false,
      notas: `Compra rápida directa: ${nombreConSize} x${quantity}`,
      order_id: orderId,
      total,
      estado: 'pendiente',
      detalles_pedido: [{ producto: nombreConSize, cantidad: quantity, precio_unitario: precioFinal, precio_cobrado: precioFinal }],
    }).select().single()

    if (error || !pedido) {
      setBuying(false)
      alert('Error al procesar el pedido. Inténtalo de nuevo.')
      return
    }

    // Inserción en la tabla detalles_pedido para consistencia del Dashboard
    await supabase.from('detalles_pedido').insert({
      id_pedido: pedido.id,
      id_producto: producto.id,
      producto: nombreConSize,
      cantidad: quantity,
      precio_unitario: precioFinal,
    })

    await supabase.rpc('decrement_stock', { pid: producto.id })

    localStorage.setItem(`nexus-last-order-${idTienda}`, pedido.id)

    const numeroLimpio = whatsappNumber?.replace(/\D/g, '') || ''
    let msg = `🛍️ *¡Nuevo Pedido desde ${nombreTienda || 'el Catálogo'}!*\n\n`
    msg += `*Orden:* ${orderId}\n`
    msg += `*Cliente:* ${quickBuyName.trim()}\n`
    msg += `*Contacto:* ${quickBuyPhone.trim()}\n\n`
    msg += `*Producto(s):* ${nombreConSize} (x${quantity}) = ${monedaSimbolo}${formatearPrecio(precioActivo)} c/u\n\n`
    msg += `*Total a Cobrar: ${monedaSimbolo}${formatearPrecio(total)}*\n\n`
    msg += `Por favor, quedo atento para realizar la cotización del envío. ¡Muchas gracias!`

    setBuying(false)
    setShowQuickBuyModal(false)

    if (numeroLimpio) {
      window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    window.location.href = `/catalogo/exito?pedido=${pedido.id}&tienda=${idTienda}`
  }

  return (
    <>
      <div
        onClick={() => { if (!outOfStock) setShowQuickView(true) }}
        className={`group bg-white rounded-2xl border border-slate-100 overflow-hidden card-press elevation-1 ${
          !outOfStock ? 'cursor-pointer' : 'opacity-50'
        } ${compact ? 'min-w-[170px] w-[170px] sm:min-w-[210px] sm:w-[210px]' : ''}`}
      >
        <div className={`relative ${compact ? 'h-28 sm:h-36' : 'h-32 sm:h-48'} bg-slate-50 overflow-hidden`}>
          {badge && (
            <span className={`absolute top-2 left-2 z-10 ${badgeStyles[badge.type]} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm tracking-wide`}>
              {badge.label}
            </span>
          )}
          <div className="absolute top-2 right-2 z-10">
            <button onClick={e => { e.stopPropagation(); setShowShareModal(true) }}
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 elevation-2 flex items-center justify-center hover:bg-white transition-all text-slate-400 hover:text-[var(--primary)] active:scale-90 native-press" title="Compartir">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
          {outOfStock && (
            <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center backdrop-blur-[1px]">
              <span className="bg-white/95 text-slate-700 text-[11px] font-semibold px-3.5 py-1.5 rounded-full shadow-lg">Agotado</span>
            </div>
          )}
          {producto.imagen_url ? (
            <Image src={producto.imagen_url} alt={producto.nombre} fill className={`object-cover transition-all duration-700 ${!outOfStock ? 'group-hover:scale-105' : ''}`} sizes="(max-width: 768px) 50vw, 25vw" priority={index !== undefined && index < 4} decoding="async" loading={index !== undefined && index < 4 ? 'eager' : 'lazy'} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <svg className="w-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 flex-1">{producto.nombre}</h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              <span className="text-[10px] font-semibold text-slate-400">{rating.toFixed(1)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2.5">
            {selectedPrecioVariant != null ? (
              <span className="text-sm font-bold text-[var(--primary)]">{monedaSimbolo}{formatearPrecio(selectedPrecioVariant)}</span>
            ) : producto.precio_oferta ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700">Oferta</span>
                <span className="text-xs text-slate-400 line-through">{monedaSimbolo}{formatearPrecio(producto.precio)}</span>
                <span className="text-sm font-bold text-rose-600">{monedaSimbolo}{formatearPrecio(producto.precio_oferta)}</span>
              </div>
            ) : desdeMenor ? (
              <span className="text-sm font-bold text-[var(--primary)]">Desde {monedaSimbolo}{formatearPrecio(precioMinimoVariantes)}</span>
            ) : (
              <span className="text-sm font-bold text-slate-900">{monedaSimbolo}{formatearPrecio(producto.precio)}</span>
            )}
            {producto.unidad_medida === 'libra' && <span className="text-[10px] text-slate-400">/lb</span>}
          </div>

          {tipoNegocio === 'ropa' && producto.tallas && producto.tallas.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {producto.tallas.slice(0, 8).map(t => {
                const tallaStr = typeof t === 'string' ? t : t.talla
                return (
                  <span key={tallaStr} className="px-1.5 py-0.5 text-[9px] font-medium rounded border leading-tight bg-slate-100 text-slate-600 border-slate-200">
                    {tallaStr}
                  </span>
                )
              })}
              {producto.tallas.length > 8 && (
                <span className="px-1.5 py-0.5 text-[9px] font-medium text-slate-400">+{producto.tallas.length - 8}</span>
              )}
            </div>
          )}

          {!outOfStock ? (
            <div className="space-y-3">
              {/* PRODUCT CARD ACTIONS POLISH: Quantity with more breathing room */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{qtyLabel}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={e => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)) }} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all native-press">−</button>
                  <span className="w-7 text-center text-sm font-bold text-slate-900 dark:text-white">{quantity}</span>
                  <button onClick={e => { e.stopPropagation(); setQuantity(quantity + 1) }} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all native-press">+</button>
                </div>
              </div>
              {/* PRODUCT CARD ACTIONS POLISH: Refined button pair — secondary outlined + primary filled */}
              <div className="flex items-center gap-2.5">
                <button onClick={handleCart} className="flex-none w-10 h-10 rounded-xl border-2 border-[var(--primary)]/40 text-[var(--primary)] flex items-center justify-center hover:bg-[var(--primary)]/5 hover:border-[var(--primary)] transition-all native-press" title="Agregar al carrito">
                  {feedback === 'cart' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  )}
                </button>
                <button onClick={e => {
                  e.stopPropagation();
                  if (tipoNegocio === 'ropa' && producto.tallas && producto.tallas.length > 0) {
                    setPendingAction('quickbuy')
                    setShowSizeModal(true)
                  } else {
                    setShowQuickBuyModal(true)
                  }
                }} className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white font-semibold text-[11px] hover:brightness-110 transition-all native-press elevation-2 shadow-[var(--primary)]/20 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  Comprar
                </button>
              </div>
            </div>
          ) : (
            <button disabled className="w-full bg-slate-100 dark:bg-slate-700 text-slate-400 font-semibold rounded-xl py-2.5 text-[11px] cursor-not-allowed">Agotado</button>
          )}
        </div>
      </div>

      {/* Modal de Compra Rápida Directa */}
      {/* MOTION SYSTEM PASS: Modal entrance with scale-in */}
      {showQuickBuyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-backdrop-in" onClick={(e) => { e.stopPropagation(); setShowQuickBuyModal(false); }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-slate-900 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">⚡ Compra Rápida Directa</h3>
            <p className="text-xs text-slate-500 mb-4">Estás comprando: <span className="font-semibold text-slate-700">{producto.nombre}{selectedSize ? ` (Talla: ${selectedSize})` : ''} (x{quantity})</span></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input type="text" value={quickBuyName} onChange={e => setQuickBuyName(e.target.value)} placeholder="Tu nombre" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp</label>
                <input type="tel" value={quickBuyPhone} onChange={e => setQuickBuyPhone(e.target.value)} placeholder="Ej: 809-555-1234" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button type="button" onClick={() => setShowQuickBuyModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 native-press">Cancelar</button>
              <button type="button" onClick={handleQuickBuyConfirm} disabled={!quickBuyName.trim() || !quickBuyPhone.trim() || buying} className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold text-xs hover:brightness-110 disabled:opacity-50 native-press flex items-center justify-center">
                {buying ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* // Modal de Selección de Peso (colmado/libra) — Fase 2 */}
      {/* {showPesoModal && (
        <ModalSeleccionPeso
          producto={producto}
          monedaSimbolo={monedaSimbolo}
          onConfirm={(peso_libras) => {
            setSelectedPeso(peso_libras)
            setShowPesoModal(false)
            if (pendingPesoAction === 'cart') {
              setPendingPesoAction(null)
              doAddToCart({ peso_libras })
            } else if (pendingPesoAction === 'quickbuy') {
              setPendingPesoAction(null)
              setShowQuickBuyModal(true)
            }
          }}
          onClose={() => { setShowPesoModal(false); setPendingPesoAction(null) }}
        />
      )} */}

      {/* Modal de Selección de Talla (ropa) */}
      {showSizeModal && (
        <ModalSeleccionarTalla
          producto={{ ...producto, tallas: producto.tallas }}
          monedaSimbolo={monedaSimbolo}
          onConfirm={(variante, precioVariant) => {
            setSelectedSize(variante)
            setSelectedPrecioVariant(precioVariant)
            setShowSizeModal(false)
            if (pendingAction === 'cart') {
              setPendingAction(null)
              doAddToCart(variante, precioVariant)
            } else if (pendingAction === 'quickbuy') {
              setPendingAction(null)
              setShowQuickBuyModal(true)
            }
          }}
          onClose={() => { setShowSizeModal(false); setPendingAction(null) }}
        />
      )}

      {showQuickView && (
        <ProductQuickView
          producto={producto}
          monedaSimbolo={monedaSimbolo}
          onClose={() => setShowQuickView(false)}
        />
      )}

      {showShareModal && (
        <ModalCompartirProducto
          productoNombre={producto.nombre}
          tiendaSlug={idTienda}
          productoSlug={producto.slug || producto.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}
