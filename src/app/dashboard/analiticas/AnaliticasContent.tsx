'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import AutoRefresh from './AutoRefresh'
import ReporteTallas from './ReporteTallas'
import type { TallaVariant } from '@/types/database'

interface Pedido {
  id: string
  cliente_nombre: string
  total: number
  ganancia_neta: number
  estado: string
  creado_at: string
  items?: any
}

interface AnaliticasContentProps {
  pedidosIniciales: Pedido[]
  tiendaId: string
  tipoNegocio: string
  productosConTallas: { nombre: string; stock: number; tallas: (string | TallaVariant)[]; tipo_articulo: string | null }[]
  dataGrafico: { name: string; ventas: number; ganancias: number }[]
}

export default function AnaliticasContent({ pedidosIniciales, tiendaId, tipoNegocio, productosConTallas, dataGrafico }: AnaliticasContentProps) {
  const pedidos = pedidosIniciales
  const isLoading = false
  const [tipoGrafico, setTipoGrafico] = useState<'ventas' | 'ganancias'>('ventas')

  const metrics = useMemo(() => {
    const hoy = new Date()
    const hoyISO = hoy.toISOString().split('T')[0]
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

    const estadosValidos = ['confirmado', 'entregado']
    const pedidosHoy = pedidos.filter(p => {
      if (!p.creado_at) return false
      const fStr = new Date(p.creado_at).toISOString().split('T')[0]
      return fStr === hoyISO && estadosValidos.includes(p.estado)
    })

    const pedidosValidosMes = pedidos.filter(p => {
      if (!p.creado_at) return false
      const fDate = new Date(p.creado_at)
      return fDate >= inicioMes && estadosValidos.includes(p.estado)
    })

    let ingresos = 0
    let ganancias = 0
    pedidosValidosMes.forEach(p => {
      ingresos += Number(p.total || 0)
      const items = p.items || []
      items.forEach((item: any) => {
        const qty = Number(item.cantidad || item.quantity || 1)
        const precio = Number(item.precio || 0)
        const costoUnit = Number(item.costo || item.costo_unidad || 0)
        ganancias += (precio - costoUnit) * qty
      })
    })

    const pedidosTerminales = pedidos.filter(p => {
      if (!p.creado_at) return false
      return new Date(p.creado_at) >= inicioMes && ['entregado', 'rechazado', 'cancelado', 'devuelto'].includes(p.estado)
    })
    const entregados = pedidosTerminales.filter(p => p.estado === 'entregado').length
    const devueltos = pedidosTerminales.filter(p => p.estado === 'devuelto').length
    const noEntregados = pedidosTerminales.filter(p => p.estado === 'rechazado' || p.estado === 'cancelado').length
    const eficienciaPct = pedidosTerminales.length > 0 ? (entregados / pedidosTerminales.length) * 100 : 0
    const devueltosPct = pedidosTerminales.length > 0 ? (devueltos / pedidosTerminales.length) * 100 : 0

    const hoyIngresos = pedidosHoy.reduce((s, p) => s + Number(p.total || 0), 0)
    const confirmados = pedidos.filter(p => p.estado === 'confirmado')
    const prom = confirmados.length > 0 ? confirmados.reduce((s, p) => s + Number(p.total || 0), 0) / confirmados.length : 0

    return {
      totalIngresos: ingresos,
      totalGanancias: ganancias,
      eficiencia: eficienciaPct,
      devueltosPct,
      noEntregados,
      devueltos,
      ventasHoy: hoyIngresos,
      pedidosHoyCount: pedidosHoy.length,
      ticketPromedio: prom,
      pedidosPendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    }
  }, [pedidos])

  const { totalIngresos, totalGanancias, eficiencia, devueltosPct, noEntregados, devueltos, ventasHoy, pedidosHoyCount, ticketPromedio, pedidosPendientes } = metrics
  const maxValor = Math.max(...dataGrafico.map(d => tipoGrafico === 'ventas' ? d.ventas : d.ganancias), 1)
  const hayDatos = dataGrafico.some(d => (tipoGrafico === 'ventas' ? d.ventas : d.ganancias) > 0)

  return (
    <>
      <AutoRefresh tiendaId={tiendaId} />
      <div className="min-h-screen">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="text-[var(--primary)] hover:underline text-sm font-medium">← Volver al Dashboard</Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">Analíticas</h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
          <div className="space-y-4 sm:space-y-6">

            {/* Gráfico + Eficiencia lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Ventas</h3>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                      {(['ventas', 'ganancias'] as const).map(t => (
                        <button key={t} onClick={() => setTipoGrafico(t)}
                          className={`px-3 py-1 text-xs sm:text-sm rounded-md font-medium transition-colors ${tipoGrafico === t ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          {t === 'ventas' ? 'Ventas' : 'Ganancias'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2 h-40">
                    {!hayDatos ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-slate-400 text-sm">Sin pedidos en este período</p>
                      </div>
                    ) : dataGrafico.map((d, i) => {
                      const valor = tipoGrafico === 'ventas' ? d.ventas : d.ganancias
                      const altura = Math.max((valor / maxValor) * 100, valor > 0 ? 8 : 0)
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                          <span className="text-[10px] sm:text-xs font-bold text-[var(--primary)] mb-1 leading-tight text-center">
                            {valor > 0 ? `RD$${valor.toLocaleString('es-DO')}` : ''}
                          </span>
                          <div className="w-full bg-[var(--primary)] rounded-t-md transition-all"
                            style={{ height: `${altura}%`, minHeight: valor > 0 ? '4px' : '0' }} />
                          <span className="text-[10px] sm:text-xs text-slate-500 mt-2">{d.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col items-center">
                <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 sm:mb-4">Eficiencia</h3>
                <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full relative ${isLoading ? 'animate-pulse' : ''}`}
                  style={{ background: eficiencia > 0
                    ? `conic-gradient(#22c55e 0% ${eficiencia}%, #fbbf24 ${eficiencia}% ${eficiencia + devueltosPct}%, #ef4444 ${eficiencia + devueltosPct}% 100%)`
                    : devueltosPct > 0
                    ? `conic-gradient(#fbbf24 0% ${devueltosPct}%, #ef4444 ${devueltosPct}% 100%)`
                    : '#e5e7eb' }}>
                  <div className="absolute inset-[6px] sm:inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-2xl font-bold text-slate-900">{Math.round(eficiencia)}%</span>
                    <span className="text-[10px] sm:text-xs text-slate-500">eficiencia</span>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-5 mt-3 sm:mt-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-slate-600">{pedidos.filter(p => p.estado === 'entregado').length} ok</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-slate-600">{pedidos.filter(p => p.estado === 'rechazado' || p.estado === 'cancelado').length} no</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-slate-600">{pedidos.filter(p => p.estado === 'devuelto').length} devueltos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200 p-4 min-h-[110px] flex flex-col justify-between">
                <p className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wide">Ventas de Hoy</p>
                <p className={`text-xl font-bold text-emerald-700 ${isLoading ? 'animate-pulse' : ''}`}>RD${formatearPrecio(ventasHoy)}</p>
                <p className="text-[10px] text-emerald-600">{pedidosHoyCount} pedido(s) hoy</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[110px] flex flex-col justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Ticket Promedio</p>
                <p className="text-xl font-bold text-slate-900">RD${formatearPrecio(Math.round(ticketPromedio))}</p>
                <p className="text-[10px] text-slate-400">{pedidos.filter(p => p.estado === 'confirmado').length} pedido(s)</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[110px] flex flex-col justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Ingresos del Mes</p>
                <p className="text-xl font-bold text-[var(--primary)]">RD${formatearPrecio(totalIngresos)}</p>
                <p className="text-[10px] text-slate-400">Total facturado</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[110px] flex flex-col justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Ganancia Real</p>
                <p className="text-xl font-bold text-[var(--primary)]">RD${formatearPrecio(Math.round(totalGanancias))}</p>
                <p className="text-[10px] text-slate-400">Neto después de costos</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[110px] flex flex-col justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Pedidos Pendientes</p>
                <p className="text-xl font-bold text-amber-600">{pedidosPendientes}</p>
                <p className="text-[10px] text-slate-400">Por revisar</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[110px] flex flex-col justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Oportunidad</p>
                <p className="text-xl font-bold text-rose-600">RD${formatearPrecio(eficiencia > 0 ? Math.round(totalIngresos * (1 - eficiencia / 100)) : 0)}</p>
                <p className="text-[10px] text-slate-400">En pedidos perdidos</p>
              </div>
            </div>

            {/* Reporte de Tallas y Calzado (ropa only) */}
            {tipoNegocio === 'ropa' && productosConTallas.length > 0 && (
              <ReporteTallas productos={productosConTallas} />
            )}

          </div>
        </main>
      </div>
    </>
  )
}
