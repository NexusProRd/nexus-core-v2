'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Backup {
  id: string
  id_tienda: string | null
  tipo: string
  size_bytes: number
  tokens_cost: number
  created_at: string
  nombre_tienda: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [restaurando, setRestaurando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/pcc/backups')
      if (res.ok) setBackups(await res.json())
      else setError('Error al cargar backups')
    } catch { setError('Error de conexión') }
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const crearBackup = async () => {
    setCreando(true)
    setError('')
    setExito('')
    try {
      const res = await fetch('/api/pcc/backups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) {
        setExito('Backup creado exitosamente')
        cargar()
      } else {
        const j = await res.json()
        setError(j.error || 'Error al crear backup')
      }
    } catch { setError('Error de conexión') }
    setCreando(false)
  }

  const restaurar = async (id: string) => {
    if (!confirm('¿Restaurar este backup? Los datos actuales se sobrescribirán.')) return
    setRestaurando(id)
    setError('')
    setExito('')
    try {
      const res = await fetch(`/api/pcc/backups/${id}/restore`, { method: 'POST' })
      const j = await res.json()
      if (res.ok && j.restored) {
        setExito('Backup restaurado exitosamente' + (j.errors?.length ? ` (${j.errors.length} errores)` : ''))
        cargar()
      } else {
        setError(j.error || 'Error al restaurar')
      }
    } catch { setError('Error de conexión') }
    setRestaurando(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Backups Automáticos</h1>
            <p className="text-sm text-gray-500 mt-1">Crea y restaura copias de seguridad de tus tiendas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={crearBackup} disabled={creando}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
              {creando ? 'Creando...' : 'Crear Backup'}
            </button>
            <button onClick={cargar} disabled={cargando}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
              Refrescar
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm font-medium text-rose-600">{error}</div>
        )}
        {exito && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm font-medium text-emerald-600">{exito}</div>
        )}

        {cargando ? (
          <div className="py-20 text-center text-sm text-gray-400">Cargando backups...</div>
        ) : backups.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-200/60 shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">No hay backups aún</p>
            <p className="text-xs text-gray-400 mt-1">Crea tu primer backup para proteger tus datos</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tienda</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Tamaño</th>
                  <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Costo</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-900 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString('es-DO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-900 whitespace-nowrap">{b.nombre_tienda}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        b.tipo === 'automatico' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {b.tipo === 'automatico' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 text-right font-mono whitespace-nowrap">{formatBytes(b.size_bytes)}</td>
                    <td className="p-4 text-sm text-amber-600 font-bold text-center whitespace-nowrap">🪙 {b.tokens_cost}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => restaurar(b.id)} disabled={restaurando === b.id}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors">
                        {restaurando === b.id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
