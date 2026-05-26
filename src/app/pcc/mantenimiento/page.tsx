'use client'

import { useState, useCallback } from 'react'

interface AccionCard {
  id: string
  titulo: string
  descripcion: string
  icono: string
  color: string
  tipo: 'get' | 'post'
  endpoint?: string
}

const acciones: AccionCard[] = [
  { id: 'diagnostico', titulo: 'Diagnóstico', descripcion: 'Verifica conexión DB, Storage, y detecta anomalías', icono: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-indigo-600 bg-indigo-100', tipo: 'get' },
  { id: 'reparar-pedidos', titulo: 'Reparar Pedidos', descripcion: 'Elimina pedidos huérfanos y limpia detalles con productos eliminados', icono: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'text-amber-600 bg-amber-100', tipo: 'post' },
  { id: 'reparar-inventario', titulo: 'Reparar Inventario', descripcion: 'Corrige stock negativo y sincroniza in_stock', icono: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-emerald-600 bg-emerald-100', tipo: 'post' },
  { id: 'recalcular-analiticas', titulo: 'Recalcular Analíticas', descripcion: 'Recalcula ganancia neta en todos los pedidos confirmados', icono: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'text-violet-600 bg-violet-100', tipo: 'post' },
  { id: 'reparar-suscripciones', titulo: 'Reparar Suscripciones', descripcion: 'Ejecuta la automatización de suscripciones (bloqueo/suspensión)', icono: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-rose-600 bg-rose-100', tipo: 'post' },
  { id: 'reparar-storage', titulo: 'Reparar Storage', descripcion: 'Limpia referencias de imágenes vacías en productos y perfiles', icono: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'text-sky-600 bg-sky-100', tipo: 'post' },
  { id: 'logs', titulo: 'Ver Logs', descripcion: 'Muestra los últimos 50 registros de actividad del sistema', icono: 'M4 6h16M4 12h16M4 18h16', color: 'text-slate-600 bg-slate-100', tipo: 'get' },
]

export default function MantenimientoPage() {
  const [ejecutando, setEjecutando] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, any>>({})
  const [expandido, setExpandido] = useState<string | null>(null)

  const ejecutar = useCallback(async (accion: AccionCard) => {
    setEjecutando(accion.id)
    setResultados(r => ({ ...r, [accion.id]: null }))
    setExpandido(accion.id)

    try {
      if (accion.tipo === 'get') {
        const res = await fetch(`/api/pcc/mantenimiento?action=${accion.id}`)
        const json = await res.json()
        setResultados(r => ({ ...r, [accion.id]: json }))
      } else {
        const res = await fetch('/api/pcc/mantenimiento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: accion.id }),
        })
        const json = await res.json()
        setResultados(r => ({ ...r, [accion.id]: json }))
      }
    } catch {
      setResultados(r => ({ ...r, [accion.id]: { error: 'Error de conexión' } }))
    }
    setEjecutando(null)
  }, [])

  const renderResultado = (id: string, data: any) => {
    if (!data) return null
    if (data.error) {
      return <p className="text-xs text-rose-600 font-medium mt-2">Error: {data.error}</p>
    }

    if (id === 'diagnostico' && data.results) {
      return (
        <div className="mt-3 space-y-1.5">
          {data.results.map((r: any, i: number) => {
            const colores: Record<string, string> = {
              ok: 'text-emerald-700 bg-emerald-50 border-emerald-200',
              error: 'text-rose-700 bg-rose-50 border-rose-200',
              advertencia: 'text-amber-700 bg-amber-50 border-amber-200',
            }
            return (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${colores[r.estado] || colores.advertencia}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.estado === 'ok' ? 'bg-emerald-500' : r.estado === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <span className="font-semibold shrink-0">{r.prueba}:</span>
                <span>{r.detalle}</span>
              </div>
            )
          })}
        </div>
      )
    }

    if (id === 'logs' && data.data) {
      return (
        <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
          {(data.data as any[]).length === 0 ? (
            <p className="text-xs text-slate-400">Sin registros</p>
          ) : (
            data.data.slice(0, 20).map((log: any) => (
              <div key={log.id} className="flex items-start gap-2 text-[11px] px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 shrink-0">{new Date(log.created_at).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-semibold text-slate-700 shrink-0">{log.modulo}</span>
                <span className="text-slate-600">—</span>
                <span className="text-slate-500 truncate">{log.accion}{log.detalle ? `: ${log.detalle}` : ''}</span>
              </div>
            ))
          )}
        </div>
      )
    }

    if (data.ok && data.operaciones) {
      return (
        <div className="mt-3 space-y-1">
          {data.operaciones.map((op: string, i: number) => (
            <p key={i} className="text-xs text-slate-600 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">{op}</p>
          ))}
        </div>
      )
    }

    if (data.ok && data.procesadas !== undefined) {
      return (
        <p className="text-xs text-emerald-600 font-medium mt-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          {data.procesadas} tienda(s) procesada(s)
        </p>
      )
    }

    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Mantenimiento</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Herramientas de diagnóstico y reparación del sistema</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {acciones.map((accion, idx) => {
          const estaEjecutando = ejecutando === accion.id
          const estaExpandido = expandido === accion.id
          const resultado = resultados[accion.id]

          return (
            <div key={accion.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up overflow-hidden"
              style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accion.color.split(' ').slice(1).join(' ')}`}>
                    <svg className={`w-5 h-5 ${accion.color.split(' ')[0]}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={accion.icono} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900">{accion.titulo}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{accion.descripcion}</p>
                  </div>
                </div>

                <button onClick={() => ejecutar(accion)} disabled={estaEjecutando}
                  className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 border border-slate-200 hover:bg-slate-50 text-slate-700">
                  {estaEjecutando ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Ejecutando...
                    </span>
                  ) : 'Ejecutar'}
                </button>
              </div>

              {estaExpandido && resultado && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-3">
                  {renderResultado(accion.id, resultado)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
