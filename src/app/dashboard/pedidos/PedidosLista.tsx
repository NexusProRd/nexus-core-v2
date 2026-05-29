'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import PedidoRow from './PedidoRow'

interface Pedido {
  id: string
  order_id?: string
  cliente_nombre: string
  cliente_telefono?: string | null
  total: number
  estado: string
  creado_at: string
  detalles_pedido: any
  is_gift?: boolean
  id_tienda?: string
  notas?: string | null
}

const STAT_LABELS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Recibidos', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  en_proceso: { label: 'Preparando', cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  en_camino: { label: 'En Camino', cls: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  entregado: { label: 'Entregados', cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
}

const STATUS_MAP: Record<string, string> = {
  en_proceso: 'confirmado',
  en_camino: 'en_camino',
  entregado: 'entregado',
}

const DEFAULT_MSGS: Record<string, string> = {
  confirmado: '¡Hola {cliente}! 🎉 Tu pedido {pedido} ha sido confirmado. En breve comenzaremos a prepararlo.',
  en_camino: '¡Hola {cliente}! 🚴‍♂️ Tu pedido {pedido} va en camino. Pronto lo recibirás.',
  entregado: '¡Hola {cliente}! ✅ Tu pedido {pedido} ha sido entregado. ¡Gracias por confiar en {tienda}! 🙌',
}

export function reemplazarVars(texto: string, datos: {
  cliente: string; pedido: string; tienda: string;
  detalles: string; total: string; fecha: string;
}): string {
  return texto
    .replace(/{cliente}/g, datos.cliente)
    .replace(/{pedido}/g, datos.pedido)
    .replace(/{tienda}/g, datos.tienda)
    .replace(/{detalles}/g, datos.detalles)
    .replace(/{productos}/g, datos.detalles)
    .replace(/{total}/g, datos.total)
    .replace(/{fecha}/g, datos.fecha)
}

export function generarMensaje(
  plantillas: Record<string, string>,
  templateKey: string,
  defaultMsg: string,
  vars: Parameters<typeof reemplazarVars>[1]
): string {
  const raw = plantillas[templateKey] || defaultMsg
  return reemplazarVars(raw, vars)
}

