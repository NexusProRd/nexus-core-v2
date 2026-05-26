'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Suscripcion {
  id: string
  nombre: string
  plan: string
  tokens: number
  limite: number
  activa: boolean
  creada: string
  vence: string | null
  diasRestantes: number | null
  vencida: boolean
}

export default function SuscripcionesPage() {
  const [items, setItems] = useState<Suscripcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/pcc/suscripciones')
      if (res.ok) {
        const j = await res.json()
        setItems(j.data || [])
      }
    } catch {}
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = items.filter(i =>
    !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const activas = items.filter(i => i.activa).length
  const vencidas = items.filter(i => i.vencida).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Suscripciones</h1>
            <p className="text-sm text-gray-500 mt-1">Estado de suscripciones de todas las tiendas</p>
          </div>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
            placeholder="Buscar tienda..." />
        </header>

        <div className="flex gap-4 text-sm text-gray-500">
          <span><strong className="text-emerald-600">{activas}</strong> activas</span>
          <span className="text-gray-300">·</span>
          <span><strong className="text-rose-600">{vencidas}</strong> vencidas</span>
          <span className="text-gray-300">·</span>
          <span><strong>{items.length}</strong> total</span>
        </div>

        {cargando ? (
          <div className="py-20 text-center text-sm text-gray-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white/80 rounded-2xl p-12 text-center border border-slate-200/60 shadow-sm">
            <p className="text-sm text-gray-500">No se encontraron tiendas</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white/80 rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tienda</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tokens</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Vence</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrados.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm font-medium text-slate-900 whitespace-nowrap">{s.nombre}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          s.plan === 'ilimitado' ? 'bg-violet-50 text-violet-700 border border-violet-200'
                          : s.plan === 'pro' ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>{s.plan}</span>
                      </td>
                      <td className="p-3 text-center text-sm text-slate-700 whitespace-nowrap">{s.tokens}/{s.limite}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {s.vencida ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">Vencida</span>
                        ) : s.activa ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Activa</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200">Inactiva</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-slate-600 text-right whitespace-nowrap">
                        {s.vence ? new Date(s.vence).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {s.diasRestantes !== null ? (
                          <span className={`text-sm font-bold ${s.diasRestantes <= 0 ? 'text-rose-600' : s.diasRestantes <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {s.diasRestantes <= 0 ? 'Vencido' : `${s.diasRestantes}d`}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden space-y-3">
              {filtrados.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-bold text-slate-900">{s.nombre}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      s.plan === 'ilimitado' ? 'bg-violet-50 text-violet-700 border border-violet-200'
                      : s.plan === 'pro' ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>{s.plan}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Tokens: {s.tokens}/{s.limite}</span>
                    <span>·</span>
                    {s.vencida ? (
                      <span className="text-rose-600 font-semibold">Vencida</span>
                    ) : s.activa ? (
                      <span className="text-emerald-600 font-semibold">Activa</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Inactiva</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{s.vence ? new Date(s.vence).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha'}</span>
                    {s.diasRestantes !== null && (
                      <span className={`font-bold ${s.diasRestantes <= 0 ? 'text-rose-600' : s.diasRestantes <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {s.diasRestantes <= 0 ? 'Vencido' : `${s.diasRestantes} días`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
