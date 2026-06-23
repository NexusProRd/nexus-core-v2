'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import CopiarEnlace from './CopiarEnlace'
import { recalcularDashboard } from './actions'
import { calcularMetricasDashboard, ESTADOS_INCLUIDOS, calcularComparativo } from './dashboard-metrics'
import type { DashboardFullMetrics } from './dashboard-metrics'
import StoreToggle from './StoreToggle'
import QrButton from './QrButton'
import { usePermisos } from '@/context/PermisosContext'
import TicketButton from './TicketButton'
import { formatCurrency } from '@/lib/utils'
import PrimerosPasos from '@/components/dashboard/PrimerosPasos'
import { useDashboard } from './DashboardContext'

interface Pedido {
  id: string
  cliente_nombre: string
  total: number
  estado: string
  creado_at: string
  metodo_pago?: string | null
}

interface InitialStats {
  ventasHoy: number
  pendientes: number
  pedidosHoy: number
  regalosPendientes: number
  stockBajo: { nombre: string; stock: number; id: string }[]
  ultimosPedidos: Pedido[]
  productosActivos: number
  productosAgotados: number
  productosSinStock: { nombre: string; stock: number; id: string }[]
}

interface DashboardClientProps {
  tiendaId: string
  nombreTienda: string
  whatsappNumero?: string | null
  userEmail?: string
  catalogoUrl: string
  tiendaSlug?: string | null
  tiendaAbierta: boolean
  tokensDisponibles: number
  fechaVencimiento: string | null
  tipoNegocio?: string
  tallasStockBajo?: { producto: string; tallas: string[] }[]
  initialStats: InitialStats
  metricasCompletas: DashboardFullMetrics
  checklist?: Record<string, boolean>
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function diasRestantes(fecha: string): number {
  const fin = new Date(fecha)
  const ahora = new Date()
  const diff = fin.getTime() - ahora.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function Indicador({ actual, anterior }: { actual: number; anterior: number }) {
  const cmp = calcularComparativo(actual, anterior)
  if (cmp.direccion === 'equal') {
    return <span className="text-xs text-slate-400">—</span>
  }
  return (
    <span className={`text-xs font-bold flex items-center gap-0.5 ${cmp.direccion === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {cmp.direccion === 'up' ? '▲' : '▼'}
      {Math.abs(cmp.variacion).toFixed(1)}%
    </span>
  )
}

export default function DashboardClient({ tiendaId, nombreTienda, whatsappNumero, userEmail, catalogoUrl, tiendaSlug, tiendaAbierta, tokensDisponibles, fechaVencimiento, tipoNegocio = 'estandar', tallasStockBajo = [], initialStats, metricasCompletas: initialMetricasCompletas, checklist }: DashboardClientProps) {
  const { permisos } = usePermisos()
  const [stats, setStats] = useState(initialStats)
  const [metricasFull, setMetricasFull] = useState(initialMetricasCompletas)
  const [isLoading, setIsLoading] = useState(false)
  const [chartRange, setChartRange] = useState<7 | 30 | 90>(30)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [whatsappSoporte, setWhatsappSoporte] = useState('18299999999')
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => {
    fetch('/api/config/whatsapp-soporte').then(r => r.json()).then(d => { if (d.numero) setWhatsappSoporte(d.numero) }).catch(() => {})
  }, [])
  const { currencyCode } = useDashboard()

  const publicUrl = tiendaSlug ? `${origin}/c/${tiendaSlug}` : catalogoUrl

  const recalcular = useCallback((pedidosFiltrados: any[]) => {
    setIsLoading(true)
    try {
      const metricasHoy = calcularMetricasDashboard(pedidosFiltrados)
      const hoy = new Date()
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

      const pedidosMes = pedidosFiltrados.filter(p => {
        if (!p.creado_at) return false
        return p.creado_at >= inicioMes && ESTADOS_INCLUIDOS.includes(p.estado)
      })

      let gananciasHoy = 0
      let gananciasMes = 0
      let ingresosMes = 0

      metricasHoy.pedidosHoy.forEach(p => {
        const detalles = p.detalles_pedido || []
        const arr = Array.isArray(detalles) ? detalles : [detalles]
        arr.forEach((item: any) => {
          const qty = Number(item.cantidad || 1)
          const precio = Number(item.precio_unitario || item.precio || 0)
          const costo = Number(item.costo || item.costo_unidad || 0)
          gananciasHoy += (precio - costo) * qty
        })
      })

      pedidosMes.forEach(p => {
        ingresosMes += Number(p.total || 0)
        const detalles = p.detalles_pedido || []
        const arr = Array.isArray(detalles) ? detalles : [detalles]
        arr.forEach((item: any) => {
          const qty = Number(item.cantidad || 1)
          const precio = Number(item.precio_unitario || item.precio || 0)
          const costo = Number(item.costo || item.costo_unidad || 0)
          gananciasMes += (precio - costo) * qty
        })
      })

      const margenMes = ingresosMes > 0 ? (gananciasMes / ingresosMes) * 100 : 0
    } catch (error) {
      console.error('Error crítico en analíticas:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refrescarTodo = useCallback(async () => {
    const result = await recalcularDashboard(tiendaId)
    if (!result || 'error' in result) return
    recalcular((result as any).pedidos || [])
    setStats(prev => ({
      ...prev,
      ...result,
      productosActivos: prev.productosActivos,
      productosAgotados: prev.productosAgotados,
      productosSinStock: prev.productosSinStock,
    }))
    if ((result as any).metricasCompletas) {
      setMetricasFull((result as any).metricasCompletas)
    }
  }, [tiendaId, recalcular])

  useEffect(() => {
    const supabase = createClient()

    const canal = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `id_tienda=eq.${tiendaId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAnimatingId((payload.new as Pedido).id)
          setTimeout(() => setAnimatingId(null), 800)
        }
        refrescarTodo()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_experiences', filter: `store_id=eq.${tiendaId}` }, () => refrescarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos', filter: `id_tienda=eq.${tiendaId}` }, () => refrescarTodo())
      .subscribe()

    const pollInterval = setInterval(refrescarTodo, 30000)

    return () => {
      supabase.removeChannel(canal)
      clearInterval(pollInterval)
    }
  }, [tiendaId, refrescarTodo])

