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

  useEffect(() => {
    setPedidos(initialPedidos)
  }, [initialPedidos])

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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-100">
        <h2 className="text-base font-bold text-slate-900 mb-3">Lista de Pedidos</h2>
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
              className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-slate-50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="flex-1 min-w-0 text-sm text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-slate-50"
              title="Desde"
            />
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="flex-1 min-w-0 text-sm text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-slate-50"
              title="Hasta"
            />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="flex-1 min-w-0 text-sm text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-slate-50"
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

      {pedidosFiltrados.length > 0 ? (
        <div>
          {pedidosFiltrados.map(pedido => (
            <PedidoRow key={pedido.id} pedido={pedido} />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500">
          {pedidos.length === 0
            ? 'No hay pedidos todavía. ¡Comparte tu catálogo para recibir pedidos!'
            : 'No hay pedidos que coincidan con los filtros.'}
        </div>
      )}
    </div>
  )
}