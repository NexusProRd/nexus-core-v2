'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useConfig } from '@/context/ConfigProvider'
import { formatCurrency } from '@/lib/utils'
import { calcularPrecioConImpuesto } from '@/lib/precios'
import BotonWhatsApp from '@/components/catalog/BotonWhatsApp'
import ModalCompartirProducto from '@/components/catalog/ModalCompartirProducto'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_oferta: number | null
  stock: number
  in_stock: boolean
  imagen_url: string | null
  tallas?: any
  tipo_articulo?: string | null
  slug?: string | null
  id_tienda: string
  aplica_impuesto?: boolean | null
  porcentaje_impuesto?: number | null
}

export default function ProductDetailClient({ producto }: { producto: Producto }) {
  const { addToCart } = useCart()
  const { nombreTienda, idTienda, whatsappNumber, tipoNegocio, currencyCode } = useConfig()
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState<'idle' | 'cart'>('idle')
  const [selectedTalla, setSelectedTalla] = useState<string | undefined>(undefined)
  const [selectedPrecioVariant, setSelectedPrecioVariant] = useState<number | null | undefined>(undefined)
  const [showShareModal, setShowShareModal] = useState(false)

  const precioBase = producto.precio_oferta ?? producto.precio
  const precioActivo = selectedPrecioVariant ?? precioBase
  const precioMinimoVariantes = Array.isArray(producto.tallas)
    ? producto.tallas.reduce((min: number, t: any) => t.precio != null && t.precio < min ? t.precio : min, producto.precio)
    : producto.precio
  const desdeMenor = !selectedPrecioVariant && precioMinimoVariantes < producto.precio
  const tieneImpuesto = (producto.aplica_impuesto ?? false) && (producto.porcentaje_impuesto ?? 0) > 0
  const mostrarConImpuesto = (precio: number) => {
    if (!tieneImpuesto) return { mostrar: precio, impuesto: 0 }
    const r = calcularPrecioConImpuesto(precio, true, producto.porcentaje_impuesto!)
    return { mostrar: r.total, impuesto: r.impuesto }
  }
  const necesitaTalla = tipoNegocio === 'ropa' && Array.isArray(producto.tallas) && producto.tallas.length > 0

  const doAddToCart = (variante?: string, precioVariant?: number | null) => {
    const precioFinal = precioVariant ?? precioActivo
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: variante ? `${producto.id}-${variante}` : producto.id,
        nombre: variante ? `${producto.nombre} (Talla: ${variante})` : producto.nombre,
        precio: precioFinal,
        imagen_url: producto.imagen_url,
        variante_seleccionada: variante,
        precio_cobrado: variante ? precioFinal : undefined,
        aplica_impuesto: producto.aplica_impuesto ?? undefined,
        porcentaje_impuesto: producto.porcentaje_impuesto ?? undefined,
      })
    }
    setFeedback('cart')
    setTimeout(() => setFeedback('idle'), 1200)
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href={`/catalogo/${idTienda}`} className="text-sm text-slate-400 hover:text-slate-600 mb-4 inline-block">
            ← Volver al catálogo
          </Link>

          <div className="grid md:grid-cols-2 gap-8 mt-4">
            <div className="relative h-72 md:h-96 bg-slate-50 rounded-2xl overflow-hidden">
              {producto.imagen_url ? (
                <Image src={producto.imagen_url} alt={producto.nombre} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <svg className="w-20 h-20 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{producto.nombre}</h1>
                <button onClick={() => setShowShareModal(true)}
                  className="shrink-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all" title="Compartir">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedPrecioVariant != null ? (
                  <span className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(mostrarConImpuesto(selectedPrecioVariant).mostrar, currencyCode)}</span>
                ) : producto.precio_oferta ? (
                  <>
                    <span className="text-xl text-slate-400 line-through">{formatCurrency(mostrarConImpuesto(producto.precio).mostrar, currencyCode)}</span>
                    <span className="text-3xl font-bold text-rose-600">{formatCurrency(mostrarConImpuesto(producto.precio_oferta).mostrar, currencyCode)}</span>
                  </>
                ) : desdeMenor ? (
                  <span className="text-3xl font-bold text-[var(--primary)]">Desde {formatCurrency(mostrarConImpuesto(precioMinimoVariantes).mostrar, currencyCode)}</span>
                ) : (
                  <span className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(mostrarConImpuesto(producto.precio).mostrar, currencyCode)}</span>
                )}
                {tieneImpuesto && <span className="text-sm font-medium text-slate-400">Impuestos incl.</span>}
              </div>

              {necesitaTalla && (
                <div className="flex flex-wrap gap-1.5">
                  {producto.tallas.map((t: any) => {
                    const tallaStr = typeof t === 'string' ? t : t.talla
                    const agotado = (typeof t !== 'string' ? t.stock : 999) <= 0
                    const seleccion = selectedTalla === tallaStr
                    return (
                      <span key={tallaStr}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all ${seleccion ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : agotado ? 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[var(--primary)] hover:text-[var(--primary)]'}`}
                        onClick={() => { if (!agotado) { setSelectedTalla(tallaStr); setSelectedPrecioVariant(typeof t !== 'string' ? t.precio : null) } }}>
                        {tallaStr}
                      </span>
                    )
                  })}
                </div>
              )}

              {producto.descripcion && (
                <p className="text-sm text-slate-500 leading-relaxed">{producto.descripcion}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm font-semibold text-slate-700">Cantidad</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-lg hover:bg-slate-200">−</button>
                  <span className="w-8 text-center text-base font-bold text-slate-900">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-lg hover:bg-slate-200">+</button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => doAddToCart(selectedTalla, selectedPrecioVariant)}
                  className="flex-1 py-3 rounded-full border-2 border-[var(--primary)] text-[var(--primary)] font-bold text-sm hover:bg-[var(--primary)]/5 transition-all">
                  {feedback === 'cart' ? '✓ Agregado' : 'Agregar al Carrito'}
                </button>
                {whatsappNumber && (
                  <BotonWhatsApp
                    productoNombre={producto.nombre}
                    productoId={producto.id}
                    productoSlug={producto.slug}
                    idTienda={idTienda}
                    whatsappNumber={whatsappNumber}
                    className="flex-1 py-3 rounded-full bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-sm inline-flex items-center justify-center gap-1.5"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