  useEffect(() => {
    refrescarTodo()
  }, [refrescarTodo])

  const chartData = useMemo(() => {
    const dias = chartRange
    return metricasFull.ventasHistoricas.slice(-dias)
  }, [metricasFull.ventasHistoricas, chartRange])

  const STATUSDOT = (on: boolean) =>
    <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-rose-500'} ${on ? 'shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} />

  return (
    <div className="max-w-full overflow-x-hidden px-3 sm:px-5 py-4 sm:py-6 space-y-5 sm:space-y-6">

      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{nombreTienda}</h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">{userEmail}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <StoreToggle tiendaId={tiendaId} abierta={tiendaAbierta} />
        </div>
      </div>

      {/* ===== SUBSCRIPTION ALERT ===== */}
      {fechaVencimiento && diasRestantes(fechaVencimiento) <= 7 && tokensDisponibles <= 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-lg border border-amber-200/60 dark:border-amber-800 rounded-2xl px-4 sm:px-5 py-3.5 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">💡</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              Periodo de Prueba Activo: Te quedan <strong className="font-extrabold">{diasRestantes(fechaVencimiento)}</strong> días de servicio gratuito.
            </p>
            <a href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent('¡Hola Nexus! Quiero renovar mi plan.')}`} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-bold text-amber-700 hover:text-amber-800 underline underline-offset-2">
              Renovar plan por WhatsApp →
            </a>
          </div>
        </div>
      )}

      {/* ===== CHECKLIST PRIMEROS PASOS ===== */}
      {checklist && <PrimerosPasos tiendaId={tiendaId} checklist={checklist} />}

      {/* ===== TU CATÁLOGO ESTÁ ONLINE ===== */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-teal-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg">Tu tienda ya está online</h3>
            <p className="text-teal-100 text-sm mt-1">
              {stats.productosActivos > 0
                ? 'Comparte este enlace para que tus clientes vean tu catálogo y te pidan por WhatsApp.'
                : 'Agrega productos para que tus clientes puedan ver tu tienda y hacer pedidos.'}
            </p>
            <code className="block text-white/90 text-xs font-mono mt-3 bg-white/10 px-3 py-2 rounded-lg break-all">
              {publicUrl}
            </code>
            <div className="flex gap-2 mt-3">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-white text-teal-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Ver mi tienda
              </a>
              <CopiarEnlace url={publicUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECCIÓN 1: VENTAS HISTÓRICAS (CHART) ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-blue-400/60" />
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Ventas Históricas</h2>
          </div>
          <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {([7, 30, 90] as const).map(d => (
              <button key={d} onClick={() => setChartRange(d)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  chartRange === d
                    ? 'bg-white dark:bg-slate-700 text-[var(--primary)] dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {d} días
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700/50" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-slate-400 dark:text-slate-500"
                  tickFormatter={(v: string) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
                  }}
                  interval={chartRange === 7 ? 0 : chartRange === 30 ? 4 : 13}
                />
                <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} className="text-slate-400 dark:text-slate-500" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload
                    const d = label ? new Date(String(label) + 'T00:00:00') : null
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          {d ? d.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' }) : label}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          Ventas: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(Number(data.ventas) || 0, currencyCode)}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          Pedidos: <span className="font-bold text-slate-900 dark:text-white">{data.pedidos}</span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="ventas" fill="var(--primary, #8b5cf6)" radius={[3, 3, 0, 0]} maxBarSize={chartRange === 7 ? 32 : chartRange === 30 ? 16 : 8} />
                <Bar dataKey="ventas" fill="var(--primary, #8b5cf6)" radius={[3, 3, 0, 0]} maxBarSize={chartRange === 7 ? 32 : chartRange === 30 ? 16 : 8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-slate-400">Sin datos de ventas en este período</div>
          )}
        </div>
      </section>

      {/* ===== SECCIÓN 2: KPIs ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-[var(--primary)]/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Indicadores Clave</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Hoy</p>
            <p className={`text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 ${isLoading ? 'animate-pulse' : ''}`}>
              {formatCurrency(metricasFull.ventasHoy, currencyCode)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Mes</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(metricasFull.ventasMes, currencyCode)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos Hoy</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">{metricasFull.pedidosHoy}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos Mes</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">{metricasFull.pedidosMes}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticket Promedio</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(metricasFull.ticketPromedio, currencyCode)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mejor Producto</p>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 truncate" title={metricasFull.mejorProducto?.nombre || '—'}>
              {metricasFull.mejorProducto?.nombre || '—'}
            </p>
            {metricasFull.mejorProducto && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {metricasFull.mejorProducto.cantidad} vendidos
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== GANANCIAS (solo si hay datos de costo confiables) ===== */}
      {metricasFull.tieneCostos && (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-emerald-500/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Ganancias</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ganancia Hoy</p>
            <p className={`text-lg sm:text-xl font-bold mt-1.5 ${metricasFull.gananciaHoy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(metricasFull.gananciaHoy, currencyCode)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ganancia Mes</p>
            <p className={`text-lg sm:text-xl font-bold mt-1.5 ${metricasFull.gananciaMes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(metricasFull.gananciaMes, currencyCode)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margen Promedio</p>
            <p className={`text-lg sm:text-xl font-bold mt-1.5 ${metricasFull.margenPromedio >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {metricasFull.margenPromedio.toFixed(1)}%
            </p>
          </div>
        </div>
      </section>
      )}

      {/* ===== SECCIÓN 3: ACCIONES RÁPIDAS ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-sky-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Acciones Rápidas</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/dashboard/inventario"
            className="group bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Nuevo Producto</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Agregar al catálogo</p>
          </Link>
          <Link href="/dashboard/pedidos"
            className="group bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-100/80 dark:bg-amber-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Ver Pedidos</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{stats.pendientes} pendiente{stats.pendientes !== 1 ? 's' : ''}</p>
          </Link>
          <Link href="/dashboard/vitrina"
            className="group bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-violet-100/80 dark:bg-violet-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Abrir Vitrina</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Diseñar tienda online</p>
          </Link>
          <Link href="/dashboard/whatsapp"
            className="group bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">WhatsApp</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Mensajes automáticos</p>
          </Link>
        </div>
      </section>

      {/* ===== SECCIÓN 4: COMPARATIVAS ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-emerald-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Comparativas</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Hoy vs Ayer</p>
            <div className="flex items-baseline justify-between mt-1.5">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(metricasFull.ventasHoy, currencyCode)}</p>
              <Indicador actual={metricasFull.ventasHoy} anterior={metricasFull.ventasAyer} />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ayer: {formatCurrency(metricasFull.ventasAyer, currencyCode)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos Hoy vs Ayer</p>
            <div className="flex items-baseline justify-between mt-1.5">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{metricasFull.pedidosHoy}</p>
              <Indicador actual={metricasFull.pedidosHoy} anterior={metricasFull.pedidosAyer} />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ayer: {metricasFull.pedidosAyer}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Semana</p>
            <div className="flex items-baseline justify-between mt-1.5">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(metricasFull.ventasSemanaActual, currencyCode)}</p>
              <Indicador actual={metricasFull.ventasSemanaActual} anterior={metricasFull.ventasSemanaAnterior} />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Semana anterior: {formatCurrency(metricasFull.ventasSemanaAnterior, currencyCode)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos Semana</p>
            <div className="flex items-baseline justify-between mt-1.5">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{metricasFull.pedidosSemanaActual}</p>
              <Indicador actual={metricasFull.pedidosSemanaActual} anterior={metricasFull.pedidosSemanaAnterior} />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Semana anterior: {metricasFull.pedidosSemanaAnterior}</p>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 5: TOP 5 PRODUCTOS ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-amber-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Top 5 Productos</h2>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {metricasFull.topProductos.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {metricasFull.topProductos.map((prod, idx) => (
                <div key={prod.nombre} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      idx === 1 ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                      idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                      'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{prod.nombre}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{prod.cantidad} vendido{prod.cantidad !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(prod.ingreso, currencyCode)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sin ventas todavía</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Los productos más vendidos aparecerán aquí</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== SECCIÓN 6: SALUD DEL NEGOCIO ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-violet-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Salud del Negocio</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${metricasFull.productosAgotados > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Agotados</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Productos sin stock</p>
              </div>
            </div>
            <span className={`text-xs font-bold ${metricasFull.productosAgotados > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {metricasFull.productosAgotados}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${metricasFull.stockCritico > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Stock Crítico</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Menos de 5 unidades</p>
              </div>
            </div>
            <span className={`text-xs font-bold ${metricasFull.stockCritico > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {metricasFull.stockCritico}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${metricasFull.pedidosPendientes > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Pendientes</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Pedidos por atender</p>
              </div>
            </div>
            <span className={`text-xs font-bold ${metricasFull.pedidosPendientes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {metricasFull.pedidosPendientes}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              {STATUSDOT(metricasFull.whatsappConfigurado)}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">WhatsApp</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Automatización</p>
              </div>
            </div>
            <span className={`text-xs font-bold ${metricasFull.whatsappConfigurado ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {metricasFull.whatsappConfigurado ? 'Configurado' : 'Sin configurar'}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              {STATUSDOT(metricasFull.vitrinaConfigurada)}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Vitrina</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Modal promocional</p>
              </div>
            </div>
            <span className={`text-xs font-bold ${metricasFull.vitrinaConfigurada ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {metricasFull.vitrinaConfigurada ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
        {metricasFull.stockCritico > 0 && (
          <Link href="/dashboard/inventario" className="inline-block mt-3 text-xs font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2">
            Revisar inventario →
          </Link>
        )}
      </section>

      {/* ===== SECCIÓN 7: ACTIVIDAD RECIENTE ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-emerald-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Actividad Reciente</h2>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {stats.ultimosPedidos.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {stats.ultimosPedidos.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.cliente_nombre}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(p.creado_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(p.total, currencyCode)}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      p.estado === 'pendiente' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                      p.estado === 'confirmado' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                      p.estado === 'en_proceso' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                      p.estado === 'en_camino' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                      'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {p.estado === 'pendiente' ? 'Pendiente' :
                       p.estado === 'confirmado' ? 'Confirmado' :
                       p.estado === 'en_proceso' ? 'Preparando' :
                       p.estado === 'en_camino' ? 'En Camino' :
                       p.estado === 'entregado' ? 'Entregado' : p.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay pedidos todavía</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Cuando recibas tu primer pedido aparecerá aquí</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== SECCIÓN 8: ALERTAS ===== */}
      {stats.productosSinStock.length > 0 && (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded-full bg-rose-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Alertas</h2>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-400">Productos sin stock</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.productosSinStock.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/50">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" /></svg>
                {p.nombre}
              </span>
            ))}
          </div>
          <Link href="/dashboard/inventario" className="inline-block mt-3 text-xs font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2">
            Ir a Inventario →
          </Link>
        </div>
      </section>
      )}

    </div>
  )
}
