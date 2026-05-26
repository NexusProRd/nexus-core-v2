'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import CopiarEnlace from './CopiarEnlace'
import { recalcularDashboard } from './actions'
import QuickAddProduct from './QuickAddProduct'
import StoreToggle from './StoreToggle'
import QrButton from './QrButton'
import { usePermisos } from '@/context/PermisosContext'
import TicketButton from './TicketButton'
import { formatearPrecio } from '@/lib/utils'

interface Pedido {
  id: string
  cliente_nombre: string
  total: number
  estado: string
  creado_at: string
}

interface InitialStats {
  ventasHoy: number
  pendientes: number
  pedidosHoy: number
  regalosPendientes: number
  stockBajo: { nombre: string; stock: number; id: string }[]
  ultimosPedidos: Pedido[]
}

interface DashboardClientProps {
  tiendaId: string
  nombreTienda: string
  userEmail?: string
  catalogoUrl: string
  tiendaSlug?: string | null
  tiendaAbierta: boolean
  tokensDisponibles: number
  fechaVencimiento: string | null
  tipoNegocio?: string
  tallasStockBajo?: { producto: string; tallas: string[] }[]
  initialStats: InitialStats
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

export default function DashboardClient({ tiendaId, nombreTienda, userEmail, catalogoUrl, tiendaSlug, tiendaAbierta, tokensDisponibles, fechaVencimiento, tipoNegocio = 'estandar', tallasStockBajo = [], initialStats }: DashboardClientProps) {
  const { permisos } = usePermisos()
  const [stats, setStats] = useState(initialStats)
  const [isLoading, setIsLoading] = useState(false)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [whatsappSoporte, setWhatsappSoporte] = useState('18299999999')
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => {
    fetch('/api/config/whatsapp-soporte').then(r => r.json()).then(d => { if (d.numero) setWhatsappSoporte(d.numero) }).catch(() => {})
  }, [])
  const publicUrl = tiendaSlug ? `${origin}/c/${tiendaSlug}` : catalogoUrl
  const [metricas, setMetricas] = useState({
    ingresosHoy: initialStats.ventasHoy,
    gananciasHoy: 0,
    pedidosHoyCount: initialStats.pedidosHoy,
    ingresosMes: 0,
    gananciasMes: 0,
    margenMes: 0,
  })

  const recalcular = useCallback((pedidosFiltrados: any[]) => {
    setIsLoading(true)
    try {
      const hoy = new Date()
      const hoyISO = hoy.toISOString().split('T')[0]
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

      const estadosValidos = ['confirmado', 'entregado']
      const pedidosHoy = pedidosFiltrados.filter(p => {
        if (!p.creado_at) return false
        const fechaStr = new Date(p.creado_at).toISOString().split('T')[0]
        return fechaStr === hoyISO && estadosValidos.includes(p.estado)
      })

      const pedidosMes = pedidosFiltrados.filter(p => {
        if (!p.creado_at) return false
        const fechaPedido = new Date(p.creado_at)
        return fechaPedido >= inicioMes && estadosValidos.includes(p.estado)
      })

      let ingresosHoy = 0
      let gananciasHoy = 0

      pedidosHoy.forEach(p => {
        ingresosHoy += Number(p.total || 0)
        const detalles = p.detalles_pedido || []
        const arr = Array.isArray(detalles) ? detalles : [detalles]
        arr.forEach((item: any) => {
          const qty = Number(item.cantidad || 1)
          const precio = Number(item.precio_unitario || item.precio || 0)
          const costo = Number(item.costo || item.costo_unidad || 0)
          gananciasHoy += (precio - costo) * qty
        })
      })

      let ingresosMes = 0
      let gananciasMes = 0

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

      setMetricas({
        ingresosHoy,
        gananciasHoy,
        pedidosHoyCount: pedidosHoy.length,
        ingresosMes,
        gananciasMes,
        margenMes,
      })
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
    setStats(result as typeof stats)
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

    return () => { supabase.removeChannel(canal) }
  }, [tiendaId, refrescarTodo])

  // Inicializa metricas al montar
  useEffect(() => {
    refrescarTodo()
  }, [refrescarTodo])

  return (
    <div className="max-w-full overflow-x-hidden px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{nombreTienda}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{userEmail}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <StoreToggle tiendaId={tiendaId} abierta={tiendaAbierta} />
        </div>
      </div>

      {tokensDisponibles === 0 && fechaVencimiento && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 sm:px-5 py-3.5 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">💡</span>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            Periodo de Prueba Activo: Te quedan <strong className="font-extrabold">{diasRestantes(fechaVencimiento)}</strong> días de servicio gratuito. Recuerda recargar tokens en el panel de soporte para evitar la suspensión de tu catálogo en la calle.
          </p>
        </div>
      )}

      {tipoNegocio === 'ropa' && tallasStockBajo.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl px-4 sm:px-5 py-3.5 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-800 dark:text-rose-200 leading-relaxed">
              Alerta: Tienes <strong className="font-extrabold">{tallasStockBajo.length}</strong> producto(s) con tallas con stock bajo (menos de 5 uds por talla).
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
              {tallasStockBajo.slice(0, 3).map((item, i) => (
                <span key={i} className="text-xs text-rose-700 font-medium">
                  {item.producto}: {item.tallas.join(', ')}
                </span>
              ))}
              {tallasStockBajo.length > 3 && (
                <span className="text-xs text-rose-500">y {tallasStockBajo.length - 3} más</span>
              )}
            </div>
            <Link href="/dashboard/analiticas" className="inline-block mt-2 text-xs font-bold text-rose-700 hover:text-rose-800 underline underline-offset-2">
              Ver Reporte Completo →
            </Link>
          </div>
        </div>
      )}

