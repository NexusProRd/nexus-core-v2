'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface LogEntry {
  id: string
  id_tienda: string | null
  modulo: string
  accion: string
  detalle: string | null
  created_at: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [modulos, setModulos] = useState<string[]>([])
  const [filtroModulo, setFiltroModulo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtroModulo) params.set('modulo', filtroModulo)
      params.set('page', String(pagina))
      const res = await fetch(`/api/pcc/logs?${params}`)
      if (res.ok) {
        const j = await res.json()
        setLogs(j.data)
        setTotal(j.count)
        if (j.modulos) setModulos(j.modulos)
      }
    } catch {}
    setCargando(false)
  }, [filtroModulo, pagina])

  useEffect(() => { cargar() }, [cargar])

  const paginas = Math.ceil(total / 50)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Logs Globales</h1>
            <p className="text-sm text-gray-500 mt-1">Registro de actividad del sistema ({total} entradas)</p>
          </div>
          <div className="flex gap-2">
            <select value={filtroModulo} onChange={e => { setFiltroModulo(e.target.value); setPagina(1) }}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Todos los módulos</option>
              {modulos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={cargar} disabled={cargando}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all">
              Refrescar
            </button>
          </div>
        </header>

        {cargando ? (
          <div className="py-20 text-center text-sm text-gray-400">Cargando logs...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white/80 rounded-2xl p-12 text-center border border-slate-200/60 shadow-sm">
            <p className="text-sm text-gray-500">No hay logs para mostrar</p>
          </div>
        ) : (
          <>
            <div className="bg-white/80 rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Módulo</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString('es-DO', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {log.modulo}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-800 font-medium whitespace-nowrap">{log.accion}</td>
                      <td className="p-3 text-xs text-slate-500 max-w-xs truncate">{log.detalle || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginas > 1 && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                  ← Anterior
                </button>
                <span className="text-slate-500">Pág. {pagina} de {paginas}</span>
                <button onClick={() => setPagina(p => Math.min(paginas, p + 1))} disabled={pagina >= paginas}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
