'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useConfig } from '@/context/ConfigProvider'
import { useCart } from '@/context/CartContext'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { type Producto } from './ProductCard'
import type { Portada } from '@/types/portada'


interface Props {
  portadas?: Portada[]
  productos?: Producto[]
  logoUrl: string | null
  bannerUrl: string | null
  slogan: string
  nombreTienda: string
  mensajeBienvenida: string | null
  whatsappNumber: string
  masVendidos: Producto[]
  nuevos: Producto[]
  ofertas: Producto[]
  giftMode: boolean
  trendingIds: Set<string>
  onQuickView?: (p: Producto) => void
  instagramUrl?: string | null
  facebookUrl?: string | null
  tiktokUrl?: string | null
  mapsUrl?: string | null
  onVerProductos?: () => void
  onOpenProduct?: (productId: string) => void
}

export default function TabInicio({
  portadas = [],
  productos = [],
  logoUrl,
  bannerUrl,
  slogan,
  nombreTienda,
  mensajeBienvenida,
  whatsappNumber,
  masVendidos,
  nuevos,
  ofertas,
  giftMode,
  trendingIds,
  onQuickView,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  mapsUrl,
  onVerProductos,
  onOpenProduct,
}: Props) {
  const config = useConfig()
  const { addToCart } = useCart()
  const sobreNosotros = config.sobreNosotros
  const horario = config.horario
  const direccion = config.direccion
  const currencyCode = config.currencyCode
  const numeroLimpio = whatsappNumber?.replace(/\D/g, '') || ''

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [autoSlidePaused, setAutoSlidePaused] = useState(false)
  const destacadosRef = useRef<HTMLDivElement>(null)

  const [currentSlide, setCurrentSlide] = useState(0)
  const hasPortadas = portadas.length > 0

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const swipeThreshold = 50

  const goNext = useCallback(() => {
    if (!hasPortadas) return
    setCurrentSlide(prev => (prev + 1) % portadas.length)
  }, [hasPortadas, portadas.length])

  const goPrev = useCallback(() => {
    if (!hasPortadas) return
    setCurrentSlide(prev => (prev - 1 + portadas.length) % portadas.length)
  }, [hasPortadas, portadas.length])

  useEffect(() => {
    if (!hasPortadas || portadas.length <= 1) return
    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [hasPortadas, goNext, portadas.length])

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchEndX.current = e.touches[0].clientX }
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd = () => {
    if (!hasPortadas) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > swipeThreshold) { diff > 0 ? goNext() : goPrev() }
  }

  useEffect(() => {
    if (autoSlidePaused || masVendidos.length <= 1 || !destacadosRef.current) return
    if (window.innerWidth >= 640) return
    const timer = setInterval(() => {
      const container = destacadosRef.current
      if (!container) return
      const maxScroll = container.scrollWidth - container.clientWidth
      const nextPos = container.scrollLeft + container.clientWidth
      if (nextPos >= maxScroll - 1) {
        container.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        container.scrollBy({ left: container.clientWidth, behavior: 'smooth' })
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [autoSlidePaused, masVendidos.length])

  return (
    <>
      {/* STOREFRONT EXPERIENCE PASS: Hero */}
      {(hasPortadas && portadas.some(p => p.imagen_url)) || bannerUrl ? (
      <div className="max-w-6xl mx-auto mt-4 sm:mt-6 px-4 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl">
        <div className="relative min-h-[300px] sm:min-h-[340px]">
          {hasPortadas ? portadas.map((p, i) => {
            const pData = p.id_producto ? productos.find(pr => pr.id === p.id_producto) : null
            return (
            <div key={i} className="absolute inset-0"
              style={{
                opacity: i === currentSlide ? 1 : 0,
                zIndex: i === currentSlide ? 10 : 0,
                pointerEvents: i === currentSlide ? 'auto' : 'none',
                transition: 'opacity 500ms ease-in-out'
              }}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
              {p.imagen_url ? (
                <Image src={p.imagen_url} alt="" fill className="object-cover" priority sizes="100vw" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <span className="text-white/40 text-sm">Sin imagen</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
              {p.titulo && (
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                  <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{p.titulo}</h2>
                  {p.descripcion && <p className="text-sm text-white/80 mt-1 drop-shadow-md">{p.descripcion}</p>}
                  {pData && p.tipo !== 'institucional' && (
                    <div className="mt-2 flex items-baseline gap-2">
                      {p.tipo === 'oferta' && pData.precio_oferta ? (
                        <>
                          <span className="text-sm text-white/60 line-through">{formatCurrency(pData.precio, currencyCode)}</span>
                          <span className="text-lg font-bold text-amber-300">{formatCurrency(pData.precio_oferta, currencyCode)}</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-white">{formatCurrency(pData.precio, currencyCode)}</span>
                      )}
                    </div>
                  )}
                  {(p.cta_accion === 'ver_productos' || (p.cta_accion === 'ver_producto' && p.id_producto)) && (
                    <button onClick={(e) => {
                      e.stopPropagation()
                      if (p.cta_accion === 'ver_productos') {
                        onVerProductos?.()
                      } else if (p.cta_accion === 'ver_producto' && p.id_producto) {
                        onOpenProduct?.(p.id_producto)
                      }
                    }}
                      className="mt-3 inline-block px-5 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold hover:bg-white/30 transition-all">
                      {p.cta_texto || (p.tipo === 'institucional' ? 'Ver productos' : p.tipo === 'oferta' ? 'Aprovechar Oferta' : 'Ver detalle')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}) : bannerUrl ? (
            <div className="absolute inset-0">
              <Image src={bannerUrl} alt="" fill className="object-cover" priority sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          )}
        </div>

        {hasPortadas && portadas.length > 1 && (
          <>
            <button onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {portadas.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white scale-100' : 'bg-white/40 scale-75 hover:bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </section>
      </div>
      ) : null}

      {/* STOREFRONT EXPERIENCE PASS: Productos destacados (Premium) */}
      {masVendidos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-rose-400" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">Productos destacados</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span className="text-amber-500">🔥</span> Destacados
            </span>
          </div>
          <div ref={destacadosRef} onTouchStart={() => setAutoSlidePaused(true)} onTouchEnd={() => { setAutoSlidePaused(true); setTimeout(() => setAutoSlidePaused(false), 5000) }}
            className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide [scroll-snap-type:x_mandatory] sm:[scroll-snap-type:none] lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:pb-0 lg:[scroll-snap-type:none]">
            {masVendidos.map((p) => {
              const rating = 3.5 + (Math.abs(p.id.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)) % 15) / 10
              const tieneOferta = p.precio_oferta != null && p.precio_oferta < p.precio
              const precioMostrar = tieneOferta ? p.precio_oferta! : p.precio
              return (
                <div key={p.id} onClick={() => onQuickView?.(p)}
                  className="min-w-full w-full shrink-0 sm:min-w-[330px] sm:w-[330px] sm:shrink lg:min-w-0 lg:w-auto lg:shrink bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm hover:shadow-xl dark:border dark:border-slate-800 overflow-hidden cursor-pointer transition-all active:scale-[0.98] group [scroll-snap-align:start]">
                  <div className="relative h-36 sm:h-44 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-10 h-10 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {!p.in_stock && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-white/95 text-slate-700 text-[11px] font-semibold px-3.5 py-1.5 rounded-full shadow-lg">Agotado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-5">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1.5">{p.nombre}</h3>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1 text-amber-400 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tieneOferta ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">Oferta</span>
                            <span className="text-xs text-slate-400 line-through">{formatCurrency(p.precio, currencyCode)}</span>
                          </div>
                        ) : null}
                        <span className={`text-base sm:text-lg font-bold ${tieneOferta ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {formatCurrency(precioMostrar, currencyCode)}
                        </span>
                      </div>
                    </div>
                    {(p.aplica_impuesto ?? false) && (p.porcentaje_impuesto ?? 0) > 0 && (
                      <p className="text-[10px] text-slate-400 mb-2">+ Impuestos incl.</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={e => { e.stopPropagation(); setQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] ?? 1) - 1) })) }}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">−</button>
                      <span className="w-7 text-center text-sm font-bold text-slate-900 dark:text-white">{quantities[p.id] ?? 1}</span>
                      <button onClick={e => { e.stopPropagation(); setQuantities(prev => ({ ...prev, [p.id]: (prev[p.id] ?? 1) + 1 })) }}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">+</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); const q = quantities[p.id] ?? 1; for (let i = 0; i < q; i++) { addToCart({ id: p.id, nombre: p.nombre, precio: precioMostrar, imagen_url: p.imagen_url, aplica_impuesto: p.aplica_impuesto ?? undefined, porcentaje_impuesto: p.porcentaje_impuesto ?? undefined }) } }}
                        className="flex-none w-10 h-10 rounded-xl border-2 border-[var(--primary)]/40 text-[var(--primary)] flex items-center justify-center hover:bg-[var(--primary)]/5 hover:border-[var(--primary)] transition-all" title="Agregar al carrito">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onQuickView?.(p) }}
                        className="flex-1 h-9 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 active:scale-[0.97]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* STOREFRONT EXPERIENCE PASS: Novedades */}
      {nuevos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-purple-400" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">Novedades</h2>
            </div>
            {nuevos.length >= 8 && onVerProductos && (
              <button onClick={onVerProductos}
                className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1">
                Ver todos
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            {nuevos.map((p) => {
              const rating = 3.5 + (Math.abs(p.id.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)) % 15) / 10
              const tieneOferta = p.precio_oferta != null && p.precio_oferta < p.precio
              const precioMostrar = tieneOferta ? p.precio_oferta! : p.precio
              return (
                <div key={p.id} onClick={() => onQuickView?.(p)}
                  className="min-w-[260px] w-[260px] sm:min-w-[300px] sm:w-[300px] bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] touch-target shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{p.nombre}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {tieneOferta ? (
                        <>
                          <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">Oferta</span>
                          <span className="text-[10px] text-slate-400 line-through">{formatCurrency(p.precio, currencyCode)}</span>
                        </>
                      ) : null}
                      <span className={`text-xs font-bold ${tieneOferta ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {formatCurrency(precioMostrar, currencyCode)}
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onQuickView?.(p) }}
                      className="mt-1.5 text-[10px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-1">
                      Ver Detalle
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* STOREFRONT EXPERIENCE PASS: Ofertas */}
      {ofertas.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">Ofertas</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">Imperdibles</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            {ofertas.map((p) => {
              const rating = 3.5 + (Math.abs(p.id.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)) % 15) / 10
              const tieneOferta = p.precio_oferta != null && p.precio_oferta < p.precio
              const precioMostrar = tieneOferta ? p.precio_oferta! : p.precio
              const descuento = tieneOferta ? Math.round((1 - p.precio_oferta! / p.precio) * 100) : 0
              return (
                <div key={p.id} onClick={() => onQuickView?.(p)}
                  className="min-w-[220px] w-[220px] sm:min-w-[260px] sm:w-[260px] bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm hover:shadow-xl dark:border dark:border-slate-800 overflow-hidden cursor-pointer transition-all active:scale-[0.98] shrink-0 group">
                  <div className="relative h-32 sm:h-36 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-8 h-8 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {!p.in_stock && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-white/95 text-slate-700 text-[11px] font-semibold px-3.5 py-1.5 rounded-full shadow-lg">Agotado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {descuento > 0 && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 mb-2">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">-{descuento}%</span>
                      </div>
                    )}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">{p.nombre}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {tieneOferta && (
                        <span className="text-xs text-slate-400 line-through">{formatCurrency(p.precio, currencyCode)}</span>
                      )}
                      <span className={`text-sm font-bold ${tieneOferta ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {formatCurrency(precioMostrar, currencyCode)}
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onQuickView?.(p) }}
                      className="mt-2 w-full h-8 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-all active:scale-[0.97]">
                      Aprovechar Oferta
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* STOREFRONT EXPERIENCE PASS: Benefits Bar */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-slate-800 shadow-lg shadow-black/5 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Envíos seguros</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">A todo el país</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Calidad garantizada</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Productos verificados</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Atención rápida</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Respuesta inmediata</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Compra segura</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Pagos protegidos</p>
            </div>
          </div>
        </div>
      </section>

      {/* STOREFRONT EXPERIENCE PASS: Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10 pb-24 sm:pb-6">
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="group">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Sobre Nosotros</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {sobreNosotros || `Somos ${nombreTienda}, tu tienda de confianza con los mejores productos y la mejor experiencia de compra.`}
              </p>
            </div>
            <div className="group">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Horarios</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {horario || 'Lunes a Viernes: 9:00 AM - 6:00 PM\nSábados: 9:00 AM - 2:00 PM\nDomingos: Cerrado'}
              </p>
            </div>
            {direccion && (
              <div className="group">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                  <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Dirección</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{direccion}</p>
              </div>
            )}
            <div className="group">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Contacto</h3>
              {numeroLimpio ? (
                <a href={`https://wa.me/${numeroLimpio}?text=${encodeURIComponent('¡Hola! Quiero información sobre sus productos.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors press-scale-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Escríbenos por WhatsApp
                </a>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">Disponible próximamente</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} {nombreTienda}. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Powered by Nexus</p>
          </div>
        </div>
      </footer>
    </>
  )
}
