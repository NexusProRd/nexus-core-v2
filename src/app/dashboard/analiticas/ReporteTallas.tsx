'use client'

import { useMemo } from 'react'
import type { TallaVariant } from '@/types/database'

interface ProductoConTallas {
  nombre: string
  stock: number
  tallas: (string | TallaVariant)[]
  tipo_articulo: string | null
}

export default function ReporteTallas({ productos }: { productos: ProductoConTallas[] }) {
  // ───────────────────────────────────────────────
  // Acumulador global — barre TODOS los productos
  // con tallas (excluye accesorios: tallas vacío/null)
  // ───────────────────────────────────────────────
  const acumuladorGlobal = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of productos) {
      if (!Array.isArray(p.tallas) || p.tallas.length === 0) continue
      for (const t of p.tallas) {
        if (typeof t === 'string') continue // old format, no per-variant stock
        if (t.stock > 0) {
          map[t.talla] = (map[t.talla] || 0) + t.stock
        }
      }
    }
    return map
  }, [productos])

  const entradas = useMemo(() => {
    return Object.entries(acumuladorGlobal)
      .map(([talla, stock]) => ({ talla, stock }))
      .sort((a, b) => {
        // Sort: numbers first (numeric), then strings (alpha)
        const aNum = parseInt(a.talla)
        const bNum = parseInt(b.talla)
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
        if (!isNaN(aNum)) return -1
        if (!isNaN(bNum)) return 1
        return a.talla.localeCompare(b.talla)
      })
  }, [acumuladorGlobal])

  const maxStock = Math.max(...entradas.map(e => e.stock), 1)

  const alertas = useMemo(() => {
    return entradas.filter(e => e.stock < 3)
  }, [entradas])

  if (entradas.length === 0) return null

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-[var(--primary)] bg-[var(--primary)]/5 px-3 py-2 rounded-xl inline-block">
        Inteligencia de Inventario — Tallas
      </h3>

      {/* ─────────────────────────────────────────── */}
      {/* Distribución General de Inventario por Talla */}
      {/* ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Distribución General de Inventario por Talla
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {entradas.map(({ talla, stock }) => {
            const pct = (stock / maxStock) * 100
            const critico = stock < 3
            return (
              <div
                key={talla}
                className={`relative rounded-xl border p-3 text-center transition-all ${
                  critico
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-slate-50 border-slate-200 hover:border-[var(--primary)]/30'
                }`}
              >
                <span className="block text-lg font-bold text-slate-900">{talla}</span>
                <span className={`block text-sm font-semibold mt-1 ${critico ? 'text-rose-600' : 'text-slate-500'}`}>
                  {stock} uds
                </span>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      critico ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-slate-400 text-right mt-3">
          {productos.length} producto(s) con variantes | {entradas.length} talla(s) únicas
        </p>
      </div>

      {/* ─────────────────────────────────────────── */}
      {/* Alertas de Reabastecimiento Crítico          */}
      {/* ─────────────────────────────────────────── */}
      {alertas.length > 0 && (
        <div className="bg-rose-50/80 rounded-2xl border border-rose-200 p-4 sm:p-5">
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Alertas de Reabastecimiento Crítico
          </h4>

          <div className="space-y-2">
            {alertas.map(({ talla, stock }) => (
              <div
                key={talla}
                className="flex items-center justify-between bg-white rounded-xl border border-rose-100 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-rose-700">{talla}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Talla {talla} en estado crítico
                    </p>
                    <p className="text-xs text-rose-600 font-medium">
                      Solo {stock} unidades globales en existencia
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  ¡Reabastecer!
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}