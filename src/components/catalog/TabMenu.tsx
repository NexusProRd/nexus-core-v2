'use client'

import { useRef, useMemo, useState } from 'react'
import ProductCard, { type Producto } from './ProductCard'

interface Props {
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCategory: string
  setSelectedCategory: (c: string) => void
  categories: string[]
  filtered: Producto[]
  monedaSimbolo: string
  giftMode: boolean
  trendingIds: Set<string>
  onQuickView?: (p: Producto) => void
  tipoNegocio?: string
}

type SortOrder = 'none' | 'asc' | 'desc'

export default function TabMenu({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  filtered,
  monedaSimbolo,
  giftMode,
  trendingIds,
  onQuickView,
  tipoNegocio = 'estandar',
}: Props) {
  const categoryRef = useRef<HTMLDivElement>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('none')
  const [availableOnly, setAvailableOnly] = useState(false)

  const sortedFiltered = useMemo(() => {
    let list = filtered

    if (availableOnly) {
      list = list.filter(p => p.in_stock)
    }

    if (sortOrder === 'asc') {
      list = [...list].sort((a, b) => a.precio - b.precio)
    } else if (sortOrder === 'desc') {
      list = [...list].sort((a, b) => b.precio - a.precio)
    }

    return list
  }, [filtered, sortOrder, availableOnly])

  return (
    <>
      {/* ===== SEARCH ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* MOBILE EXPERIENCE PASS: text-[16px] prevents iOS zoom on focus */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-full text-[16px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400 shadow-sm transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ===== FILTROS RÁPIDOS ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'none' : 'asc')}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
              sortOrder === 'asc'
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm shadow-[var(--primary)]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Menor Precio
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'none' : 'desc')}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
              sortOrder === 'desc'
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm shadow-[var(--primary)]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
            Mayor Precio
          </button>
          <button
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
              availableOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Disponible
          </button>
        </div>
      </div>

      {/* ===== CATEGORY PILLS ===== */}
      {categories.length > 0 && (
        <div ref={categoryRef} className="sticky top-0 z-20 bg-[#f8fafc]/95 backdrop-blur-xl border-b border-slate-100 mt-3">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex gap-3 overflow-x-auto py-3 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 items-center">
              {categories.map(cat => (
                <button
                  key={cat || '__all__'}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20 border-transparent border'
                      : 'bg-white text-slate-600 border border-slate-200/60 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {cat || 'Todos'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCT GRID ===== */}
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {searchQuery || selectedCategory ? 'Resultados' : 'Todos los productos'}
          </h2>
          <span className="text-xs text-slate-400">{sortedFiltered.length} producto{sortedFiltered.length !== 1 ? 's' : ''}</span>
        </div>
        {sortedFiltered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {sortedFiltered.map((p, idx) => (
              <ProductCard key={p.id} producto={p} monedaSimbolo={monedaSimbolo} giftMode={giftMode} trendingIds={trendingIds} onQuickView={onQuickView} index={idx} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-12 sm:p-16 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-600 font-semibold">Sin resultados</p>
            <p className="text-slate-400 text-sm mt-1">Intenta con otra búsqueda o categoría.</p>
          </div>
        )}
      </div>
    </>
  )
}
