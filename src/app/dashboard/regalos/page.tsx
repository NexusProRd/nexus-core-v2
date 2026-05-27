'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface RegaloItem {
  id: string
  store_id: string
  tipo: 'ticket' | 'regalo'
  codigo: string
  productos: string[]
  de: string
  para: string
  mensaje: string
  estado: 'activo' | 'canjeado' | 'pendiente' | 'vencido' | 'rechazado' | 'cancelado'
  cliente: string
  fecha: string
}

const estadoConfig: Record<string, { label: string; cls: string }> = {
  activo: { label: 'Activo', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  canjeado: { label: 'Canjeado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  vencido: { label: 'Vencido', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  rechazado: { label: 'Rechazado', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export default function RegalosPage() {
  const [items, setItems] = useState<RegaloItem[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/regalos')
      const json = await res.json()
      if (res.ok) {
        setItems(json.data || [])
      } else {
        console.error('[Regalos] Error:', json.error)
        setItems([])
      }
    } catch (err) {
      console.error('[Regalos] Error de red:', err)
      setItems([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const activos = items.filter(i => i.estado === 'activo').length
  const canjeados = items.filter(i => i.estado === 'canjeado').length

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Regalos y Cupones</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Historial de cupones de regalo y experiencias de regalo</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
              <span className="text-3xl">🎁</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">No hay regalos ni cupones aún</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Los cupones de regalo aparecerán aquí cuando los clientes los canjeen desde el catálogo.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition-all"
            >
              Ir al Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
              <span>{activos} activo{activos !== 1 ? 's' : ''}</span>
              <span className="text-slate-300">·</span>
              <span>{canjeados} canjeado{canjeados !== 1 ? 's' : ''}</span>
              <span className="text-slate-300">·</span>
              <span>{items.length} total</span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Productos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">De / Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const est = estadoConfig[item.estado] || estadoConfig.activo
                      return (
                        <tr key={`${item.tipo}-${item.id}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono font-bold tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">{item.codigo}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.tipo === 'ticket' ? 'bg-violet-50 text-violet-700' : 'bg-pink-50 text-pink-700'}`}>
                              {item.tipo === 'ticket' ? 'Cupón' : 'Regalo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {item.productos.length > 0 ? item.productos.map(p => `${p} x1`).join(', ') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="font-medium text-slate-900">{item.de}</span>
                            {item.estado === 'canjeado' && item.cliente !== '—' && (
                              <span className="ml-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                {item.cliente}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${est.cls}`}>{est.label}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {new Date(item.fecha).toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden space-y-3">
              {items.map(item => {
                const est = estadoConfig[item.estado] || estadoConfig.activo
                return (
                  <div key={`${item.tipo}-${item.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-mono font-bold tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">{item.codigo}</span>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ml-2 ${est.cls}`}>{est.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.tipo === 'ticket' ? 'bg-violet-50 text-violet-700' : 'bg-pink-50 text-pink-700'}`}>
                        {item.tipo === 'ticket' ? 'Cupón' : 'Regalo'}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      {item.productos.length > 0 && (
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-700">Productos:</span>{' '}
                          <span className="text-slate-700">{item.productos.map(p => `${p} x1`).join(', ')}</span>
                        </p>
                      )}
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">De:</span> {item.de}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">Para:</span> {item.para}
                        {item.estado === 'canjeado' && item.cliente !== '—' && (
                          <span className="ml-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            Canjeado por {item.cliente}
                          </span>
                        )}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400">
                      {new Date(item.fecha).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
