'use client'

import { useState, useMemo } from 'react'
import { formatearPrecio } from '@/lib/utils'
import { calcularPrecioConImpuesto } from '@/lib/precios'
import type { TallaVariant } from '@/types/database'

interface ProductoConTallas {
  id: string
  nombre: string
  precio: number
  precio_oferta: number | null
  tallas?: (string | TallaVariant)[]
  tipo_articulo?: string | null
  aplica_impuesto?: boolean | null
  porcentaje_impuesto?: number | null
}

interface Props {
  producto: ProductoConTallas
  monedaSimbolo?: string
  onConfirm: (talla: string, precioVariant: number | null) => void
  onClose: () => void
}

export default function ModalSeleccionarTalla({ producto, monedaSimbolo = 'RD$', onConfirm, onClose }: Props) {
  const [seleccionada, setSeleccionada] = useState('')

  const esCalzado = producto.tipo_articulo === 'calzado'
  const label = esCalzado ? 'Número' : 'Talla'

  const variants = useMemo(() => {
    const raw = producto.tallas || []
    return raw.map(t => {
      if (typeof t === 'string') return { talla: t, stock: 999, precio: null }
      return { talla: t.talla, stock: t.stock, precio: t.precio }
    })
  }, [producto.tallas])

  const selectedVariant = useMemo(
    () => variants.find(v => v.talla === seleccionada) || null,
    [variants, seleccionada]
  )

  const precioBase = producto.precio_oferta ?? producto.precio
  const precioMostrar = selectedVariant?.precio ?? precioBase
  const tienePrecioEspecial = selectedVariant?.precio != null && selectedVariant.precio !== precioBase
  const tieneImpuesto = (producto.aplica_impuesto ?? false) && (producto.porcentaje_impuesto ?? 0) > 0
  const mostrarConImpuesto = (precio: number) => {
    if (!tieneImpuesto) return { mostrar: precio, impuesto: 0 }
    const r = calcularPrecioConImpuesto(precio, true, producto.porcentaje_impuesto!)
    return { mostrar: r.total, impuesto: r.impuesto }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl elevation-3 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Seleccionar {label}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-2">{producto.nombre}</p>

        {selectedVariant && (
          <div className="flex items-baseline gap-1.5 mb-4">
            <span className="text-2xl font-bold text-[var(--primary)]">
              {monedaSimbolo}{formatearPrecio(mostrarConImpuesto(precioMostrar).mostrar)}
            </span>
            {tienePrecioEspecial && (
              <span className="text-sm text-slate-400 line-through">
                {monedaSimbolo}{formatearPrecio(mostrarConImpuesto(precioBase).mostrar)}
              </span>
            )}
            {tieneImpuesto && <span className="text-xs font-medium text-slate-400">Impuestos incl.</span>}
          </div>
        )}

        {variants.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4 mb-4">Este producto no tiene tallas disponibles</p>
        ) : (
        <div className="flex flex-wrap gap-2 mb-6">
          {variants.map(v => {
            const agotado = v.stock <= 0
            const seleccion = seleccionada === v.talla
            return (
              <div key={v.talla} className="relative">
                <button
                  onClick={() => !agotado && setSeleccionada(v.talla)}
                  disabled={agotado}
                   className={`px-4 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                     seleccion
                       ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md'
                       : agotado
                         ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                         : 'bg-white text-slate-600 border-slate-200 hover:border-[var(--primary)]/40 hover:text-[var(--primary)]'
                   }`}
                >
                  {esCalzado ? `#${v.talla}` : v.talla}
                </button>
                {agotado && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-slate-300 whitespace-nowrap">
                    Agotado
                  </span>
                )}
              </div>
            )
          })}
        </div>
        )}

        <button
          onClick={() => seleccionada && onConfirm(seleccionada, selectedVariant?.precio ?? null)}
          disabled={!seleccionada || variants.length === 0}
          className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {seleccionada
            ? `Confirmar y Añadir (${label}: ${seleccionada})`
            : `Selecciona un${esCalzado ? ' número' : 'a talla'}`}
        </button>
      </div>
    </div>
  )
}