export default function PedidosLista({
  pedidos: initialPedidos,
  tiendaId,
}: {
  pedidos: Pedido[]
  tiendaId: string
}) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos)
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [plantillas, setPlantillas] = useState<Record<string, string>>({})
  const [tiendaNombre, setTiendaNombre] = useState('')

  useEffect(() => {
    setPedidos(initialPedidos)
  }, [initialPedidos])

  useEffect(() => {
    if (!tiendaId) { console.log('[WHATSAPP_TEMPLATES] tiendaId vacío, abortando'); return }
    console.log('[WHATSAPP_TEMPLATES] tiendaId:', tiendaId)
    const supabase = createClient()
    supabase.from('whatsapp_templates')
      .select('confirmado, preparando, en_camino, entregado')
      .eq('store_id', tiendaId)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log('[WHATSAPP_TEMPLATES] data:', data)
        console.log('[WHATSAPP_TEMPLATES] error:', error)
        console.log('[WHATSAPP_TEMPLATES] registros encontrados:', data ? 1 : 0)
        if (error) {
          console.error('[WHATSAPP_TEMPLATES]', error)
          return
        }
        if (data) {
          const cargadas = {
            confirmado: data.confirmado || '',
            preparando: data.preparando || '',
            en_camino: data.en_camino || '',
            entregado: data.entregado || '',
          }
          setPlantillas(cargadas)
          console.log('[WHATSAPP_TEMPLATES] plantillas cargadas:', cargadas)
        } else {
          console.log('[WHATSAPP_TEMPLATES] consulta sin filas — plantillas queda como {}')
        }
      })
    supabase.from('tiendas').select('nombre_tienda').eq('id', tiendaId).single()
      .then(({ data }) => {
        if (data) setTiendaNombre(data.nombre_tienda || '')
      })
  }, [tiendaId])

  useEffect(() => {
    if (!tiendaId) return
    const supabase = createClient()
    const canal = supabase
      .channel(`pedidos-lista-${tiendaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `id_tienda=eq.${tiendaId}` },
        (payload) => {
          const nuevo = payload.new as Pedido
          setPedidos(prev => {
            if (prev.some(p => p.id === nuevo.id)) return prev
            return [nuevo, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id_tienda=eq.${tiendaId}` },
        (payload) => {
          const actualizado = payload.new as Pedido
          setPedidos(prev => prev.map(p => p.id === actualizado.id ? actualizado : p))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [tiendaId])

  const pedidosFiltrados = useMemo(() => {
    const busqueda = filtroBusqueda.toLowerCase().trim()
    return pedidos.filter(p => {
      const coincideBusqueda = !busqueda ||
        p.cliente_nombre.toLowerCase().includes(busqueda) ||
        p.id.toLowerCase().includes(busqueda) ||
        p.id.slice(0, 8).toLowerCase() === busqueda ||
        String(Math.round(p.total)).includes(busqueda)

      const coincideEstado = filtroEstado === 'todos' || p.estado === filtroEstado

      const fechaPedido = p.creado_at.slice(0, 10)
      const desdeOk = !fechaDesde || fechaPedido >= fechaDesde
      const hastaOk = !fechaHasta || fechaPedido <= fechaHasta

      return coincideBusqueda && coincideEstado && desdeOk && hastaOk
    })
  }, [pedidos, filtroBusqueda, filtroEstado, fechaDesde, fechaHasta])

  // ORDERS UX PASS: Compute stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of pedidos) {
      counts[p.estado] = (counts[p.estado] || 0) + 1
    }
    return Object.entries(STAT_LABELS).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      count: counts[key] || 0,
      cls: cfg.cls,
    }))
  }, [pedidos])

  return (
    <div className="bg-white dark:bg-slate-800/40 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* ORDERS UX PASS: Stats summary bar */}
      {stats.some(s => s.count > 0) && (
        <div className="px-4 sm:px-5 pt-4 pb-0 flex flex-wrap gap-1.5">
          {stats.map(s => s.count > 0 && (
            <span key={s.key} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>
              {s.count} {s.label}
            </span>
          ))}
        </div>
      )}

      {/* ORDERS UX PASS: Filters header */}
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Lista de Pedidos</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">{pedidos.length} total</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, ID o monto..."
              value={filtroBusqueda}
              onChange={e => setFiltroBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800/60"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800/60"
              title="Desde"
            />
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800/60"
              title="Hasta"
            />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800/60"
            >
              <option value="todos" className="text-slate-700">Todos</option>
              <option value="pendiente" className="text-slate-700">Recibidos</option>
              <option value="en_proceso" className="text-slate-700">En Preparación</option>
              <option value="en_camino" className="text-slate-700">En Camino</option>
              <option value="entregado" className="text-slate-700">Entregados</option>
              <option value="confirmado" className="text-slate-700">Confirmados</option>
              <option value="rechazado" className="text-slate-700">Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* ORDERS UX PASS: Enhanced empty state */}
      {pedidosFiltrados.length > 0 ? (
        <div>
          {pedidosFiltrados.map(pedido => (
            <PedidoRow key={pedido.id} pedido={pedido} plantillas={plantillas} tiendaNombre={tiendaNombre} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 sm:py-20 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shadow-inner">
            {pedidos.length === 0 ? (
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            ) : (
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {pedidos.length === 0
                ? 'No hay pedidos todavía'
                : 'Sin resultados'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs mx-auto">
              {pedidos.length === 0
                ? 'Comparte tu catálogo con clientes para recibir tu primer pedido. Cuando llegue un pedido nuevo, aparecerá aquí automáticamente.'
                : 'Ningún pedido coincide con los filtros actuales. Intenta ajustar la búsqueda o los filtros.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
