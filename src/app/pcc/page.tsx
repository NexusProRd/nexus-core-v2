'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

interface DashboardData {
  totalTiendas: number
  activas: number
  suspendidas: number
  tiendasPorVencer: { id: string; nombre: string; vence: string }[]
  tiendasNuevasHoy: { id: string; nombre: string; creado_en: string }[]
  totalVentas: number
  mrr: number
  fallos: { id: string; tienda_id: string; accion: string; detalle: string; created_at: string }[]
  actividadReciente: { id: string; nombre: string; whatsapp: string; creado_en: string }[]
}

export default function PccPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const currencyCode = 'DOP'
  const [salud, setSalud] = useState<{ estado: string; latencia: number | null }>({ estado: 'verificando', latencia: null })

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/pcc/metrics')
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])

  const checkHealth = useCallback(async () => {
    const inicio = performance.now()
    try {
      const res = await fetch('/api/pcc/metrics')
      const latencia = Math.round(performance.now() - inicio)
      setSalud({ estado: res.ok ? 'operacional' : 'critico', latencia })
    } catch {
      setSalud({ estado: 'critico', latencia: null })
    }
  }, [])

  useEffect(() => {
    cargarDatos(); checkHealth()
    const interval = setInterval(() => { cargarDatos(); checkHealth() }, 30000)
    return () => clearInterval(interval)
  }, [cargarDatos, checkHealth])

  const KPI = ({ label, value, sub, color = 'text-gray-900', subColor = 'text-gray-400' }: { label: string; value: string | number; sub?: string; color?: string; subColor?: string }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-extrabold mt-1.5 ${color}`}>{value}</p>
      {sub && <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>}
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Centro de mando de la plataforma Nexus</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => { cargarDatos(); checkHealth() }} disabled={sincronizando}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200/80 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      </header>

      {/* Salud del Sistema */}
      <section className="animate-fade-in-up delay-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              salud.estado === 'operacional' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              <div className={`w-3 h-3 rounded-full ${salud.estado === 'operacional' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Conexión a Servidor</p>
              <p className={`text-xs font-semibold mt-0.5 ${salud.estado === 'operacional' ? 'text-emerald-600' : 'text-red-600'}`}>
                {salud.estado === 'operacional' ? 'OPERACIONAL' : salud.estado === 'critico' ? 'CRÍTICO' : 'VERIFICANDO...'}
              </p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              salud.latencia !== null && salud.latencia < 500 ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              <svg className={`w-5 h-5 ${salud.latencia !== null && salud.latencia < 500 ? 'text-emerald-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Latencia</p>
              <p className={`text-xs font-semibold mt-0.5 ${salud.latencia !== null ? 'text-slate-600' : 'text-red-600'}`}>
                {salud.latencia !== null ? `${salud.latencia} ms` : 'SIN DATOS'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Tiendas" value={data?.totalTiendas ?? '—'} sub={`${data?.activas ?? 0} activas · ${data?.suspendidas ?? 0} suspendidas`} color="text-slate-900" />
        <KPI label="Ventas Generadas" value={formatCurrency(data?.totalVentas ?? 0, currencyCode)} sub="Acumulado global" color="text-emerald-600" />
        <KPI label="Por Vencer" value={(data?.tiendasPorVencer ?? []).length} sub="Próximos 7 días" color="text-amber-600" subColor="text-amber-500" />
        <KPI label="MRR" value={formatCurrency(data?.mrr ?? 0, currencyCode)} sub="Ingreso recurrente mensual" color="text-indigo-600" />
      </section>

      {/* Tiendas por vencer list + Nueva actividad */}
      <div className="animate-fade-in-up delay-2">
        <div className="space-y-4">
          {/* Fallos recientes */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">Fallos Recientes</h3>
              {data && data.fallos.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{data.fallos.length}</span>
              )}
            </div>
            {(data?.fallos ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 p-5">Sin fallos registrados</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data!.fallos.map(f => (
                  <div key={f.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-rose-50/50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold shrink-0 mt-0.5">!</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{f.accion}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{f.detalle || 'Sin detalle'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(f.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tiendas nuevas hoy */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Tiendas Nuevas Hoy</h3>
            </div>
            {(data?.tiendasNuevasHoy ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 p-5">Sin registros hoy</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data!.tiendasNuevasHoy.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-emerald-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-bold shrink-0">
                      {t.nombre[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.nombre}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">{new Date(t.creado_en).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Actividad Reciente */}
      <section className="animate-fade-in-up delay-3">
        <h2 className="text-sm font-bold text-slate-800 mb-3">Actividad Reciente</h2>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {(data?.actividadReciente ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 p-5">Sin actividad reciente</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data!.actividadReciente.map(a => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold shrink-0">
                      {a.nombre[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.nombre}</p>
                      <p className="text-xs text-slate-400 truncate">{a.whatsapp}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 ml-3">
                    {new Date(a.creado_en).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
