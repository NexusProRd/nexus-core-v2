'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
}

interface ActividadItem {
  type: 'pedido' | 'regalo' | 'producto'
  label: string
  desc: string
  time: string
  icon: string
  color: string
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

export default function DashboardClient({ tiendaId, nombreTienda, whatsappNumero, userEmail, catalogoUrl, tiendaSlug, tiendaAbierta, tokensDisponibles, fechaVencimiento, tipoNegocio = 'estandar', tallasStockBajo = [], initialStats }: DashboardClientProps) {
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

  useEffect(() => {
    refrescarTodo()
  }, [refrescarTodo])

  const cardClass = 'bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] shadow-lg shadow-black/[0.02] dark:shadow-black/20 rounded-2xl'
  const cardInnerClass = 'bg-white/50 dark:bg-white/[0.03] rounded-xl border border-white/30 dark:border-white/[0.06]'

  // SMART HOME DASHBOARD - synthetic activity feed
  const actividadItems = useMemo<ActividadItem[]>(() => {
    const items: ActividadItem[] = []

    const now = new Date()

    if (stats.ultimosPedidos.length > 0) {
      stats.ultimosPedidos.slice(0, 3).forEach(p => {
        const timeAgo = Math.floor((now.getTime() - new Date(p.creado_at).getTime()) / 60000)
        const timeStr = timeAgo < 1 ? 'Ahora' : timeAgo < 60 ? `Hace ${timeAgo} min` : `Hace ${Math.floor(timeAgo / 60)}h`
        items.push({
          type: 'pedido',
          label: p.cliente_nombre,
          desc: `RD$${formatearPrecio(p.total)} — ${p.estado}`,
          time: timeStr,
          icon: 'cart',
          color: p.estado === 'pendiente' ? 'amber' : p.estado === 'confirmado' ? 'emerald' : 'slate',
        })
      })
    }

    if (items.length === 0) {
      return items
    }

    if (stats.regalosPendientes > 0) {
      items.push({
        type: 'regalo',
        label: 'Regalo canjeado',
        desc: `${stats.regalosPendientes} regalo(s) pendiente(s) de aprobación`,
        time: 'Hoy',
        icon: 'gift',
        color: 'pink',
      })
    }

    items.push({
      type: 'producto',
      label: 'Catálogo activo',
      desc: `${stats.stockBajo.length > 0 ? `${stats.stockBajo.length} producto(s) requieren atención` : 'Todos los productos en orden'}`,
      time: 'Activo',
      icon: 'box',
      color: 'indigo',
    })

    return items
  }, [stats.ultimosPedidos, stats.regalosPendientes, stats.stockBajo.length])

  return (
    <div className="max-w-full overflow-x-hidden px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-5">

      {/* SMART HOME DASHBOARD — UX EVOLUTION */}

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

      {/* ===== ALERTS ===== */}
      {tokensDisponibles === 0 && fechaVencimiento && (
        <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-lg border border-amber-200/60 dark:border-amber-800 rounded-2xl px-4 sm:px-5 py-3.5 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">💡</span>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            Periodo de Prueba Activo: Te quedan <strong className="font-extrabold">{diasRestantes(fechaVencimiento)}</strong> días de servicio gratuito. Recuerda recargar tokens en el panel de soporte para evitar la suspensión de tu catálogo en la calle.
          </p>
        </div>
      )}

      {tipoNegocio === 'ropa' && tallasStockBajo.length > 0 && (
        <div className="bg-rose-50/80 dark:bg-rose-900/20 backdrop-blur-lg border border-rose-200/60 dark:border-rose-800 rounded-2xl px-4 sm:px-5 py-3.5 flex items-start gap-3">
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

      {/* ===== SUSCRIPCIÓN ===== */}
      <div className={`${cardClass} p-4 sm:p-5 ${
        fechaVencimiento && diasRestantes(fechaVencimiento) <= 3 && tokensDisponibles <= 0
          ? 'border-amber-200/60 dark:border-amber-800'
          : ''
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1.5">
            {tokensDisponibles > 0 && (
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>🪙</span>
                {tokensDisponibles} token(s) — {tokensDisponibles} mes(es) de servicio
              </p>
            )}
            {fechaVencimiento ? (
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                🗓️ Vence el <span className="font-semibold text-slate-700 dark:text-slate-300">{formatearFecha(fechaVencimiento)}</span>
                {tokensDisponibles <= 0 && ` (${diasRestantes(fechaVencimiento)} día(s))`}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">Sin fecha de vencimiento registrada</p>
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

      {/* ===== RESUMEN RÁPIDO ===== */}
      {/* UX EVOLUTION */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-6 rounded-full bg-[var(--primary)]/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Resumen Rápido</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 rounded-2xl p-5 sm:p-7 text-white shadow-lg shadow-[var(--primary)]/10">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Ventas de Hoy</p>
            <p className={`text-2xl sm:text-3xl font-bold text-white mt-1 ${isLoading ? 'animate-pulse' : ''}`}>
              {isLoading ? 'RD$0' : `RD$${formatearPrecio(metricas.ingresosHoy)}`}
            </p>
            <div className="flex gap-4 mt-3 text-sm text-white/70 flex-wrap items-center">
              <span>{stats.pendientes} pendiente(s)</span>
              <span>{metricas.pedidosHoyCount} pedido(s) hoy</span>
              {stats.regalosPendientes > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {stats.regalosPendientes} regalo(s) pendiente(s)
                </span>
              )}
            </div>
          </div>

          <div className="bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{metricas.pedidosHoyCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pedidos Hoy</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stats.stockBajo.length > 0 ? 'bg-amber-100/80 dark:bg-amber-900/30' : 'bg-slate-100/80 dark:bg-slate-800/50'}`}>
                <svg className={`w-4 h-4 ${stats.stockBajo.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.stockBajo.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Productos Bajo Stock</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ACCIONES RÁPIDAS ===== */}
      {/* UX EVOLUTION */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-6 rounded-full bg-sky-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Acciones Rápidas</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/dashboard/inventario"
            className="group bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 hover:bg-white/80 dark:hover:bg-[#121216]/70"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Agregar Producto</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Nuevo producto al catálogo</p>
          </Link>

          <Link href="/dashboard/vitrina"
            className="group bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 hover:bg-white/80 dark:hover:bg-[#121216]/70"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100/80 dark:bg-violet-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Abrir Vitrina</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Diseña tu tienda online</p>
          </Link>

          <Link href="/dashboard/whatsapp"
            className="group bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 hover:bg-white/80 dark:hover:bg-[#121216]/70"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">WhatsApp</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Mensajes automáticos</p>
          </Link>

          <Link href="/dashboard/pedidos"
            className="group bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 hover:bg-white/80 dark:hover:bg-[#121216]/70"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Ver Pedidos</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stats.pendientes} pendientes</p>
          </Link>
        </div>
      </section>

      {/* ===== ACTIVIDAD RECIENTE + ESTADO DEL NEGOCIO ===== */}
      {/* UX EVOLUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-6 rounded-full bg-emerald-400/60" />
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Actividad Reciente</h2>
            </div>
            <div className={`${cardClass} p-4 sm:p-5`}>
              {actividadItems.length > 0 ? (
                <div className="space-y-2">
                  {actividadItems.map((item, i) => {
                    const colorMap: Record<string, string> = {
                      amber: 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                      emerald: 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                      slate: 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400',
                      pink: 'bg-pink-100/80 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
                      indigo: 'bg-indigo-100/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                    }
                    return (
                      <div key={i} className={`flex items-center justify-between ${cardInnerClass} px-3.5 py-2.5 ${item.type === 'pedido' ? '' : 'opacity-80'}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[item.color] || colorMap.slate}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {item.icon === 'cart' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />}
                              {item.icon === 'gift' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
                              {item.icon === 'box' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.label}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0 ml-3 font-medium">{item.time}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No hay actividad reciente</p>
              )}
            </div>
          </section>
        </div>

        <div>
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-6 rounded-full bg-blue-400/60" />
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Estado del Negocio</h2>
            </div>
            <div className="space-y-2">
              <div className={`${cardClass} p-3.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${tiendaAbierta ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Tienda</span>
                  </div>
                  <span className={`text-xs font-bold ${tiendaAbierta ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {tiendaAbierta ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>
              </div>

              <div className={`${cardClass} p-3.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${whatsappNumero ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-amber-400'}`} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">WhatsApp</span>
                  </div>
                  <span className={`text-xs font-bold ${whatsappNumero ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {whatsappNumero ? 'Configurado' : 'Sin configurar'}
                  </span>
                </div>
              </div>

              <div className={`${cardClass} p-3.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${stats.stockBajo.length === 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : stats.stockBajo.length <= 3 ? 'bg-amber-400' : 'bg-rose-500'}`} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Stock</span>
                  </div>
                  <span className={`text-xs font-bold ${stats.stockBajo.length === 0 ? 'text-emerald-600 dark:text-emerald-400' : stats.stockBajo.length <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {stats.stockBajo.length === 0 ? 'En orden' : `${stats.stockBajo.length} bajo`}
                  </span>
                </div>
              </div>

              <div className={`${cardClass} p-3.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Recovery</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Protegido</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ===== VITRINA — DESTACADO ===== */}
      {/* UX EVOLUTION */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/70 via-violet-800/50 to-purple-700/30 dark:from-indigo-950/90 dark:via-violet-900/60 dark:to-purple-800/40 border border-white/[0.08] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-violet-400" />
            <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">Vitrina</h2>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-xl">
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Dale vida a tu tienda online
              </h3>
              <p className="text-sm text-white/70 mt-2 leading-relaxed">
                Crea una vitrina profesional con catálogo, horarios y enlace directo para compartir con tus clientes. Personaliza colores, banner, y más.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Link href="/dashboard/vitrina"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-900 font-bold text-sm rounded-xl hover:bg-white/90 transition-all shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v4m8-4v4M4 10h16" /></svg>
                  Ir a Vitrina Studio
                </Link>
                <Link href={publicUrl} target="_blank"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white/80 font-medium text-sm rounded-xl hover:bg-white/20 transition-all border border-white/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Vista previa
                </Link>
              </div>
            </div>

            <div className="shrink-0 w-full lg:w-48 h-32 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-2 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
                </div>
                <p className="text-[10px] text-white/50 font-medium">Catálogo Digital</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RECOMENDACIONES NEXUS ===== */}
      {/* UX EVOLUTION */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-6 rounded-full bg-amber-400/60" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Recomendaciones Nexus</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Productos sin imagen</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Agrega fotos a tus productos para que se vean profesionales en el catálogo.</p>
                <Link href="/dashboard/inventario" className="inline-block mt-2 text-xs font-bold text-[var(--primary)] hover:underline">Ir a Productos →</Link>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100/80 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4m8-4v4M4 10h16" /></svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Vitrina Incompleta</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Personaliza tu vitrina con colores, logo y horarios para darle más presencia a tu negocio.</p>
                <Link href="/dashboard/vitrina" className="inline-block mt-2 text-xs font-bold text-[var(--primary)] hover:underline">Ir a Vitrina →</Link>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-[#121216]/60 backdrop-blur-lg border border-white/30 dark:border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stats.stockBajo.length > 0 ? 'bg-amber-100/80 dark:bg-amber-900/30' : 'bg-emerald-100/80 dark:bg-emerald-900/30'}`}>
                <svg className={`w-4.5 h-4.5 ${stats.stockBajo.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {stats.stockBajo.length > 0 ? 'Productos con Stock Bajo' : 'Stock en Buen Estado'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {stats.stockBajo.length > 0
                    ? `${stats.stockBajo.length} producto(s) están por agotarse. Revisa tu inventario.`
                    : 'Todos tus productos tienen stock suficiente.'}
                </p>
                <Link href="/dashboard/inventario" className="inline-block mt-2 text-xs font-bold text-[var(--primary)] hover:underline">Ir a Inventario →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ENLACE DE VENTAS ===== */}
      <div className={`${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div className="min-w-0 flex-1 w-full">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Tu enlace de ventas</h3>
            <div className={cardInnerClass}>
              <code className="block px-3 py-2 text-xs text-slate-600 dark:text-slate-300 break-all font-mono">{publicUrl}</code>
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

      {/* ===== STOCK BAJO + ACCIONES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <div className={`${cardClass} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Stock Bajo</h3>
            </div>
            {stats.stockBajo.length > 0 ? (
              <div className="space-y-1.5">
                {stats.stockBajo.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300 truncate">{p.nombre}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2 shrink-0">{p.stock} uds</span>
                  </div>
                ))}
                {stats.stockBajo.length > 4 && (
                  <Link href="/dashboard/inventario" className="block text-xs text-[var(--primary)] font-medium mt-1">Ver todos ({stats.stockBajo.length})</Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Todo en stock suficiente</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {(!permisos || permisos.productos) && <QuickAddProduct tiendaId={tiendaId} />}
          <QrButton url={publicUrl} />
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