      {/* Suscripción - siempre primero */}
      <div className={`rounded-2xl p-4 sm:p-5 border ${
        fechaVencimiento && diasRestantes(fechaVencimiento) <= 3 && tokensDisponibles <= 0
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1.5">
            {tokensDisponibles > 0 && (
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span>🪙</span>
                {tokensDisponibles} token(s) — {tokensDisponibles} mes(es) de servicio
              </p>
            )}
            {fechaVencimiento ? (
              <p className={`text-xs sm:text-sm font-medium ${tokensDisponibles > 0 ? 'text-slate-500' : 'text-slate-500'}`}>
                🗓️ Vence el <span className="font-semibold text-slate-700">{formatearFecha(fechaVencimiento)}</span>
                {tokensDisponibles <= 0 && ` (${diasRestantes(fechaVencimiento)} día(s))`}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-400">Sin fecha de vencimiento registrada</p>
            )}
          </div>
          {fechaVencimiento && diasRestantes(fechaVencimiento) <= 3 && tokensDisponibles <= 0 && (
            <a
              href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent('¡Hola Nexus! Mi plan está por vencer y quiero renovar para seguir operando mi catálogo digital.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Renovar plan por WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="md:col-span-2 lg:col-span-2 bg-[var(--primary)] rounded-2xl p-5 sm:p-7 text-white shadow-sm">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Ventas de Hoy</p>
          <p className={`text-xl sm:text-2xl font-bold text-white mt-1 whitespace-nowrap overflow-hidden text-ellipsis ${isLoading ? 'animate-pulse' : ''}`}>
            {isLoading ? 'RD$0' : `RD$${formatearPrecio(metricas.ingresosHoy)}`}
          </p>
          <div className="flex gap-4 mt-3 text-sm text-white/70 flex-wrap items-center">
            <span>{stats.pendientes} pendiente(s)</span>
            <span>{metricas.pedidosHoyCount} pedido(s) hoy</span>
            {stats.regalosPendientes > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {stats.regalosPendientes} regalo(s) pendiente(s) de pago
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {(!permisos || permisos.productos) && <QuickAddProduct tiendaId={tiendaId} />}
          <QrButton url={publicUrl} />
        </div>

        <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="min-w-0 flex-1 w-full">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Tu enlace de ventas</h3>
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <code className="text-xs text-slate-600 dark:text-slate-300 break-all font-mono">{publicUrl}</code>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:brightness-110 transition-all shadow-sm border border-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Ver catálogo
              </a>
              <CopiarEnlace url={publicUrl} />
            </div>
          </div>
        </div>

        <Link href="/dashboard/pedidos" className="bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/5 flex items-center justify-center mb-2.5">
            <svg className="w-4.5 h-4.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Pedidos</h3>
          <p className="text-xs text-slate-400 mt-0.5">{stats.pendientes} pendientes</p>
        </Link>

        <Link href="/dashboard/inventario" className="bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/5 flex items-center justify-center mb-2.5">
            <svg className="w-4.5 h-4.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Inventario</h3>
          <p className="text-xs text-slate-400 mt-0.5">{stats.stockBajo.length} producto(s) bajo stock</p>
        </Link>

        <Link href="/dashboard/analiticas" className="bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/5 flex items-center justify-center mb-2.5">
            <svg className="w-4.5 h-4.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Analíticas</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ventas y tendencias</p>
        </Link>

        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Última Actividad</h3>
          {stats.ultimosPedidos.length > 0 ? (
            <div className="space-y-2">
              {stats.ultimosPedidos.slice(0, 5).map(p => (
                <div key={p.id}
                  className={`flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5 transition-all duration-500 ${
                    animatingId === p.id ? 'animate-[slideIn_0.4s_ease-out] bg-[var(--primary)]/5' : ''
                  }`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.cliente_nombre}</p>
                    <p className="text-xs text-slate-400">RD${formatearPrecio(p.total)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      p.estado === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      p.estado === 'confirmado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>{p.estado}</span>
                    <TicketButton pedidoId={p.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No hay pedidos aún</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="font-semibold text-slate-900 text-sm">Stock Bajo</h3>
          </div>
          {stats.stockBajo.length > 0 ? (
            <div className="space-y-1.5">
              {stats.stockBajo.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate">{p.nombre}</span>
                  <span className="text-amber-600 font-semibold ml-2 shrink-0">{p.stock} uds</span>
                </div>
              ))}
              {stats.stockBajo.length > 4 && (
                <Link href="/dashboard/inventario" className="block text-xs text-[var(--primary)] font-medium mt-1">Ver todos ({stats.stockBajo.length})</Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Todo en stock suficiente</p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
