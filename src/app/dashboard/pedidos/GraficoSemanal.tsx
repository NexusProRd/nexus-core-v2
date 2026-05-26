'use client'

import { useState, useMemo } from 'react'

interface Pedido {
  id: string
  total: number
  estado: string
  creado_at: string
  ganancia_neta?: number
  ganancia_calculada?: number
}

export default function GraficoSemanal({ pedidos }: { pedidos: Pedido[] }) {
  const [vista, setVista] = useState<'semana' | 'mes' | 'año'>('semana')
  const [tipo, setTipo] = useState<'ventas' | 'ganancias'>('ventas')

  const datos = useMemo(() => {
    const hoy = new Date()
    const valor = (p: Pedido) => tipo === 'ganancias' 
      ? (p.ganancia_calculada || p.ganancia_neta || (p.estado === 'confirmado' ? p.total * 0.4 : 0))
      : p.total

    if (vista === 'semana') {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const r: { label: string; total: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
        const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
        r.push({ label: dias[d.getDay()], total: pedidos.filter(p => p.estado === 'confirmado' && p.creado_at >= ini && p.creado_at < fin).reduce((s, p) => s + valor(p), 0) })
      }
      return r
    }

    if (vista === 'mes') {
      const r: { label: string; total: number }[] = []
      let start = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      let sem = 1
      while (start <= new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59)) {
        const end = new Date(start); end.setDate(end.getDate() + 6)
        const fin = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString()
        r.push({ label: `Sem ${sem}`, total: pedidos.filter(p => p.estado === 'confirmado' && p.creado_at >= start.toISOString() && p.creado_at < fin).reduce((s, p) => s + valor(p), 0) })
        start.setDate(start.getDate() + 7); sem++
      }
      return r
    }

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const r: { label: string; total: number }[] = []
    for (let m = 0; m < 12; m++) {
      const ini = new Date(hoy.getFullYear(), m, 1).toISOString()
      const fin = new Date(hoy.getFullYear(), m + 1, 0, 23, 59, 59).toISOString()
      r.push({ label: meses[m], total: pedidos.filter(p => p.estado === 'confirmado' && p.creado_at >= ini && p.creado_at <= fin).reduce((s, p) => s + valor(p), 0) })
    }
    return r
  }, [pedidos, vista, tipo])

  const maxValor = Math.max(...datos.map(d => d.total), 1)
  const hayDatos = pedidos.some(p => p.estado === 'confirmado')

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Ventas</h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['ventas', 'ganancias'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md font-medium transition-colors ${tipo === t ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'ventas' ? 'Ventas' : 'Ganancias'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['semana', 'mes', 'año'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md font-medium transition-colors ${vista === v ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {v === 'semana' ? 'Semana' : v === 'mes' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 h-40">
        {!hayDatos ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-slate-400 text-sm">Sin pedidos confirmados en este período</p>
          </div>
        ) : datos.map((d, i) => {
          const altura = Math.max((d.total / maxValor) * 100, d.total > 0 ? 8 : 0)
          return (
            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary)] mb-1 leading-tight text-center">
                {d.total > 0 ? `RD$${d.total.toLocaleString('es-DO')}` : ''}
              </span>
              <div className="w-full bg-gradient-to-t bg-[var(--primary)] rounded-t-md transition-all"
                style={{ height: `${altura}%`, minHeight: d.total > 0 ? '4px' : '0' }} />
              <span className="text-[10px] sm:text-xs text-slate-500 mt-2">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}