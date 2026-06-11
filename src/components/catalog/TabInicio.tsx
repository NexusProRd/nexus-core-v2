'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useConfig } from '@/context/ConfigProvider'
import Image from 'next/image'
import ProductCard, { type Producto } from './ProductCard'

function getMapEmbedUrl(mapsUrl: string): string | null {
  try {
    const url = new URL(mapsUrl)
    const q = url.searchParams.get('q')
    if (q) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
    const atMatch = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) return `https://www.google.com/maps?q=${atMatch[1]},${atMatch[2]}&output=embed`
    const placeMatch = url.pathname.match(/\/place\/([^/@]+)/)
    if (placeMatch) return `https://www.google.com/maps?q=${encodeURIComponent(placeMatch[1].replace(/\+/g, ' '))}&output=embed`
    return null
  } catch {
    return null
  }
}

interface Props {
  logoUrl: string | null
  bannerUrl: string | null
  slogan: string
  nombreTienda: string
  mensajeBienvenida: string | null
  whatsappNumber: string
  masVendidos: Producto[]
  nuevos: Producto[]
  giftMode: boolean
  trendingIds: Set<string>
  onQuickView?: (p: Producto) => void
  instagramUrl?: string | null
  facebookUrl?: string | null
  tiktokUrl?: string | null
  mapsUrl?: string | null
}

export default function TabInicio({
  logoUrl,
  bannerUrl,
  slogan,
  nombreTienda,
  mensajeBienvenida,
  whatsappNumber,
  masVendidos,
  nuevos,
  giftMode,
  trendingIds,
  onQuickView,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  mapsUrl,
}: Props) {
  const config = useConfig()
  const sobreNosotros = config.sobreNosotros
  const horario = config.horario
  const direccion = config.direccion
  const mapsEmbedUrl = useMemo(() => mapsUrl ? getMapEmbedUrl(mapsUrl) : null, [mapsUrl])
  const numeroLimpio = whatsappNumber?.replace(/\D/g, '') || ''

  return (
    <>
      {/* HERO: Banner con overlay + logo + nombre + slogan + bienvenida + CTA */}
      <section className="relative overflow-hidden">
        {bannerUrl ? (
          /* Banner hero background */
          <div className="relative min-h-[300px] sm:min-h-[340px] flex items-end">
            <Image src={bannerUrl} alt="" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
              <div className="flex items-center gap-4">
                <Link href={`/catalogo/${config.idTienda}`} className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity group">
                  {logoUrl ? (
                    <div className="relative shrink-0">
                      <Image src={logoUrl} alt={nombreTienda} width={56} height={56}
                        className="rounded-2xl ring-2 ring-white/50 shadow-xl object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 ring-1 ring-white/30">
                      <span className="text-white font-bold text-2xl">{nombreTienda.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight drop-shadow-sm">
                      {nombreTienda}
                    </h1>
                    {slogan && (
                      <p className="text-sm text-white/80 mt-0.5 font-medium leading-snug max-w-md">
                        {slogan}
                      </p>
                    )}
                    {mensajeBienvenida && !slogan && (
                      <p className="text-sm text-white/70 mt-0.5 leading-snug line-clamp-2 max-w-md">
                        {mensajeBienvenida}
                      </p>
                    )}
                  </div>
                </Link>
                {numeroLimpio && (
                  <a href={`https://wa.me/${numeroLimpio}`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-2xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 press-scale-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Contactar
                  </a>
                )}
              </div>

              {(instagramUrl || facebookUrl || tiktokUrl) && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 text-[11px] font-semibold text-white hover:bg-white/25 transition-all press-scale-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                  )}
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 text-[11px] font-semibold text-white hover:bg-white/25 transition-all press-scale-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                  )}
                  {tiktokUrl && (
                    <a href={tiktokUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 text-[11px] font-semibold text-white hover:bg-white/25 transition-all press-scale-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Fallback hero (sin banner) */
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[var(--primary)]/[0.03] blur-3xl pointer-events-none" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4 relative">
              <div className="flex items-center gap-4">
                <Link href={`/catalogo/${config.idTienda}`} className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity group">
                  {logoUrl ? (
                    <div className="relative shrink-0">
                      <Image src={logoUrl} alt={nombreTienda} width={52} height={52}
                        className="rounded-2xl ring-2 ring-white dark:ring-slate-700 shadow-lg object-cover" />
                    </div>
                  ) : (
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center shadow-lg shrink-0">
                      <span className="text-white font-bold text-xl">{nombreTienda.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight tracking-tight">
                      {nombreTienda}
                    </h1>
                    {slogan && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 font-medium leading-snug max-w-md">
                        {slogan}
                      </p>
                    )}
                    {mensajeBienvenida ? (
                      <p className="text-sm text-slate-500 mt-0.5 leading-snug line-clamp-2 max-w-md">
                        {mensajeBienvenida}
                      </p>
                    ) : !slogan ? (
                      <p className="text-xs text-slate-400 mt-0.5">Tienda verificada</p>
                    ) : null}
                  </div>
                </Link>
                {numeroLimpio && (
                  <a href={`https://wa.me/${numeroLimpio}`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-2xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 press-scale-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Contactar
                  </a>
                )}
              </div>

              {(instagramUrl || facebookUrl || tiktokUrl) && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full border border-pink-200/50 text-[11px] font-semibold text-pink-700 hover:from-pink-500/20 hover:to-purple-500/20 transition-all press-scale-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                  )}
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200/50 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-all press-scale-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                  )}
                  {tiktokUrl && (
                    <a href={tiktokUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-all press-scale-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* STOREFRONT EXPERIENCE PASS: Productos destacados */}
      {masVendidos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-rose-400" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Productos destacados</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span className="text-amber-500">🔥</span> Destacados
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            {masVendidos.map((p, idx) => (
              <ProductCard
                key={p.id}
                producto={p}
                giftMode={giftMode}
                compact
                trendingIds={trendingIds}
                onQuickView={onQuickView}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* STOREFRONT EXPERIENCE PASS: Novedades */}
      {nuevos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-purple-400" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Novedades</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">✨ Recién llegados</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            {nuevos.map((p, idx) => (
              <ProductCard
                key={p.id}
                producto={p}
                giftMode={giftMode}
                compact
                trendingIds={trendingIds}
                onQuickView={onQuickView}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* STOREFRONT EXPERIENCE PASS: Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 pb-24 sm:pb-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Sobre Nosotros */}
            <div className="group">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Sobre Nosotros</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {sobreNosotros || `Somos ${nombreTienda}, tu tienda de confianza con los mejores productos y la mejor experiencia de compra.`}
              </p>
            </div>

            {/* Horarios */}
            <div className="group">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Horarios</h3>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
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
                <h3 className="text-sm font-bold text-slate-900 mb-2">Dirección</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{direccion}</p>
              </div>
            )}

            {/* Contacto */}
            <div className="group">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Contacto</h3>
              {numeroLimpio ? (
                <a
                  href={`https://wa.me/${numeroLimpio}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors press-scale-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Escríbenos por WhatsApp
                </a>
              ) : (
                <p className="text-xs text-slate-400">Disponible próximamente</p>
              )}
            </div>
          </div>

          {mapsEmbedUrl && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Ubicación</h3>
              <a href={mapsUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
                <iframe src={mapsEmbedUrl} width="100%" height="220" className="pointer-events-none" style={{ border: 0 }} allowFullScreen loading="lazy" />
              </a>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              © {new Date().getFullYear()} {nombreTienda}. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-slate-300 mt-1">Powered by Nexus</p>
          </div>
        </div>
      </footer>
    </>
  )
}
