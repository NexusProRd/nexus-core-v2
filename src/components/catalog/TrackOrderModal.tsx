'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  id_tienda: string
}

export default function TrackOrderModal({ open, onClose, id_tienda }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    order_id: string
    estado: string
    cliente_nombre: string
    total: number
    creado_at: string
  } | null>(null)
  const [error, setError] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  if (!open) return null

  const handleTrack = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    const supabase = createClient()
    const q = query.trim().toUpperCase()

    const { data: raw } = await supabase
      .rpc('track_pedido', { p_id_tienda: id_tienda, p_query: q })
      .maybeSingle()
    const data = raw as { order_id: string; estado: string; cliente_nombre: string; total: number; creado_at: string } | undefined

    if (data) {
      setResult({
        order_id: data.order_id,
        estado: data.estado,
        cliente_nombre: data.cliente_nombre,
        total: data.total,
        creado_at: data.creado_at,
      })
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        const { data: freshRaw } = await supabase
          .rpc('track_pedido', { p_id_tienda: id_tienda, p_query: data.order_id })
          .maybeSingle()
        const fresh = freshRaw as typeof data | undefined
        if (fresh && fresh.estado !== data.estado) {
          setResult(prev => prev ? { ...prev, estado: fresh.estado } : prev)
        }
      }, 6000)
    } else {
      setError('No encontramos ningún pedido con ese número.')
    }
    setLoading(false)
  }

  const estadoColor = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'text-amber-600 bg-amber-50 border-amber-200',
      en_proceso: 'text-blue-600 bg-blue-50 border-blue-200',
      en_camino: 'text-purple-600 bg-purple-50 border-purple-200',
      entregado: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      confirmado: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      rechazado: 'text-rose-600 bg-rose-50 border-rose-200',
    }
    return map[estado] || 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const estadoLabel = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'Recibido',
      en_proceso: 'En Preparación',
      en_camino: 'En Camino',
      entregado: 'Entregado',
      confirmado: 'Confirmado',
      rechazado: 'Rechazado',
    }
    return map[estado] || estado
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl rounded-b-none sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Rastrear pedido</h3>
        <p className="text-xs text-slate-500 text-center mb-5">Ingresa tu número de pedido</p>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTrack()}
            placeholder="Ej: 3B1B06F8"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-slate-400"
          />
          <button
            onClick={handleTrack}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:brightness-110 transition-all disabled:opacity-50 text-sm shadow-sm"
          >
            {loading ? '...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-600 mt-3 text-center">{error}</p>
        )}

        {result && (
          <div className="mt-4 bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Pedido</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{result.order_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Cliente</span>
              <span className="text-sm font-medium text-slate-900">{result.cliente_nombre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Total</span>
              <span className="text-sm font-bold text-emerald-600">RD${result.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Estado</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${estadoColor(result.estado)}`}>
                {estadoLabel(result.estado)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Fecha</span>
              <span className="text-xs text-slate-600">{new Date(result.creado_at).toLocaleDateString('es-DO')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
